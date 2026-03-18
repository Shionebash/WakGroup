'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import PvpGroupCard from '@/components/PvpGroupCard';
import PvpGroupDetailModal from '@/components/PvpGroupDetailModal';
import CreatePvpGroupModal from '@/components/CreatePvpGroupModal';
import { useLanguage } from '@/lib/language-context';
import { t } from '@/lib/translations';

const PVP_MODES = ['1v1', '2v2', '3v3'];
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

    useEffect(() => { fetchGroups(); }, [fetchGroups]);

    const filtered = search
        ? groups.filter(g =>
            g.title?.toLowerCase().includes(search.toLowerCase())
        )
        : groups;

    return (
        <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
            {/* Hero */}
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <h1 className="title-gold" style={{ fontSize: 36, marginBottom: 8 }}>
                    {t('nav.pvp', language)}
                </h1>
                <p style={{ color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto' }}>
                    {t('pvp.subtitle', language)}
                </p>
            </div>

            {/* Actions bar */}
            <div className="filters-bar">
                {/* Search */}
                <div className="search-bar" style={{ flex: 1, maxWidth: 320 }}>
                    <span className="search-icon">🔍</span>
                    <input
                        className="search-input"
                        placeholder={t('pvp.searchPlaceholder', language)}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* PVP Mode filter */}
                <select
                    className="form-select"
                    style={{ width: 130 }}
                    value={filterMode}
                    onChange={e => setFilterMode(e.target.value)}
                >
                    <option value="">{t('pvp.anyMode', language)}</option>
                    {PVP_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>

                {/* Equipment band filter */}
                <select
                    className="form-select"
                    style={{ width: 160 }}
                    value={filterBand}
                    onChange={e => setFilterBand(e.target.value ? Number(e.target.value) : '')}
                >
                    <option value="">{t('pvp.allBands', language)}</option>
                    {BAND_OPTIONS.map(n => <option key={n} value={n}>{t('pvp.bandLevel', language).replace('{level}', String(n))}</option>)}
                </select>

                {/* Server filter */}
                <select
                    className="form-select"
                    style={{ width: 140 }}
                    value={filterServer}
                    onChange={e => setFilterServer(e.target.value)}
                >
                    <option value="">{t('home.allServers', language)}</option>
                    {SERVERS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                {user && (
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                        ⚔ {t('pvp.create', language)}
                    </button>
                )}
            </div>

            {/* Groups grid */}
            {loading ? (
                <div className="spinner" />
            ) : filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">⚔</div>
                    <h3>{t('pvp.emptyTitle', language)}</h3>
                    <p>{t('pvp.emptyDesc', language)}</p>
                    {user && (
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowCreate(true)}
                            style={{ marginTop: 24 }}
                        >
                            {t('pvp.emptyCta', language)}
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid-cards">
                    {filtered.map(g => (
                        <PvpGroupCard
                            key={g.id}
                            group={g}
                            onClick={() => setSelectedGroupId(g.id)}
                        />
                    ))}
                </div>
            )}

            {/* Modals */}
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
