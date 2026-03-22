'use client';
import { useState, useEffect } from 'react';
import { api, getAssetUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import GroupDetailModal from '@/components/GroupDetailModal';
import CreateGroupModal from '@/components/CreateGroupModal';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/language-context';
import { t, getDungeonApiName } from '@/lib/translations';
import CustomSelect from '@/components/CustomSelect';

const LEVEL_BANDS = [20, 35, 50, 65, 80, 95, 110, 125, 140, 155, 170, 185, 200, 215, 230, 245];

export default function DungeonsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { language } = useLanguage();
    const [dungeons, setDungeons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterBand, setFilterBand] = useState<number | ''>('');
    const [createForDungeon, setCreateForDungeon] = useState<number | null>(null);

    useEffect(() => {
        api.get('/dungeons')
            .then(r => setDungeons((r.data || []).filter((d: any) => d?.isActive !== false)))
            .finally(() => setLoading(false));
    }, []);

    const filtered = dungeons.filter(d => {
        if (filterBand && d.modulated !== filterBand) return false;
        if (search) {
            const q = search.toLowerCase();
            const name = getDungeonApiName(d, language).toLowerCase();
            const nameAlt = `${d.name_es || ''} ${d.name_en || ''} ${d.name_fr || ''} ${d.name_pt || ''}`.toLowerCase();
            if (!name.includes(q) && !nameAlt.includes(q)) return false;
        }
        return true;
    });

    // Group by modulated level
    const grouped = LEVEL_BANDS.map(level => ({
        level,
        dungeons: filtered.filter(d => d.modulated === level),
    })).filter(b => b.dungeons.length > 0);

    return (
        <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
            <h1 className="title-gold" style={{ fontSize: 32, marginBottom: 8, textAlign: 'center' }}>{t('dungeons.title', language)}</h1>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 32 }}>
                {t('dungeons.subtitle', language)}
            </p>

            {/* Filters */}
            <div className="filters-bar">
                <div className="search-bar" style={{ flex: 1, maxWidth: 360 }}>
                    <span className="search-icon">🔍</span>
                    <input className="search-input" placeholder={t('dungeons.searchPlaceholder', language)}
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div style={{ width: 200 }}>
                    <CustomSelect
                        value={filterBand === '' ? '' : String(filterBand)}
                        onChange={(next) => setFilterBand(next ? Number(next) : '')}
                        placeholder={t('dungeons.allBands', language)}
                        options={LEVEL_BANDS.map((level) => ({ value: String(level), label: t('dungeons.levelBand', language).replace('{level}', String(level)) }))}
                    />
                </div>
            </div>

            {loading ? <div className="spinner" /> : (
                grouped.map(band => (
                    <div key={band.level}>
                        <div className="level-band-header">
                            <h2>⚔ {t('dungeons.levelBand', language).replace('{level}', String(band.level))}</h2>
                            <div className="level-band-divider" />
                        </div>
                        <div className="grid-dungeons">
                            {band.dungeons.map((d: any) => (
                                <DungeonCard key={d.id} dungeon={d} onCreateGroup={() => setCreateForDungeon(d.id)} language={language} />
                            ))}
                        </div>
                    </div>
                ))
            )}

            {createForDungeon && (
                <CreateGroupModal
                    prefillDungeonId={createForDungeon}
                    onClose={() => setCreateForDungeon(null)}
                    onCreated={() => { }}
                />
            )}
        </div>
    );
}

function DungeonCard({ dungeon, onCreateGroup, language }: { dungeon: any; onCreateGroup: () => void; language: any }) {
    const router = useRouter();
    const { user } = useAuth();
    const WIKI_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const dungeonName = getDungeonApiName(dungeon, language);

    return (
        <div className="card" style={{ overflow: 'visible', cursor: 'default' }}>
            <div style={{ position: 'relative', paddingTop: '56.25%', overflow: 'hidden', borderRadius: '16px 16px 0 0' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={getAssetUrl(dungeon.image_path)}
                    alt={dungeonName}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,14,26,0.9), transparent)' }} />
                <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Cinzel', color: 'white', lineHeight: 1.3 }}>{dungeonName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{t('common.levelShort', language)} {dungeon.modulated} • {dungeon.max_players} {t('common.players', language)}</div>
                </div>
            </div>
            <div style={{ padding: '12px 14px', display: 'flex', gap: 6 }}>
                <button
                    className="btn btn-ghost" style={{ flex: 1, fontSize: 12, padding: '7px', justifyContent: 'center' }}
                    onClick={() => router.push(`/?dungeon=${dungeon.id}`)}
                >
                    🔍 {t('dungeons.viewGroups', language)}
                </button>
                {user && (
                    <button
                        className="btn btn-secondary" style={{ flex: 1, fontSize: 12, padding: '7px', justifyContent: 'center' }}
                        onClick={onCreateGroup}
                    >
                        ⚔ {t('dungeons.createGroup', language)}
                    </button>
                )}
                <a
                    href={`/wiki?dungeon=${dungeon.id}`}
                    className="btn btn-ghost" style={{ fontSize: 12, padding: '7px 10px' }}
                >
                    📖
                </a>
            </div>
        </div>
    );
}
