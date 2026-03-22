'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import CustomSelect from '@/components/CustomSelect';
import PvpGroupCard from '@/components/PvpGroupCard';
import PvpGroupDetailModal from '@/components/PvpGroupDetailModal';
import CreatePvpGroupModal from '@/components/CreatePvpGroupModal';
import { useLanguage } from '@/lib/language-context';
import { t } from '@/lib/translations';

const PVP_MODES = ['1v1', '2v2', '3v3', '4v4', '5v5', '6v6'];
const BAND_OPTIONS = [20, 35, 50, 65, 80, 95, 110, 125, 140, 155, 170, 185, 200, 215, 230, 245];
const SERVERS = ['Ogrest', 'Rubilax', 'Pandora'];

export default function VspvpPage() {
    const { user } = useAuth();
    const { language } = useLanguage();
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [search, setSearch] = useState('');
    const [filterMode, setFilterMode] = useState('');
    const [filterBand, setFilterBand] = useState<number | ''>('');
    const [filterServer, setFilterServer] = useState('');

    const fetchGroups = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, any> = {};
            if (filterMode) params.pvp_mode = filterMode;
            if (filterBand) params.equipment_band = filterBand;
            if (filterServer) params.server = filterServer;
            const res = await api.get('/pvp-groups', { params });
            setGroups(res.data);
        } finally {
            setLoading(false);
        }
    }, [filterMode, filterBand, filterServer]);

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    const filtered = search
        ? groups.filter((g) => g.title?.toLowerCase().includes(search.toLowerCase()))
        : groups;

    return (
        <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
            <section className="hero-shell" style={{ marginBottom: 30 }}>
                <div className="hero-panel hero-panel-pvp hero-panel-single">
                    <div className="hero-copy">
                        <span className="hero-eyebrow">PvP Arena</span>
                        <h1 className="title-gold hero-title">{t('nav.pvp', language)}</h1>
                        <p className="hero-description">{t('pvp.subtitle', language)}</p>
                        {user && (
                            <div className="hero-actions">
                                <button className="btn btn-primary btn-large" onClick={() => setShowCreate(true)}>
                                    {t('pvp.create', language)}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="filters-shell filters-shell-pvp">
                <div className="filters-head">
                    <div>
                        <h2 className="filters-title">{t('common.search', language)}</h2>
                        <p className="filters-subtitle">{t('pvp.searchPlaceholder', language)}</p>
                    </div>
                    <span className="results-chip results-chip-pvp">{filtered.length} PvP</span>
                </div>

                <div className="filters-bar filters-grid">
                    <div className="search-bar filter-control filter-search">
                        <span className="search-icon">🔍</span>
                        <input
                            className="search-input"
                            placeholder={t('pvp.searchPlaceholder', language)}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <CustomSelect
                        className="filter-control"
                        value={filterMode}
                        onChange={(next) => setFilterMode(next)}
                        placeholder={t('pvp.anyMode', language)}
                        options={PVP_MODES.map((m) => ({ value: m, label: m }))}
                    />

                    <CustomSelect
                        className="filter-control"
                        value={filterBand === '' ? '' : String(filterBand)}
                        onChange={(next) => setFilterBand(next ? Number(next) : '')}
                        placeholder={t('pvp.allBands', language)}
                        options={BAND_OPTIONS.map((n) => ({ value: String(n), label: t('pvp.bandLevel', language).replace('{level}', String(n)) }))}
                    />

                    <CustomSelect
                        className="filter-control"
                        value={filterServer}
                        onChange={(next) => setFilterServer(next)}
                        placeholder={t('home.allServers', language)}
                        options={SERVERS.map((s) => ({ value: s, label: s }))}
                    />

                    {user && (
                        <button className="btn btn-primary filter-cta filter-cta-pvp" onClick={() => setShowCreate(true)}>
                            {t('pvp.create', language)}
                        </button>
                    )}
                </div>
            </section>

            {loading ? (
                <div className="spinner" />
            ) : filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">⚔</div>
                    <h3>{t('pvp.emptyTitle', language)}</h3>
                    <p>{t('pvp.emptyDesc', language)}</p>
                    {user && (
                        <button className="btn btn-primary btn-large" onClick={() => setShowCreate(true)} style={{ marginTop: 24 }}>
                            {t('pvp.emptyCta', language)}
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid-cards">
                    {filtered.map((g) => (
                        <PvpGroupCard
                            key={g.id}
                            group={g}
                            onClick={() => setSelectedGroupId(g.id)}
                        />
                    ))}
                </div>
            )}

            {selectedGroupId && (
                <PvpGroupDetailModal
                    groupId={selectedGroupId}
                    onClose={() => setSelectedGroupId(null)}
                    onDeleted={fetchGroups}
                />
            )}
            {showCreate && (
                <CreatePvpGroupModal
                    onClose={() => setShowCreate(false)}
                    onCreated={fetchGroups}
                />
            )}
        </div>
    );
}
