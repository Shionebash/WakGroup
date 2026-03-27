'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getAssetUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { addToast } from '@/components/ToastContainer';
import { useLanguage } from '@/lib/language-context';
import { t, getDungeonApiName } from '@/lib/translations';

export default function WikiPostPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuth();
    const { language } = useLanguage();
    const [post, setPost] = useState<any>(null);
    const [allPosts, setAllPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        Promise.all([api.get(`/wiki/${id}`), api.get('/wiki')])
            .then(([postResponse, listResponse]) => {
                setPost(postResponse.data);
                setAllPosts(listResponse.data || []);
            })
            .catch(() => router.push('/wiki'))
            .finally(() => setLoading(false));
    }, [id, router]);

    const relatedPosts = useMemo(() => {
        if (!post) return [];
        return allPosts
            .filter((entry) => entry.id !== post.id && String(entry.dungeon_id) === String(post.dungeon_id))
            .slice(0, 4);
    }, [allPosts, post]);

    const deletePost = async () => {
        if (!confirm(t('wiki.confirmDelete', language))) return;
        await api.delete(`/wiki/${id}`);
        addToast({ title: t('wiki.toastDeleted', language) });
        router.push('/wiki');
    };

    if (loading) return <div className="container" style={{ paddingTop: 60 }}><div className="spinner" /></div>;
    if (!post) return null;

    const isAuthor = user && user.id === post.user_id;
    const dungeonName = getDungeonApiName(post, language) || post.dungeon_name;

    return (
        <div className="container" style={{ paddingTop: 32, paddingBottom: 64, maxWidth: 1120 }}>
            <section className="wiki-detail-shell">
                <div className="wiki-detail-main">
                    <button className="btn btn-ghost" onClick={() => router.back()} style={{ marginBottom: 18, fontSize: 13 }}>
                        ← {t('common.back', language)}
                    </button>

                    <div className="wiki-detail-hero">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getAssetUrl(post.dungeon_image)} alt="" className="wiki-detail-hero-image" />
                        <div className="wiki-detail-hero-overlay" />
                        <div className="wiki-detail-hero-copy">
                            <div className="wiki-detail-meta-line">
                                <span className="hero-eyebrow">{dungeonName}</span>
                                <span className="results-chip">{t('common.levelShort', language)} {post.dungeon_lvl}</span>
                            </div>
                            <h1>{post.title}</h1>
                            <p>{t('wiki.by', language).replace('{user}', post.username)} • {formatPostDate(post.created_at, language)}</p>
                        </div>
                    </div>

                    <div className="wiki-detail-content-shell">
                        <div className="wiki-content" dangerouslySetInnerHTML={{ __html: post.content }} />
                    </div>

                    {isAuthor && (
                        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-danger" onClick={deletePost}>{t('wiki.delete', language)}</button>
                        </div>
                    )}
                </div>

                <aside className="wiki-detail-side">
                    <div className="wiki-aside-card">
                        <span className="hero-eyebrow">{t('wiki.summary', language)}</span>
                        <h3>{t('wiki.quickContext', language)}</h3>
                        <ul className="wiki-aside-list">
                            <li>{t('wiki.dungeonLabel', language)} {dungeonName}</li>
                            <li>{t('wiki.levelLabel', language)} {post.dungeon_lvl}</li>
                            <li>{t('wiki.authorLabel', language)} {post.username}</li>
                        </ul>
                    </div>
                    <div className="wiki-aside-card">
                        <span className="hero-eyebrow">{t('wiki.related', language)}</span>
                        <h3>{t('wiki.moreFromDungeon', language)}</h3>
                        {relatedPosts.length === 0 ? (
                            <p className="filters-subtitle" style={{ marginTop: 12 }}>{t('wiki.noRelated', language)}</p>
                        ) : (
                            <div className="wiki-related-stack">
                                {relatedPosts.map((entry) => (
                                    <Link key={entry.id} href={`/wiki/${entry.id}`} className="wiki-related-card">
                                        <strong>{entry.title}</strong>
                                        <span>{entry.username}</span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="wiki-aside-card">
                        <span className="hero-eyebrow">{t('wiki.browse', language)}</span>
                        <h3>{t('wiki.backToArchive', language)}</h3>
                        <Link href={`/wiki?dungeon=${post.dungeon_id}`} className="btn btn-secondary" style={{ width: '100%', marginTop: 10 }}>
                            {t('wiki.moreAboutDungeon', language).replace('{dungeon}', dungeonName)}
                        </Link>
                    </div>
                </aside>
            </section>
        </div>
    );
}

function formatPostDate(createdAt: number | string, language: any) {
    const millis = typeof createdAt === 'number' ? createdAt * 1000 : new Date(createdAt).getTime();
    return new Date(millis).toLocaleDateString(t('common.locale', language) as any, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}
