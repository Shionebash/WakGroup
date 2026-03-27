'use client';
import { useMemo, useState, useEffect } from 'react';
import { api, getAssetUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
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
            .then((response) => setDungeons((response.data || []).filter((dungeon: any) => dungeon?.isActive !== false)))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => (
        dungeons.filter((dungeon) => {
            if (filterBand && dungeon.modulated !== filterBand) return false;
            if (search) {
                const query = search.toLowerCase();
                const translated = getDungeonApiName(dungeon, language).toLowerCase();
                const fallback = `${dungeon.name_es || ''} ${dungeon.name_en || ''} ${dungeon.name_fr || ''} ${dungeon.name_pt || ''}`.toLowerCase();
                if (!translated.includes(query) && !fallback.includes(query)) return false;
            }
            return true;
        })
    ), [dungeons, filterBand, search, language]);

    const grouped = useMemo(() => LEVEL_BANDS.map((level) => ({
        level,
        dungeons: filtered.filter((dungeon) => dungeon.modulated === level),
    })).filter((band) => band.dungeons.length > 0), [filtered]);

    const featured = filtered.slice(0, 3);

    return (
        <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
            <section className="hero-shell" style={{ marginBottom: 26 }}>
                <div className="hero-panel hero-panel-single dungeons-hero-panel">
                    <div className="hero-copy">
                        <span className="hero-eyebrow">{t('dungeons.eyebrow', language)}</span>
                        <h1 className="title-gold hero-title">{t('dungeons.title', language)}</h1>
                        <p className="hero-description">{t('dungeons.subtitle', language)}</p>
                        <div className="dungeons-hero-stats">
                            <div className="dungeons-hero-pill">
                                <strong>{filtered.length}</strong>
                                <span>{t('dungeons.visibleCount', language)}</span>
                            </div>
                            <div className="dungeons-hero-pill">
                                <strong>{grouped.length}</strong>
                                <span>{t('dungeons.activeBands', language)}</span>
                            </div>
                            <div className="dungeons-hero-pill">
                                <strong>{featured.length}</strong>
                                <span>{t('dungeons.featuredCount', language)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="filters-shell" style={{ marginBottom: 24 }}>
                <div className="filters-head">
                    <div>
                        <h2 className="filters-title">{t('common.search', language)}</h2>
                        <p className="filters-subtitle">{t('dungeons.filtersHelp', language)}</p>
                    </div>
                    <span className="results-chip">{t('dungeons.resultsCount', language).replace('{count}', String(filtered.length))}</span>
                </div>

                <div className="filters-grid dungeons-filters-grid">
                    <div className="search-bar filter-control filter-search">
                        <span className="search-icon">🔍</span>
                        <input
                            className="search-input"
                            placeholder={t('dungeons.searchPlaceholder', language)}
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>
                    <CustomSelect
                        className="filter-control"
                        value={filterBand === '' ? '' : String(filterBand)}
                        onChange={(next) => setFilterBand(next ? Number(next) : '')}
                        placeholder={t('dungeons.allBands', language)}
                        options={[{ value: '', label: t('dungeons.allBands', language) }, ...LEVEL_BANDS.map((level) => ({
                            value: String(level),
                            label: t('dungeons.levelBand', language).replace('{level}', String(level)),
                        }))]}
                    />
                </div>
            </section>

            {featured.length > 0 && (
                <section className="dungeons-spotlight-shell">
                    <div className="dungeons-section-head">
                        <div>
                            <span className="hero-eyebrow">{t('dungeons.suggestedRoute', language)}</span>
                            <h2 className="filters-title" style={{ marginTop: 10 }}>{t('dungeons.featuredTitle', language)}</h2>
                        </div>
                    </div>
                    <div className="dungeons-spotlight-grid">
                        {featured.map((dungeon) => (
                            <FeaturedDungeonCard
                                key={dungeon.id}
                                dungeon={dungeon}
                                language={language}
                                onCreateGroup={() => setCreateForDungeon(dungeon.id)}
                                onViewGroups={() => router.push(`/?dungeon=${dungeon.id}`)}
                                canCreate={Boolean(user)}
                            />
                        ))}
                    </div>
                </section>
            )}

            {loading ? (
                <div className="spinner" />
            ) : grouped.length === 0 ? (
                <div className="empty-state dungeons-empty-state">
                    <div className="empty-state-icon">WG</div>
                    <h3>{t('home.emptyTitle', language)}</h3>
                    <p>{t('dungeons.emptyAlt', language)}</p>
                </div>
            ) : (
                <div className="dungeons-bands-stack">
                    {grouped.map((band) => (
                        <section key={band.level} className="dungeons-band-panel">
                            <div className="dungeons-band-head">
                                <div>
                                    <span className="hero-eyebrow">{t('dungeons.bandEyebrow', language)}</span>
                                    <h2 className="dungeons-band-title">{t('dungeons.levelBand', language).replace('{level}', String(band.level))}</h2>
                                </div>
                                <span className="results-chip">{t('dungeons.bandCount', language).replace('{count}', String(band.dungeons.length))}</span>
                            </div>
                            <div className="grid-dungeons dungeons-grid-refined">
                                {band.dungeons.map((dungeon) => (
                                    <DungeonCard
                                        key={dungeon.id}
                                        dungeon={dungeon}
                                        language={language}
                                        onCreateGroup={() => setCreateForDungeon(dungeon.id)}
                                        onViewGroups={() => router.push(`/?dungeon=${dungeon.id}`)}
                                        canCreate={Boolean(user)}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            {createForDungeon && (
                <CreateGroupModal
                    prefillDungeonId={createForDungeon}
                    onClose={() => setCreateForDungeon(null)}
                    onCreated={() => {}}
                />
            )}
        </div>
    );
}

function FeaturedDungeonCard({ dungeon, language, onCreateGroup, onViewGroups, canCreate }: any) {
    const dungeonName = getDungeonApiName(dungeon, language);

    return (
        <article className="dungeons-spotlight-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={getAssetUrl(dungeon.image_path)} alt={dungeonName} className="dungeons-spotlight-image" />
            <div className="dungeons-spotlight-overlay" />
            <div className="dungeons-spotlight-copy">
                <span className="badge badge-status badge-open">{t('common.levelShort', language)} {dungeon.modulated}</span>
                <h3>{dungeonName}</h3>
                <p>{dungeon.max_players} {t('common.players', language)} • {t('dungeons.quickActions', language)}</p>
                <div className="dungeons-card-actions">
                    <button className="btn btn-primary" onClick={onViewGroups}>{t('dungeons.viewGroups', language)}</button>
                    {canCreate && <button className="btn btn-secondary" onClick={onCreateGroup}>{t('dungeons.createGroup', language)}</button>}
                    <a className="btn btn-ghost" href={`/wiki?dungeon=${dungeon.id}`}>{t('dungeons.wiki', language)}</a>
                </div>
            </div>
        </article>
    );
}

function DungeonCard({ dungeon, onCreateGroup, onViewGroups, language, canCreate }: any) {
    const dungeonName = getDungeonApiName(dungeon, language);

    return (
        <article className="dungeons-refined-card">
            <div className="dungeons-refined-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={getAssetUrl(dungeon.image_path)}
                    alt={dungeonName}
                    className="dungeons-refined-image"
                    onError={(event) => { (event.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="dungeons-refined-shade" />
                <div className="dungeons-refined-meta">
                    <span className="badge badge-status badge-open">{t('common.levelShort', language)} {dungeon.modulated}</span>
                    <span className="badge badge-status badge-closed">{dungeon.max_players} {t('common.players', language)}</span>
                </div>
            </div>
            <div className="dungeons-refined-body">
                <h3 className="dungeons-refined-title">{dungeonName}</h3>
                <p className="dungeons-refined-description">{t('dungeons.cardDescription', language)}</p>
                <div className="dungeons-card-actions">
                    <button className="btn btn-ghost" onClick={onViewGroups}>{t('dungeons.viewGroups', language)}</button>
                    {canCreate && <button className="btn btn-secondary" onClick={onCreateGroup}>{t('dungeons.createGroup', language)}</button>}
                    <a className="btn btn-ghost" href={`/wiki?dungeon=${dungeon.id}`}>{t('dungeons.wiki', language)}</a>
                </div>
            </div>
        </article>
    );
}
