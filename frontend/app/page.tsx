'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { t } from '@/lib/translations';
import { api } from '@/lib/api';
import CustomSelect from '@/components/CustomSelect';
import GroupCard from '@/components/GroupCard';
import GroupDetailModal from '@/components/GroupDetailModal';
import CreateGroupModal from '@/components/CreateGroupModal';
import { GROUP_LANGUAGE_OPTIONS, getGroupLanguageLabel } from '@/lib/group-languages';

const SERVERS = ['', 'Ogrest', 'Rubilax', 'Pandora'];
const STASIS_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);
const BAND_OPTIONS = [20, 35, 50, 65, 80, 95, 110, 125, 140, 155, 170, 185, 200, 215, 230, 245];
const DESKTOP_DOWNLOAD_URL = 'https://github.com/Shionebash/WakGroup/releases/latest/download/WakGroup-Setup.exe';

export default function HomePage() {
    const { user } = useAuth();
    const { language } = useLanguage();
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [search, setSearch] = useState('');
    const [filterServer, setFilterServer] = useState('');
    const [filterStasis, setFilterStasis] = useState<number | ''>('');
    const [filterBand, setFilterBand] = useState<number | ''>('');
    const [filterLanguage, setFilterLanguage] = useState('');

    const fetchGroups = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, any> = {};
            if (filterServer) params.server = filterServer;
            if (filterStasis) params.stasis = filterStasis;
            if (filterBand) params.min_lvl = filterBand;
            if (filterLanguage) params.language = filterLanguage;
            const res = await api.get('/groups', { params });
            setGroups(res.data);
        } finally {
            setLoading(false);
        }
    }, [filterServer, filterStasis, filterBand, filterLanguage]);

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    const filtered = search
        ? groups.filter((g) => {
            const dungeonName = g.dungeon_name || '';
            return (
                dungeonName?.toLowerCase().includes(search.toLowerCase()) ||
                g.title?.toLowerCase().includes(search.toLowerCase())
            );
        })
        : groups;

    return (
        <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
            <section className="hero-shell" style={{ marginBottom: 30 }}>
                <div className="hero-panel hero-panel-home hero-panel-single">
                    <div className="hero-copy">
                        <span className="hero-eyebrow">WakGroup</span>
                        <h1 className="title-gold hero-title">{t('home.title', language)}</h1>
                        <p className="hero-description">{t('home.subtitle', language)}</p>
                        <div className="hero-actions">
                            {user && (
                                <button className="btn btn-primary btn-large" onClick={() => setShowCreate(true)}>
                                    {t('home.createGroup', language)}
                                </button>
                            )}
                            <a
                                className="btn btn-secondary btn-large"
                                href={DESKTOP_DOWNLOAD_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {t('home.downloadMiniApp', language)}
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            <section className="filters-shell">
                <div className="filters-head">
                    <div>
                        <h2 className="filters-title">{t('common.search', language)}</h2>
                        <p className="filters-subtitle">{t('home.searchPlaceholder', language)}</p>
                    </div>
                    <span className="results-chip">{filtered.length} {t('nav.groups', language).toLowerCase()}</span>
                </div>

                <div className="filters-bar filters-grid">
                    <div className="search-bar filter-control filter-search">
                        <span className="search-icon">🔍</span>
                        <input
                            className="search-input"
                            placeholder={t('home.searchPlaceholder', language)}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <CustomSelect
                        className="filter-control"
                        value={filterServer}
                        onChange={(next) => setFilterServer(next)}
                        placeholder={t('home.allServers', language)}
                        options={SERVERS.filter(Boolean).map((s) => ({ value: s, label: s }))}
                    />

                    <CustomSelect
                        className="filter-control"
                        value={filterStasis === '' ? '' : String(filterStasis)}
                        onChange={(next) => setFilterStasis(next ? Number(next) : '')}
                        placeholder={t('home.anyStasis', language)}
                        options={STASIS_OPTIONS.map((n) => ({ value: String(n), label: `Stasis ${n}` }))}
                    />

                    <CustomSelect
                        className="filter-control"
                        value={filterBand === '' ? '' : String(filterBand)}
                        onChange={(next) => setFilterBand(next ? Number(next) : '')}
                        placeholder={t('home.allBands', language)}
                        options={BAND_OPTIONS.map((n) => ({ value: String(n), label: t('home.bandUpTo', language).replace('{level}', String(n)) }))}
                    />

                    <CustomSelect
                        className="filter-control"
                        value={filterLanguage}
                        onChange={(next) => setFilterLanguage(next)}
                        placeholder={t('home.allLanguages', language)}
                        options={GROUP_LANGUAGE_OPTIONS.map((code) => ({ value: code, label: getGroupLanguageLabel(code) }))}
                    />

                    {user && (
                        <button className="btn btn-primary filter-cta" onClick={() => setShowCreate(true)}>
                            {t('home.createGroup', language)}
                        </button>
                    )}
                </div>
            </section>

            {loading ? (
                <div className="spinner" />
            ) : filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">⚔</div>
                    <h3>{t('home.emptyTitle', language)}</h3>
                    <p>{t('home.emptyDesc', language)}</p>
                    {user && (
                        <button className="btn btn-primary btn-large" onClick={() => setShowCreate(true)} style={{ marginTop: 24 }}>
                            {t('home.emptyCta', language)}
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid-cards">
                    {filtered.map((g) => (
                        <GroupCard key={g.id} group={g} onClick={() => setSelectedGroupId(g.id)} />
                    ))}
                </div>
            )}

            {selectedGroupId && (
                <GroupDetailModal
                    groupId={selectedGroupId}
                    onClose={() => setSelectedGroupId(null)}
                    onDeleted={fetchGroups}
                />
            )}
            {showCreate && (
                <CreateGroupModal onClose={() => setShowCreate(false)} onCreated={fetchGroups} />
            )}
        </div>
    );
}
