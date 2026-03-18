'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { t } from '@/lib/translations';
import { api } from '@/lib/api';
import GroupCard from '@/components/GroupCard';
import GroupDetailModal from '@/components/GroupDetailModal';
import CreateGroupModal from '@/components/CreateGroupModal';

const SERVERS = ['', 'Ogrest', 'Rubilax', 'Pandora'];
const STASIS_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);
const BAND_OPTIONS = [20, 35, 50, 65, 80, 95, 110, 125, 140, 155, 170, 185, 200, 215, 230, 245];

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

    const fetchGroups = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, any> = {};
            if (filterServer) params.server = filterServer;
            if (filterStasis) params.stasis = filterStasis;
            if (filterBand) params.min_lvl = filterBand;
            const res = await api.get('/groups', { params });
            setGroups(res.data);
        } finally { setLoading(false); }
    }, [filterServer, filterStasis, filterBand]);

    useEffect(() => { fetchGroups(); }, [fetchGroups]);

    const filtered = search
        ? groups.filter(g => {
            const dungeonName = g.dungeon_name || '';
            return (
                dungeonName?.toLowerCase().includes(search.toLowerCase()) ||
                g.title?.toLowerCase().includes(search.toLowerCase())
            );
        })
        : groups;

    return (
        <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
            {/* Hero */}
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <h1 className="title-gold" style={{ fontSize: 36, marginBottom: 8 }}>{t('home.title', language)}</h1>
                <p style={{ color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto' }}>
                    {t('home.subtitle', language)}
                </p>
            </div>

            {/* Actions bar */}
            <div className="filters-bar">
                {/* Search */}
                <div className="search-bar" style={{ flex: 1, maxWidth: 360 }}>
                    <span className="search-icon">🔍</span>
                    <input className="search-input" placeholder={t('home.searchPlaceholder', language)}
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>

                {/* Server filter */}
                <select className="form-select" style={{ width: 140 }} value={filterServer} onChange={e => setFilterServer(e.target.value)}>
                    <option value="">{t('home.allServers', language)}</option>
                    {SERVERS.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                {/* Stasis filter */}
                <select className="form-select" style={{ width: 140 }} value={filterStasis} onChange={e => setFilterStasis(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">{t('home.anyStasis', language)}</option>
                    {STASIS_OPTIONS.map(n => <option key={n} value={n}>Stasis {n}</option>)}
                </select>

                {/* Level band filter */}
                <select className="form-select" style={{ width: 160 }} value={filterBand} onChange={e => setFilterBand(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">{t('home.allBands', language)}</option>
                    {BAND_OPTIONS.map(n => <option key={n} value={n}>{t('home.bandUpTo', language).replace('{level}', String(n))}</option>)}
                </select>

                {user && (
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                        ⚔ {t('home.createGroup', language)}
                    </button>
                )}
            </div>

            {/* Groups grid */}
            {loading ? (
                <div className="spinner" />
            ) : filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">⚔</div>
                    <h3>{t('home.emptyTitle', language)}</h3>
                    <p>{t('home.emptyDesc', language)}</p>
                    {user && <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ marginTop: 24 }}>{t('home.emptyCta', language)}</button>}
                </div>
            ) : (
                <div className="grid-cards">
                    {filtered.map(g => (
                        <GroupCard key={g.id} group={g} onClick={() => setSelectedGroupId(g.id)} />
                    ))}
                </div>
            )}

            {/* Modals */}
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
