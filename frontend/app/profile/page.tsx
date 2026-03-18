'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, getAssetUrl } from '@/lib/api';
import { addToast } from '@/components/ToastContainer';

const ROLES = ['dps', 'healer', 'tank', 'support', 'invocador', 'posicionador'];
const SERVERS = ['Ogrest', 'Rubilax', 'Pandora'];
const CLASSES_LABELS: Record<number, string> = {
    1: 'Feca', 2: 'Osamodas', 3: 'Anutrof', 4: 'Sram', 5: 'Xelor', 6: 'Zurcarák',
    7: 'Aniripsa', 8: 'Yopuka', 9: 'Ocra', 10: 'Sadida', 11: 'Sacrógrito', 12: 'Pandawa',
    13: 'Tymador', 14: 'Zobal', 15: 'Ouginak', 16: 'Steamer', 18: 'Selotrop', 19: 'Hipermago',
};

type Tab = 'chars' | 'sent' | 'incoming' | 'groups' | 'wiki';

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [tab, setTab] = useState<Tab>('chars');

    if (authLoading) return <div className="container" style={{ paddingTop: 60 }}><div className="spinner" /></div>;
    if (!user) {
        const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        return (
            <div className="container" style={{ paddingTop: 80, textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)' }}>Debes iniciar sesión para ver tu perfil.</p>
                <a href={`${API}/auth/discord`} className="btn btn-primary" style={{ display: 'inline-flex', marginTop: 20 }}>Iniciar sesión con Discord</a>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingTop: 32, paddingBottom: 48, maxWidth: 900 }}>
            {/* Profile header */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 32, padding: 24, background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-gold)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png`} alt="" width={72} height={72} className="avatar" style={{ border: '3px solid var(--border-gold)' }} onError={e => { (e.target as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/0.png'; }} />
                <div>
                    <h1 style={{ fontSize: 24, fontFamily: 'Cinzel' }}>{user.username}</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Aventurero del mundo de los Doce</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="tab-bar">
                {[['chars', '⚔ Personajes'], ['sent', '📩 Solicitudes enviadas'], ['incoming', '📥 Solicitudes recibidas'], ['groups', '🏰 Grupos creados'], ['wiki', '📖 Wiki']].map(([key, label]) => (
                    <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key as Tab)}>{label}</button>
                ))}
            </div>

            {tab === 'chars' && <CharactersTab userId={user.id} />}
            {tab === 'sent' && <SentApplicationsTab />}
            {tab === 'incoming' && <IncomingApplicationsTab />}
            {tab === 'groups' && <GroupsHistoryTab userId={user.id} />}
            {tab === 'wiki' && <WikiPostsTab userId={user.id} />}
        </div>
    );
}

// ---- Personajes ----
function CharactersTab({ userId }: { userId: string }) {
    const [chars, setChars] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [classes, setClasses] = useState<any[]>([]);
    const [form, setForm] = useState({ name: '', level: 1, class_id: 1, role: 'dps', server: 'Ogrest' });
    const [saving, setSaving] = useState(false);
    const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

    const fetchChars = useCallback(() => {
        api.get('/characters').then(r => setChars(r.data)).finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchChars(); }, [fetchChars]);
    useEffect(() => { api.get('/dungeons').then(); }, []);

    // Load classes from static data
    useEffect(() => {
        const classData = Object.entries(CLASSES_LABELS).map(([id, name]) => ({ id: Number(id), name }));
        setClasses(classData);
    }, []);

    const saveChar = async () => {
        if (!formMode) return;
        setSaving(true);
        try {
            if (formMode === 'add') {
                await api.post('/characters', form);
                addToast({ title: '✅ Personaje añadido' });
            } else if (editingId) {
                await api.put(`/characters/${editingId}`, form);
                addToast({ title: '✅ Personaje actualizado' });
            }
            fetchChars();
            setFormMode(null);
            setEditingId(null);
            setForm({ name: '', level: 1, class_id: 1, role: 'dps', server: 'Ogrest' });
        } catch (e: any) {
            addToast({ title: '❌ Error', body: e.response?.data?.error });
        } finally { setSaving(false); }
    };

    const startEdit = (char: any) => {
        setForm({
            name: char.name || '',
            level: Number(char.level) || 1,
            class_id: Number(char.class_id) || 1,
            role: char.role || 'dps',
            server: char.server || 'Ogrest',
        });
        setEditingId(char.id);
        setFormMode('edit');
    };

    const deleteChar = async (id: string) => {
        if (!confirm('¿Eliminar personaje?')) return;
        await api.delete(`/characters/${id}`);
        fetchChars();
        addToast({ title: '🗑 Personaje eliminado' });
    };

    const ROLE_COLORS: Record<string, string> = {
        dps: '#ef4444', healer: '#22c55e', tank: '#3b82f6', support: '#f59e0b', invocador: '#8b5cf6', posicionador: '#ec4899',
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 className="section-title" style={{ marginBottom: 0 }}>Mis Personajes</h2>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        setForm({ name: '', level: 1, class_id: 1, role: 'dps', server: 'Ogrest' });
                        setEditingId(null);
                        setFormMode('add');
                    }}
                >
                    + Añadir personaje
                </button>
            </div>

            {formMode && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-teal)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
                    <h3 style={{ fontFamily: 'Cinzel', fontSize: 16, marginBottom: 16, color: 'var(--accent-teal)' }}>
                        {formMode === 'add' ? 'Nuevo Personaje' : 'Editar Personaje'}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Nombre *</label>
                            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} maxLength={50} placeholder="Nombre del personaje" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nivel *</label>
                            <input className="form-input" type="number" min={1} max={245} value={form.level} onChange={e => set('level', Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Clase *</label>
                            <select className="form-select" value={form.class_id} onChange={e => set('class_id', Number(e.target.value))}>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Rol *</label>
                            <select className="form-select" value={form.role} onChange={e => set('role', e.target.value)}>
                                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Servidor *</label>
                            <select className="form-select" value={form.server} onChange={e => set('server', e.target.value)}>
                                {SERVERS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost" onClick={() => { setFormMode(null); setEditingId(null); }}>Cancelar</button>
                        <button className="btn btn-primary" onClick={saveChar} disabled={saving}>
                            {saving ? 'Guardando...' : formMode === 'add' ? 'Guardar personaje' : 'Actualizar personaje'}
                        </button>
                    </div>
                </div>
            )}

            {loading ? <div className="spinner" /> : chars.length === 0 ? (
                <div className="empty-state"><div className="empty-state-icon">⚔</div><h3>Sin personajes</h3><p>Añade tu primer personaje para unirte a grupos.</p></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {chars.map((c: any) => (
                        <div key={c.id} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '14px 18px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`${process.env.NEXT_PUBLIC_API_URL}/${c.class_icon}`} alt="" width={44} height={44} style={{ borderRadius: 10, background: 'var(--bg-dark)' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0'; }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Nv.{c.level} {c.class_name} • {c.server}</div>
                            </div>
                            <span style={{ fontSize: 12, color: ROLE_COLORS[c.role], background: ROLE_COLORS[c.role] + '22', padding: '3px 10px', borderRadius: 100 }}>
                                {c.role.charAt(0).toUpperCase() + c.role.slice(1)}
                            </span>
                            <button className="btn btn-secondary" onClick={() => startEdit(c)} style={{ fontSize: 12, padding: '6px 12px' }}>✏️</button>
                            <button className="btn btn-danger" onClick={() => deleteChar(c.id)} style={{ fontSize: 12, padding: '6px 12px' }}>🗑</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ---- Solicitudes enviadas ----
function SentApplicationsTab() {
    const [apps, setApps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { api.get('/applications/mine').then(r => setApps(r.data)).finally(() => setLoading(false)); }, []);

    const STATUS_STYLE: Record<string, any> = {
        pending: { color: '#f59e0b', bg: '#f59e0b22', label: '⏳ Pendiente' },
        accepted: { color: '#22c55e', bg: '#22c55e22', label: '✅ Aceptado' },
        rejected: { color: '#ef4444', bg: '#ef444422', label: '❌ Rechazado' },
    };

    return (
        <div>
            <h2 className="section-title">Solicitudes Enviadas</h2>
            {loading ? <div className="spinner" /> : apps.length === 0 ? (
                <div className="empty-state"><div className="empty-state-icon">📩</div><h3>Sin solicitudes</h3><p>Aún no has aplicado a ningún grupo.</p></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {apps.map((a: any) => {
                        const s = STATUS_STYLE[a.status] || STATUS_STYLE.pending;
                        return (
                            <div key={a.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px 18px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={`${process.env.NEXT_PUBLIC_API_URL}/${a.dungeon_image}`} alt="" width={48} height={48} style={{ borderRadius: 8, objectFit: 'cover' }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>{a.group_title}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.dungeon_name} • {a.char_name}</div>
                                </div>
                                <span style={{ fontSize: 12, color: s.color, background: s.bg, padding: '3px 10px', borderRadius: 100, fontWeight: 600 }}>{s.label}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ---- Solicitudes recibidas ----
function IncomingApplicationsTab() {
    const [apps, setApps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchApps = useCallback(() => {
        api.get('/applications/incoming').then(r => setApps(r.data)).finally(() => setLoading(false));
    }, []);
    useEffect(() => { fetchApps(); }, [fetchApps]);

    const handleAction = async (appId: string, action: 'accepted' | 'rejected') => {
        await api.patch(`/applications/${appId}`, { action });
        addToast({ title: action === 'accepted' ? '✅ Solicitud aceptada' : '❌ Solicitud rechazada' });
        fetchApps();
    };

    return (
        <div>
            <h2 className="section-title">Solicitudes Recibidas</h2>
            {loading ? <div className="spinner" /> : apps.length === 0 ? (
                <div className="empty-state"><div className="empty-state-icon">📥</div><h3>Sin solicitudes</h3><p>No tienes solicitudes pendientes en tus grupos.</p></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {apps.map((a: any) => (
                        <div key={a.id} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '14px 18px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`https://cdn.discordapp.com/embed/avatars/0.png`} alt="" width={40} height={40} className="avatar" />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>{a.applicant_username}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    {a.char_name} • Nv.{a.level} {a.class_name} • {a.role} • {a.group_title}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-secondary" style={{ fontSize: 12, padding: '7px 14px' }} onClick={() => handleAction(a.id, 'accepted')}>✅ Aceptar</button>
                                <button className="btn btn-danger" style={{ fontSize: 12, padding: '7px 14px' }} onClick={() => handleAction(a.id, 'rejected')}>❌ Rechazar</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ---- Historial de grupos ----
function GroupsHistoryTab({ userId }: { userId: string }) {
    const [dungeonGroups, setDungeonGroups] = useState<any[]>([]);
    const [pvpGroups, setPvpGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchGroups = useCallback(() => {
        setLoading(true);
        Promise.all([
            api.get('/groups', { params: { limit: 50 } }),
            api.get('/pvp-groups', { params: { limit: 50 } }),
        ])
            .then(([dRes, pRes]) => {
                setDungeonGroups((dRes.data || []).filter((g: any) => g.leader_user_id === userId));
                setPvpGroups((pRes.data || []).filter((g: any) => g.leader_user_id === userId));
            })
            .finally(() => setLoading(false));
    }, [userId]);

    useEffect(() => { fetchGroups(); }, [fetchGroups]);

    const deleteDungeonGroup = async (id: string) => {
        if (!confirm('¿Eliminar este grupo de mazmorra?')) return;
        await api.delete(`/groups/${id}`);
        addToast({ title: '🗑 Grupo eliminado' });
        fetchGroups();
    };

    const deletePvpGroup = async (id: string) => {
        if (!confirm('¿Eliminar este grupo PVP?')) return;
        await api.delete(`/pvp-groups/${id}`);
        addToast({ title: '🗑 Enfrentamiento eliminado' });
        fetchGroups();
    };

    return (
        <div>
            <h2 className="section-title">Grupos Creados</h2>
            {loading ? <div className="spinner" /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div>
                        <h3 style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>Mazmorra</h3>
                        {dungeonGroups.length === 0 ? (
                            <div className="empty-state" style={{ padding: 18 }}>
                                <div className="empty-state-icon">⚔</div>
                                <h3>Sin grupos de mazmorra</h3>
                                <p>No has creado grupos de mazmorra.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {dungeonGroups.map((g: any) => (
                                    <div key={g.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px 18px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={`${process.env.NEXT_PUBLIC_API_URL}/${g.dungeon_image}`} alt="" width={48} height={48} style={{ borderRadius: 8, objectFit: 'cover' }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600 }}>{g.title}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{g.dungeon_name} • {g.server} • Stasis {g.stasis}</div>
                                        </div>
                                        <span style={{ fontSize: 12, color: g.status === 'open' ? '#22c55e' : 'var(--text-muted)', fontWeight: 600 }}>
                                            {g.status === 'open' ? '● Abierto' : g.status === 'full' ? '● Lleno' : '○ Cerrado'}
                                        </span>
                                        <button className="btn btn-danger" onClick={() => deleteDungeonGroup(g.id)} style={{ fontSize: 12, padding: '6px 12px' }}>🗑</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>PVP</h3>
                        {pvpGroups.length === 0 ? (
                            <div className="empty-state" style={{ padding: 18 }}>
                                <div className="empty-state-icon">⚔</div>
                                <h3>Sin grupos PVP</h3>
                                <p>No has creado enfrentamientos PVP.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {pvpGroups.map((g: any) => (
                                    <div key={g.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px 18px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
                                        <div style={{ width: 48, height: 48, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', fontWeight: 800 }}>
                                            {g.pvp_mode}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600 }}>{g.title}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Nv. {g.equipment_band} • {g.server}</div>
                                        </div>
                                        <span style={{ fontSize: 12, color: g.status === 'open' ? '#22c55e' : 'var(--text-muted)', fontWeight: 600 }}>
                                            {g.status === 'open' ? '● Abierto' : g.status === 'full' ? '● Lleno' : '○ Cerrado'}
                                        </span>
                                        <button className="btn btn-danger" onClick={() => deletePvpGroup(g.id)} style={{ fontSize: 12, padding: '6px 12px' }}>🗑</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ---- Wiki posts ----
function WikiPostsTab({ userId }: { userId: string }) {
    const router = useRouter();
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { api.get('/wiki').then(r => setPosts(r.data.filter((p: any) => p.user_id === userId))).finally(() => setLoading(false)); }, [userId]);

    const deletePost = async (id: string) => {
        if (!confirm('¿Eliminar esta guía?')) return;
        await api.delete(`/wiki/${id}`);
        setPosts(prev => prev.filter(p => p.id !== id));
        addToast({ title: '🗑 Guía eliminada' });
    };

    return (
        <div>
            <h2 className="section-title">Mis Posts Wiki</h2>
            {loading ? <div className="spinner" /> : posts.length === 0 ? (
                <div className="empty-state"><div className="empty-state-icon">📖</div><h3>Sin posts</h3><p>Aún no has creado ninguna guía.</p></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {posts.map((p: any) => (
                        <div key={p.id} onClick={() => router.push(`/wiki/${p.id}`)} style={{ padding: '14px 18px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>{p.title}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.dungeon_name}</div>
                            </div>
                            <button
                                className="btn btn-danger"
                                onClick={(e) => { e.stopPropagation(); deletePost(p.id); }}
                                style={{ fontSize: 12, padding: '6px 12px' }}
                            >
                                🗑
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
