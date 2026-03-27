'use client';
import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, getAssetUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { addToast } from '@/components/ToastContainer';
import CustomSelect from '@/components/CustomSelect';
import { useLanguage } from '@/lib/language-context';
import { t, getDungeonApiName } from '@/lib/translations';

const BAND_OPTIONS = [20, 35, 50, 65, 80, 95, 110, 125, 140, 155, 170, 185, 200, 215, 230, 245];

export default function WikiPage() {
    return (
        <Suspense fallback={<div className="container" style={{ paddingTop: 60 }}><div className="spinner" /></div>}>
            <WikiContent />
        </Suspense>
    );
}

function WikiContent() {
    const { user } = useAuth();
    const { language } = useLanguage();
    const searchParams = useSearchParams();
    const prefillDungeon = searchParams.get('dungeon');
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterBand, setFilterBand] = useState<number | ''>('');
    const [filterDungeon, setFilterDungeon] = useState(prefillDungeon || '');
    const [showCreate, setShowCreate] = useState(false);
    const [dungeons, setDungeons] = useState<any[]>([]);

    useEffect(() => {
        setLoading(true);
        Promise.all([api.get('/wiki'), api.get('/dungeons')])
            .then(([wikiResponse, dungeonResponse]) => {
                setPosts(wikiResponse.data || []);
                setDungeons((dungeonResponse.data || []).filter((entry: any) => entry?.isActive !== false));
            })
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => posts.filter((post) => {
        if (filterBand && Number(post.dungeon_lvl) !== filterBand) return false;
        if (filterDungeon && String(post.dungeon_id) !== String(filterDungeon)) return false;
        if (search) {
            const query = search.toLowerCase();
            const haystack = `${post.title || ''} ${post.username || ''} ${post.dungeon_name || ''}`.toLowerCase();
            if (!haystack.includes(query)) return false;
        }
        return true;
    }), [posts, filterBand, filterDungeon, search]);

    const featured = filtered.slice(0, 2);
    const recent = filtered.slice(2);
    const dungeonOptions = dungeons.map((dungeon: any) => ({
        value: String(dungeon.id),
        label: `${getDungeonApiName(dungeon, language)} (${t('common.levelShort', language)} ${dungeon.modulated})`,
    }));

    const deletePost = async (id: string) => {
        if (!confirm(t('wiki.confirmDelete', language))) return;
        try {
            await api.delete(`/wiki/${id}`);
            setPosts((prev) => prev.filter((post) => post.id !== id));
            addToast({ title: t('wiki.toastDeleted', language) });
        } catch (error: any) {
            addToast({ title: t('common.error', language), body: error.response?.data?.error || t('wiki.errorDelete', language) });
        }
    };

    return (
        <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
            <section className="hero-shell" style={{ marginBottom: 26 }}>
                <div className="hero-panel hero-panel-single wiki-hero-panel">
                    <div className="hero-copy">
                        <span className="hero-eyebrow">{t('wiki.eyebrow', language)}</span>
                        <h1 className="title-gold hero-title">{t('wiki.title', language)}</h1>
                        <p className="hero-description">{t('wiki.subtitle', language)}</p>
                        <div className="dungeons-hero-stats">
                            <div className="dungeons-hero-pill">
                                <strong>{filtered.length}</strong>
                                <span>{t('wiki.visibleCount', language)}</span>
                            </div>
                            <div className="dungeons-hero-pill">
                                <strong>{featured.length}</strong>
                                <span>{t('wiki.featuredCount', language)}</span>
                            </div>
                            <div className="dungeons-hero-pill">
                                <strong>{recent.length}</strong>
                                <span>{t('wiki.recentCount', language)}</span>
                            </div>
                        </div>
                    </div>
                    {user && (
                        <div className="wiki-hero-cta">
                            <button className="btn btn-primary btn-large" onClick={() => setShowCreate(true)}>
                                + {t('wiki.new', language)}
                            </button>
                        </div>
                    )}
                </div>
            </section>

            <section className="filters-shell" style={{ marginBottom: 24 }}>
                <div className="filters-head">
                    <div>
                        <h2 className="filters-title">{t('common.search', language)}</h2>
                        <p className="filters-subtitle">{t('wiki.filtersHelp', language)}</p>
                    </div>
                    <span className="results-chip">{t('wiki.publicationsCount', language).replace('{count}', String(filtered.length))}</span>
                </div>

                <div className="wiki-filters-grid">
                    <div className="search-bar filter-control filter-search">
                        <span className="search-icon">🔍</span>
                        <input className="search-input" placeholder={t('wiki.searchPlaceholder', language)} value={search} onChange={(event) => setSearch(event.target.value)} />
                    </div>
                    <CustomSelect
                        className="filter-control"
                        value={filterBand === '' ? '' : String(filterBand)}
                        onChange={(value) => setFilterBand(value ? Number(value) : '')}
                        placeholder={t('home.allBands', language)}
                        options={[{ value: '', label: t('home.allBands', language) }, ...BAND_OPTIONS.map((band) => ({
                            value: String(band),
                            label: t('home.bandUpTo', language).replace('{level}', String(band)),
                        }))]}
                    />
                    <CustomSelect
                        className="filter-control"
                        value={filterDungeon}
                        onChange={(value) => setFilterDungeon(value)}
                        placeholder={t('wiki.selectDungeon', language)}
                        options={[{ value: '', label: t('wiki.selectDungeon', language) }, ...dungeonOptions]}
                    />
                </div>
            </section>

            {loading ? (
                <div className="spinner" />
            ) : filtered.length === 0 ? (
                <div className="empty-state wiki-empty-state">
                    <div className="empty-state-icon">WG</div>
                    <h3>{t('wiki.emptyTitle', language)}</h3>
                    <p>{t('wiki.emptyDesc', language)}</p>
                    {user && <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ marginTop: 24 }}>{t('wiki.emptyCta', language)}</button>}
                </div>
            ) : (
                <>
                    {featured.length > 0 && (
                        <section className="wiki-featured-shell">
                            <div className="dungeons-section-head">
                                <div>
                                    <span className="hero-eyebrow">{t('wiki.featuredEyebrow', language)}</span>
                                    <h2 className="filters-title" style={{ marginTop: 10 }}>{t('wiki.featuredTitle', language)}</h2>
                                </div>
                            </div>
                            <div className="wiki-featured-grid">
                                {featured.map((post) => (
                                    <FeaturedWikiCard key={post.id} post={post} language={language} />
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="wiki-rail-shell">
                        <div className="wiki-rail-main">
                            <div className="dungeons-section-head">
                                <div>
                                    <span className="hero-eyebrow">{t('wiki.archiveEyebrow', language)}</span>
                                    <h2 className="filters-title" style={{ marginTop: 10 }}>{t('wiki.recentTitle', language)}</h2>
                                </div>
                            </div>
                            <div className="wiki-post-stack">
                                {(recent.length > 0 ? recent : featured).map((post) => {
                                    const isAuthor = user && user.id === post.user_id;
                                    return (
                                        <article key={post.id} className="wiki-post-card-refined">
                                            <Link href={`/wiki/${post.id}`} className="wiki-post-card-link">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={getAssetUrl(post.dungeon_image)} alt="" className="wiki-post-card-image" />
                                                <div className="wiki-post-card-copy">
                                                    <div className="wiki-post-card-meta">
                                                        <span>{getDungeonApiName(post, language) || post.dungeon_name}</span>
                                                        <span>{t('common.levelShort', language)} {post.dungeon_lvl}</span>
                                                    </div>
                                                    <h3>{post.title}</h3>
                                                    <p>{buildWikiExcerpt(post.content)}</p>
                                                    <div className="wiki-post-card-footer">
                                                        <span>{t('wiki.by', language).replace('{user}', post.username)}</span>
                                                        <span>{formatPostDate(post.created_at, language)}</span>
                                                    </div>
                                                </div>
                                            </Link>
                                            {isAuthor && (
                                                <button className="btn btn-danger" onClick={() => deletePost(post.id)} style={{ fontSize: 12, padding: '8px 12px' }}>
                                                    {t('wiki.delete', language)}
                                                </button>
                                            )}
                                        </article>
                                    );
                                })}
                            </div>
                        </div>

                        <aside className="wiki-rail-side">
                            <div className="wiki-aside-card">
                                <span className="hero-eyebrow">{t('wiki.publishEyebrow', language)}</span>
                                <h3>{t('wiki.bestGuides', language)}</h3>
                                <ul className="wiki-aside-list">
                                    <li>{t('wiki.guideTip1', language)}</li>
                                    <li>{t('wiki.guideTip2', language)}</li>
                                    <li>{t('wiki.guideTip3', language)}</li>
                                </ul>
                                {user && (
                                    <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ width: '100%', marginTop: 10 }}>
                                        + {t('wiki.new', language)}
                                    </button>
                                )}
                            </div>
                            <div className="wiki-aside-card">
                                <span className="hero-eyebrow">{t('wiki.exploreEyebrow', language)}</span>
                                <h3>{t('wiki.quickAccess', language)}</h3>
                                <div className="wiki-aside-tags">
                                    {dungeonOptions.slice(0, 8).map((option) => (
                                        <button key={option.value} className={`wiki-chip ${filterDungeon === option.value ? 'active' : ''}`} onClick={() => setFilterDungeon(option.value)}>
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </aside>
                    </section>
                </>
            )}

            {showCreate && (
                <CreateWikiPostModal
                    dungeons={dungeons}
                    prefillDungeon={prefillDungeon}
                    onClose={() => setShowCreate(false)}
                    onCreated={() => api.get('/wiki').then((response) => setPosts(response.data || []))}
                />
            )}
        </div>
    );
}

function FeaturedWikiCard({ post, language }: any) {
    return (
        <Link href={`/wiki/${post.id}`} className="wiki-featured-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={getAssetUrl(post.dungeon_image)} alt="" className="wiki-featured-image" />
            <div className="wiki-featured-overlay" />
            <div className="wiki-featured-copy">
                <span className="hero-eyebrow">{getDungeonApiName(post, language) || post.dungeon_name}</span>
                <h3>{post.title}</h3>
                <p>{buildWikiExcerpt(post.content)}</p>
            </div>
        </Link>
    );
}

function CreateWikiPostModal({ dungeons, prefillDungeon, onClose, onCreated }: any) {
    const [form, setForm] = useState({ dungeon_id: prefillDungeon || '', title: '', content: '' });
    const [saving, setSaving] = useState(false);
    const { language } = useLanguage();
    const setField = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));
    const selectedDungeon = dungeons.find((entry: any) => String(entry.id) === String(form.dungeon_id));

    const submit = async () => {
        if (!form.dungeon_id || !form.title || !form.content) {
            addToast({ title: t('wiki.requiredTitle', language), body: t('wiki.requiredBody', language) });
            return;
        }
        setSaving(true);
        try {
            await api.post('/wiki', form);
            addToast({ title: t('wiki.published', language) });
            onCreated();
            onClose();
        } catch (error: any) {
            addToast({ title: t('common.error', language), body: error.response?.data?.error || t('wiki.errorPublish', language) });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal wiki-create-modal" onClick={(event) => event.stopPropagation()}>
                <div className="modal-header">
                    <h2 style={{ fontSize: 20 }}>{t('wiki.newTitle', language)}</h2>
                    <button className="btn btn-ghost" onClick={onClose} style={{ marginLeft: 'auto', padding: '6px 12px' }}>✕</button>
                </div>
                <div className="wiki-create-layout">
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div className="form-group">
                            <label className="form-label">{t('wiki.dungeon', language)}</label>
                            <CustomSelect
                                value={form.dungeon_id}
                                onChange={(value) => setField('dungeon_id', value)}
                                placeholder={t('wiki.selectDungeon', language)}
                                options={dungeons.map((dungeon: any) => ({
                                    value: String(dungeon.id),
                                    label: `${getDungeonApiName(dungeon, language)} (${t('common.levelShort', language)} ${dungeon.modulated})`,
                                }))}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('wiki.titleLabel', language)}</label>
                            <input className="form-input" value={form.title} onChange={(event) => setField('title', event.target.value)} maxLength={200} placeholder={t('wiki.titlePlaceholder', language)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('wiki.contentLabel', language)}</label>
                            <textarea className="form-textarea" style={{ minHeight: 260 }} value={form.content} onChange={(event) => setField('content', event.target.value)} placeholder={t('wiki.contentPlaceholder', language)} />
                            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>{t('wiki.contentHint', language)}</p>
                        </div>
                    </div>
                    <aside className="wiki-create-aside">
                        <span className="hero-eyebrow">{t('wiki.preview', language)}</span>
                        <h3>{form.title || t('wiki.previewTitleFallback', language)}</h3>
                        <p className="wiki-create-aside-dungeon">
                            {selectedDungeon ? getDungeonApiName(selectedDungeon, language) : t('wiki.previewDungeonFallback', language)}
                        </p>
                        <p className="wiki-create-aside-body">{buildWikiExcerpt(form.content) || t('wiki.previewBodyFallback', language)}</p>
                    </aside>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel', language)}</button>
                    <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? t('wiki.saving', language) : t('wiki.publish', language)}</button>
                </div>
            </div>
        </div>
    );
}

function buildWikiExcerpt(content: string) {
    const plain = String(content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!plain) return '';
    return plain.length > 170 ? `${plain.slice(0, 167)}...` : plain;
}

function formatPostDate(createdAt: number | string, language: any) {
    const millis = typeof createdAt === 'number' ? createdAt * 1000 : new Date(createdAt).getTime();
    return new Date(millis).toLocaleDateString(t('common.locale', language) as any, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}
