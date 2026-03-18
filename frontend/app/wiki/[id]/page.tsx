'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/wiki/${id}`).then(r => setPost(r.data)).catch(() => router.push('/wiki')).finally(() => setLoading(false));
    }, [id, router]);

    const deletePost = async () => {
        if (!confirm(t('wiki.confirmDelete', language))) return;
        await api.delete(`/wiki/${id}`);
        addToast({ title: t('wiki.toastDeleted', language) });
        router.push('/wiki');
    };

    if (loading) return <div className="container" style={{ paddingTop: 60 }}><div className="spinner" /></div>;
    if (!post) return null;

    const isAuthor = user && user.id === post.user_id;

    return (
        <div className="container" style={{ paddingTop: 32, paddingBottom: 64, maxWidth: 800 }}>
            <button className="btn btn-ghost" onClick={() => router.back()} style={{ marginBottom: 24, fontSize: 13 }}>← {t('common.back', language)}</button>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: 'var(--accent-teal)', fontWeight: 600 }}>{getDungeonApiName(post, language) || post.dungeon_name}</span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('wiki.by', language).replace('{user}', post.username)}</span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{new Date(post.created_at * 1000).toLocaleDateString(t('common.locale', language) as any, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>

            <h1 style={{ fontFamily: 'Cinzel', fontSize: 28, marginBottom: 24, color: 'var(--text-primary)' }}>{post.title}</h1>

            <div className="wiki-content" dangerouslySetInnerHTML={{ __html: post.content }} />

            {isAuthor && (
                <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button className="btn btn-danger" onClick={deletePost}>🗑 {t('wiki.delete', language)}</button>
                </div>
            )}
        </div>
    );
}
