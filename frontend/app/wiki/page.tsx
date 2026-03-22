'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
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
    )
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
    const [showCreate, setShowCreate] = useState(false);
    const [dungeons, setDungeons] = useState<any[]>([]);

    const fetchPosts = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, any> = {};
            if (search) params.search = search;
            if (filterBand) params.modulated = filterBand;
            const res = await api.get('/wiki', { params });
            setPosts(res.data);
        } finally { setLoading(false); }
    }, [search, filterBand]);

    useEffect(() => { fetchPosts(); }, [fetchPosts]);
    useEffect(() => { api.get('/dungeons').then(r => setDungeons(r.data)); }, []);

    const deletePost = async (id: string) => {
        if (!confirm(t('wiki.confirmDelete', language))) return;
        try {
            await api.delete(`/wiki/${id}`);
            setPosts(prev => prev.filter(p => p.id !== id));
            addToast({ title: t('wiki.toastDeleted', language) });
        } catch (e: any) {
            addToast({ title: t('common.error', language), body: e.response?.data?.error || t('wiki.errorDelete', language) });
        }
    };

    return (
        <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                <div>
                    <h1 className="title-gold" style={{ fontSize: 32, marginBottom: 4 }}>📖 {t('wiki.title', language)}</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>{t('wiki.subtitle', language)}</p>
                </div>
                {user && (
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ {t('wiki.new', language)}</button>
                )}
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div className="search-bar" style={{ flex: 1, maxWidth: 400 }}>
                    <span className="search-icon">🔍</span>
                    <input className="search-input" placeholder={t('wiki.searchPlaceholder', language)}
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div style={{ width: 200 }}>
                    <CustomSelect
                        value={filterBand === '' ? '' : String(filterBand)}
                        onChange={e => setFilterBand(e ? Number(e) : '')}
                        placeholder={t('home.allBands', language)}
                        options={BAND_OPTIONS.map(b => ({ value: String(b), label: t('home.bandUpTo', language).replace('{level}', String(b)) }))}
                    />
                </div>
                <button className="btn btn-ghost" onClick={fetchPosts}>🔄</button>
            </div>

            {/* Posts list */}
            {loading ? <div className="spinner" /> : posts.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📖</div>
                    <h3>{t('wiki.emptyTitle', language)}</h3>
                    <p>{t('wiki.emptyDesc', language)}</p>
                    {user && <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ marginTop: 24 }}>{t('wiki.emptyCta', language)}</button>}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {posts.map((p: any) => {
                        const isAuthor = user && user.id === p.user_id;
                        return (
                            <div key={p.id} className="wiki-post-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <Link href={`/wiki/${p.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={getAssetUrl(p.dungeon_image)} alt="" width={64} height={64}
                                            style={{ borderRadius: 10, objectFit: 'cover', flexShrink: 0, background: 'var(--bg-dark)' }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
                                                <span style={{ fontSize: 12, color: 'var(--accent-teal)', fontWeight: 600 }}>{getDungeonApiName(p, language) || p.dungeon_name}</span>
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('common.levelShort', language)} {p.dungeon_lvl}</span>
                                            </div>
                                            <h3 style={{ fontSize: 16, fontFamily: 'Cinzel', fontWeight: 700, marginBottom: 4 }}>{p.title}</h3>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {t('wiki.by', language).replace('{user}', p.username)} • {new Date(p.created_at * 1000).toLocaleDateString(t('common.locale', language) as any, { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                                {isAuthor && (
                                    <button
                                        className="btn btn-danger"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); deletePost(p.id); }}
                                        style={{ fontSize: 12, padding: '6px 12px' }}
                                    >
                                        🗑
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {showCreate && (
                <CreateWikiPostModal dungeons={dungeons} prefillDungeon={prefillDungeon} onClose={() => setShowCreate(false)} onCreated={fetchPosts} />
            )}
        </div>
    );
}

function CreateWikiPostModal({ dungeons, prefillDungeon, onClose, onCreated }: any) {
    const [form, setForm] = useState({ dungeon_id: prefillDungeon || '', title: '', content: '' });
    const [saving, setSaving] = useState(false);
    const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
    const { language } = useLanguage();

    const submit = async () => {
        if (!form.dungeon_id || !form.title || !form.content) {
            addToast({ title: t('wiki.requiredTitle', language), body: t('wiki.requiredBody', language) }); return;
        }
        setSaving(true);
        try {
            await api.post('/wiki', form);
            addToast({ title: t('wiki.published', language) });
            onCreated(); onClose();
        } catch (e: any) {
            addToast({ title: t('common.error', language), body: e.response?.data?.error || t('wiki.errorPublish', language) });
        } finally { setSaving(false); }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
                <div className="modal-header">
                    <h2 style={{ fontSize: 20 }}>📖 {t('wiki.newTitle', language)}</h2>
                    <button className="btn btn-ghost" onClick={onClose} style={{ marginLeft: 'auto', padding: '6px 12px' }}>✕</button>
                </div>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="form-group">
                        <label className="form-label">{t('wiki.dungeon', language)}</label>
                        <CustomSelect
                            value={form.dungeon_id}
                            onChange={e => set('dungeon_id', e)}
                            placeholder={t('wiki.selectDungeon', language)}
                            options={dungeons.map((d: any) => {
                                const name = getDungeonApiName(d, language);
                                return { value: String(d.id), label: `${name} (${t('common.levelShort', language)} ${d.modulated})` };
                            })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('wiki.titleLabel', language)}</label>
                        <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} maxLength={200} placeholder={t('wiki.titlePlaceholder', language)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('wiki.contentLabel', language)}</label>
                        <textarea className="form-textarea" style={{ minHeight: 240 }} value={form.content} onChange={e => set('content', e.target.value)} placeholder={t('wiki.contentPlaceholder', language)} />
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{t('wiki.contentHint', language)}</p>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel', language)}</button>
                    <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? t('wiki.saving', language) : t('wiki.publish', language)}</button>
                </div>
            </div>
        </div>
    );
}
