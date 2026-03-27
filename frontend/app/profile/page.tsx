'use client';
import type { ReactNode } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, getAssetUrl } from '@/lib/api';
import { addToast } from '@/components/ToastContainer';
import CustomSelect from '@/components/CustomSelect';

const ROLES = ['dps', 'healer', 'tank', 'support', 'invocador', 'posicionador'];
const SERVERS = ['Ogrest', 'Rubilax', 'Pandora'];
const CLASSES_LABELS: Record<number, string> = {
    1: 'Feca', 2: 'Osamodas', 3: 'Anutrof', 4: 'Sram', 5: 'Xelor', 6: 'Zurcarak',
    7: 'Aniripsa', 8: 'Yopuka', 9: 'Ocra', 10: 'Sadida', 11: 'Sacrogito', 12: 'Pandawa',
    13: 'Tymador', 14: 'Zobal', 15: 'Ouginak', 16: 'Steamer', 18: 'Selotrop', 19: 'Hipermago',
};

type Tab = 'chars' | 'sent' | 'incoming' | 'groups' | 'wiki';

const TAB_OPTIONS: Array<{ key: Tab; label: string; eyebrow: string; icon: string }> = [
    { key: 'chars', label: 'Personajes', eyebrow: 'Builds y roles', icon: '01' },
    { key: 'sent', label: 'Solicitudes enviadas', eyebrow: 'Tu actividad', icon: '02' },
    { key: 'incoming', label: 'Solicitudes recibidas', eyebrow: 'Gestion del lider', icon: '03' },
    { key: 'groups', label: 'Grupos creados', eyebrow: 'Historial activo', icon: '04' },
    { key: 'wiki', label: 'Wiki', eyebrow: 'Guias publicadas', icon: '05' },
];

function EmptyPanel({ title, body, compact = false }: { title: string; body: string; compact?: boolean }) {
    return (
        <div className={`empty-state profile-empty-state ${compact ? 'is-compact' : ''}`}>
            <div className="empty-state-icon">WG</div>
            <h3>{title}</h3>
            <p>{body}</p>
        </div>
    );
}

function SectionIntro({ title, action }: { title: string; action?: ReactNode }) {
    return (
        <div className="profile-section-head">
            <h2 className="section-title" style={{ marginBottom: 0 }}>{title}</h2>
            {action}
        </div>
    );
}

function RecordCard({ children, clickable = false, onClick }: { children: ReactNode; clickable?: boolean; onClick?: () => void }) {
    return (
        <div className={`profile-record-card ${clickable ? 'is-clickable' : ''}`} onClick={onClick}>
            {children}
        </div>
    );
}

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const [tab, setTab] = useState<Tab>('chars');
    const activeTab = TAB_OPTIONS.find((entry) => entry.key === tab) || TAB_OPTIONS[0];

    if (authLoading) {
        return <div className="container" style={{ paddingTop: 60 }}><div className="spinner" /></div>;
    }

    if (!user) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        return (
            <div className="container" style={{ paddingTop: 80, textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)' }}>Debes iniciar sesion para ver tu perfil.</p>
                <a href={`${apiUrl}/auth/discord`} className="btn btn-primary" style={{ display: 'inline-flex', marginTop: 20 }}>
                    Iniciar sesion con Discord
                </a>
            </div>
        );
    }

    return (
        <div className="container profile-page-shell" style={{ paddingTop: 32, paddingBottom: 48, maxWidth: 1080 }}>
            <section className="profile-hero">
                <div className="profile-hero-main">
                    <div className="profile-avatar-frame">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={`https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png`}
                            alt={user.username}
                            width={96}
                            height={96}
                            className="profile-hero-avatar"
                            onError={(event) => {
                                (event.target as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                            }}
                        />
                    </div>
                    <div className="profile-hero-copy">
                        <span className="profile-hero-eyebrow">Panel de perfil</span>
                        <h1 className="profile-hero-title">{user.username}</h1>
                        <p className="profile-hero-description">
                            Un espacio mas claro para gestionar personajes, solicitudes, grupos creados y publicaciones de la comunidad.
                        </p>
                        <div className="profile-hero-tags">
                            <span className="profile-hero-tag">Discord conectado</span>
                            <span className="profile-hero-tag">PvE y PvP</span>
                            <span className="profile-hero-tag">Cuenta WakGroup</span>
                        </div>
                    </div>
                </div>

                <div className="profile-hero-side">
                    <div className="profile-hero-stat">
                        <span className="profile-hero-stat-label">Seccion activa</span>
                        <strong className="profile-hero-stat-value">{activeTab.label}</strong>
                        <span className="profile-hero-stat-note">{activeTab.eyebrow}</span>
                    </div>
                    <div className="profile-hero-stat">
                        <span className="profile-hero-stat-label">Estado de cuenta</span>
                        <strong className="profile-hero-stat-value">Lista para jugar</strong>
                        <span className="profile-hero-stat-note">Tu progreso y actividad quedan reunidos en una sola interfaz.</span>
                    </div>
                </div>
            </section>

            <section className="profile-tabs-shell">
                <div className="profile-tabs-head">
                    <div>
                        <h2 className="filters-title" style={{ marginBottom: 4 }}>Centro de aventura</h2>
                        <p className="filters-subtitle">Selecciona la vista que quieres revisar o administrar.</p>
                    </div>
                    <span className="results-chip">{TAB_OPTIONS.length} secciones</span>
                </div>

                <div className="profile-tab-grid">
                    {TAB_OPTIONS.map((entry) => (
                        <button
                            key={entry.key}
                            className={`profile-tab-card ${tab === entry.key ? 'active' : ''}`}
                            onClick={() => setTab(entry.key)}
                        >
                            <span className="profile-tab-icon">{entry.icon}</span>
                            <span className="profile-tab-copy">
                                <strong>{entry.label}</strong>
                                <small>{entry.eyebrow}</small>
                            </span>
                        </button>
                    ))}
                </div>
            </section>

            <section className="profile-content-shell">
                <div className="profile-content-head">
                    <div>
                        <span className="profile-content-eyebrow">{activeTab.eyebrow}</span>
                        <h2 className="section-title" style={{ marginBottom: 0 }}>{activeTab.label}</h2>
                    </div>
                    <span className="profile-content-badge">Perfil WakGroup</span>
                </div>

                {tab === 'chars' && <CharactersTab userId={user.id} />}
                {tab === 'sent' && <SentApplicationsTab />}
                {tab === 'incoming' && <IncomingApplicationsTab />}
                {tab === 'groups' && <GroupsHistoryTab userId={user.id} />}
                {tab === 'wiki' && <WikiPostsTab userId={user.id} />}
            </section>
        </div>
    );
}

function CharactersTab({ userId }: { userId: string }) {
    const [chars, setChars] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [classes, setClasses] = useState<any[]>([]);
    const [form, setForm] = useState({ name: '', level: 1, class_id: 1, role: 'dps', server: 'Ogrest' });
    const [saving, setSaving] = useState(false);
    const setField = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

    const fetchChars = useCallback(() => {
        api.get('/characters').then((response) => setChars(response.data)).finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchChars(); }, [fetchChars]);
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
                addToast({ title: 'Personaje anadido' });
            } else if (editingId) {
                await api.put(`/characters/${editingId}`, form);
                addToast({ title: 'Personaje actualizado' });
            }
            fetchChars();
            setFormMode(null);
            setEditingId(null);
            setForm({ name: '', level: 1, class_id: 1, role: 'dps', server: 'Ogrest' });
        } catch (error: any) {
            addToast({ title: 'Error', body: error.response?.data?.error });
        } finally {
            setSaving(false);
        }
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
        if (!confirm('Eliminar personaje?')) return;
        await api.delete(`/characters/${id}`);
        fetchChars();
        addToast({ title: 'Personaje eliminado' });
    };

    const ROLE_COLORS: Record<string, string> = {
        dps: '#ef4444',
        healer: '#22c55e',
        tank: '#3b82f6',
        support: '#f59e0b',
        invocador: '#8b5cf6',
        posicionador: '#ec4899',
    };

    return (
        <div className="profile-section-stack">
            <SectionIntro
                title="Mis personajes"
                action={(
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setForm({ name: '', level: 1, class_id: 1, role: 'dps', server: 'Ogrest' });
                            setEditingId(null);
                            setFormMode('add');
                        }}
                    >
                        Anadir personaje
                    </button>
                )}
            />

            {formMode && (
                <div className="profile-editor-card">
                    <h3 style={{ fontFamily: 'Cinzel', fontSize: 16, marginBottom: 16, color: 'var(--primary-color)' }}>
                        {formMode === 'add' ? 'Nuevo personaje' : 'Editar personaje'}
                    </h3>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Nombre *</label>
                            <input className="form-input" value={form.name} onChange={(event) => setField('name', event.target.value)} maxLength={50} placeholder="Nombre del personaje" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nivel *</label>
                            <input className="form-input" type="number" min={1} max={245} value={form.level} onChange={(event) => setField('level', Number(event.target.value))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Clase *</label>
                            <CustomSelect value={String(form.class_id)} onChange={(value) => setField('class_id', Number(value))} options={classes.map((item) => ({ value: String(item.id), label: item.name }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Rol *</label>
                            <CustomSelect value={form.role} onChange={(value) => setField('role', value)} options={ROLES.map((role) => ({ value: role, label: role.charAt(0).toUpperCase() + role.slice(1) }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Servidor *</label>
                            <CustomSelect value={form.server} onChange={(value) => setField('server', value)} options={SERVERS.map((server) => ({ value: server, label: server }))} />
                        </div>
                    </div>
                    <div className="profile-inline-actions">
                        <button className="btn btn-secondary" onClick={() => { setFormMode(null); setEditingId(null); }}>Cancelar</button>
                        <button className="btn btn-primary" onClick={saveChar} disabled={saving}>
                            {saving ? 'Guardando...' : formMode === 'add' ? 'Guardar personaje' : 'Actualizar personaje'}
                        </button>
                    </div>
                </div>
            )}

            {loading ? <div className="spinner" /> : chars.length === 0 ? (
                <EmptyPanel title="Sin personajes" body="Anade tu primer personaje para unirte a grupos." />
            ) : (
                <div className="profile-list-grid">
                    {chars.map((char: any) => (
                        <RecordCard key={char.id}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={getAssetUrl(char.class_icon)}
                                alt=""
                                width={48}
                                height={48}
                                className="profile-record-media"
                                onError={(event) => { (event.target as HTMLImageElement).style.opacity = '0'; }}
                            />
                            <div className="profile-record-main">
                                <div className="profile-record-title">{char.name}</div>
                                <div className="profile-record-subtitle">Nv. {char.level} {char.class_name} - {char.server}</div>
                            </div>
                            <span style={{ fontSize: 12, color: ROLE_COLORS[char.role], background: `${ROLE_COLORS[char.role]}22`, padding: '5px 11px', borderRadius: 999, fontWeight: 700 }}>
                                {char.role.charAt(0).toUpperCase() + char.role.slice(1)}
                            </span>
                            <div className="profile-card-actions">
                                <button className="btn btn-secondary" onClick={() => startEdit(char)} style={{ fontSize: 12, padding: '8px 12px' }}>Editar</button>
                                <button className="btn btn-danger" onClick={() => deleteChar(char.id)} style={{ fontSize: 12, padding: '8px 12px' }}>Eliminar</button>
                            </div>
                        </RecordCard>
                    ))}
                </div>
            )}
        </div>
    );
}

function SentApplicationsTab() {
    const [apps, setApps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/applications/mine').then((response) => setApps(response.data)).finally(() => setLoading(false));
    }, []);

    const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
        pending: { color: '#f59e0b', bg: '#f59e0b22', label: 'Pendiente' },
        accepted: { color: '#22c55e', bg: '#22c55e22', label: 'Aceptado' },
        rejected: { color: '#ef4444', bg: '#ef444422', label: 'Rechazado' },
    };

    return (
        <div className="profile-section-stack">
            {loading ? <div className="spinner" /> : apps.length === 0 ? (
                <EmptyPanel title="Sin solicitudes" body="Aun no has aplicado a ningun grupo." />
            ) : (
                <div className="profile-list-grid">
                    {apps.map((app: any) => {
                        const status = STATUS_STYLE[app.status] || STATUS_STYLE.pending;
                        return (
                            <RecordCard key={app.id}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={getAssetUrl(app.dungeon_image)} alt="" width={52} height={52} className="profile-record-media is-cover" />
                                <div className="profile-record-main">
                                    <div className="profile-record-title">{app.group_title}</div>
                                    <div className="profile-record-subtitle">{app.dungeon_name} - {app.char_name}</div>
                                </div>
                                <span style={{ fontSize: 12, color: status.color, background: status.bg, padding: '5px 11px', borderRadius: 999, fontWeight: 700 }}>
                                    {status.label}
                                </span>
                            </RecordCard>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function IncomingApplicationsTab() {
    const [apps, setApps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchApps = useCallback(() => {
        api.get('/applications/incoming').then((response) => setApps(response.data)).finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchApps(); }, [fetchApps]);

    const handleAction = async (appId: string, action: 'accepted' | 'rejected') => {
        await api.patch(`/applications/${appId}`, { action });
        addToast({ title: action === 'accepted' ? 'Solicitud aceptada' : 'Solicitud rechazada' });
        fetchApps();
    };

    return (
        <div className="profile-section-stack">
            {loading ? <div className="spinner" /> : apps.length === 0 ? (
                <EmptyPanel title="Sin solicitudes" body="No tienes solicitudes pendientes en tus grupos." />
            ) : (
                <div className="profile-list-grid">
                    {apps.map((app: any) => (
                        <RecordCard key={app.id}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="https://cdn.discordapp.com/embed/avatars/0.png" alt="" width={44} height={44} className="avatar" />
                            <div className="profile-record-main">
                                <div className="profile-record-title">{app.applicant_username}</div>
                                <div className="profile-record-subtitle">
                                    {app.char_name} - Nv. {app.level} {app.class_name} - {app.role} - {app.group_title}
                                </div>
                            </div>
                            <div className="profile-card-actions">
                                <button className="btn btn-secondary" style={{ fontSize: 12, padding: '8px 12px' }} onClick={() => handleAction(app.id, 'accepted')}>Aceptar</button>
                                <button className="btn btn-danger" style={{ fontSize: 12, padding: '8px 12px' }} onClick={() => handleAction(app.id, 'rejected')}>Rechazar</button>
                            </div>
                        </RecordCard>
                    ))}
                </div>
            )}
        </div>
    );
}

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
            .then(([dungeonResponse, pvpResponse]) => {
                setDungeonGroups((dungeonResponse.data || []).filter((group: any) => group.leader_user_id === userId));
                setPvpGroups((pvpResponse.data || []).filter((group: any) => group.leader_user_id === userId));
            })
            .finally(() => setLoading(false));
    }, [userId]);

    useEffect(() => { fetchGroups(); }, [fetchGroups]);

    const deleteDungeonGroup = async (id: string) => {
        if (!confirm('Eliminar este grupo de mazmorra?')) return;
        await api.delete(`/groups/${id}`);
        addToast({ title: 'Grupo eliminado' });
        fetchGroups();
    };

    const deletePvpGroup = async (id: string) => {
        if (!confirm('Eliminar este grupo PVP?')) return;
        await api.delete(`/pvp-groups/${id}`);
        addToast({ title: 'Enfrentamiento eliminado' });
        fetchGroups();
    };

    return (
        <div className="profile-section-stack">
            {loading ? <div className="spinner" /> : (
                <>
                    <div className="profile-subsection">
                        <h3 className="profile-subsection-title">Mazmorra</h3>
                        {dungeonGroups.length === 0 ? (
                            <EmptyPanel compact title="Sin grupos de mazmorra" body="No has creado grupos de mazmorra." />
                        ) : (
                            <div className="profile-list-grid">
                                {dungeonGroups.map((group: any) => (
                                    <RecordCard key={group.id}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={getAssetUrl(group.dungeon_image)} alt="" width={52} height={52} className="profile-record-media is-cover" />
                                        <div className="profile-record-main">
                                            <div className="profile-record-title">{group.title}</div>
                                            <div className="profile-record-subtitle">{group.dungeon_name} - {group.server} - Stasis {group.stasis}</div>
                                        </div>
                                        <span style={{ fontSize: 12, color: group.status === 'open' ? '#22c55e' : 'var(--text-secondary)', fontWeight: 700 }}>
                                            {group.status === 'open' ? 'Abierto' : group.status === 'full' ? 'Lleno' : 'Cerrado'}
                                        </span>
                                        <button className="btn btn-danger" onClick={() => deleteDungeonGroup(group.id)} style={{ fontSize: 12, padding: '8px 12px' }}>Eliminar</button>
                                    </RecordCard>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="profile-subsection">
                        <h3 className="profile-subsection-title">PVP</h3>
                        {pvpGroups.length === 0 ? (
                            <EmptyPanel compact title="Sin grupos PVP" body="No has creado enfrentamientos PVP." />
                        ) : (
                            <div className="profile-list-grid">
                                {pvpGroups.map((group: any) => (
                                    <RecordCard key={group.id}>
                                        <div className="profile-record-media profile-record-mode">{group.pvp_mode}</div>
                                        <div className="profile-record-main">
                                            <div className="profile-record-title">{group.title}</div>
                                            <div className="profile-record-subtitle">Nv. {group.equipment_band} - {group.server}</div>
                                        </div>
                                        <span style={{ fontSize: 12, color: group.status === 'open' ? '#22c55e' : 'var(--text-secondary)', fontWeight: 700 }}>
                                            {group.status === 'open' ? 'Abierto' : group.status === 'full' ? 'Lleno' : 'Cerrado'}
                                        </span>
                                        <button className="btn btn-danger" onClick={() => deletePvpGroup(group.id)} style={{ fontSize: 12, padding: '8px 12px' }}>Eliminar</button>
                                    </RecordCard>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function WikiPostsTab({ userId }: { userId: string }) {
    const router = useRouter();
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/wiki').then((response) => setPosts(response.data.filter((post: any) => post.user_id === userId))).finally(() => setLoading(false));
    }, [userId]);

    const deletePost = async (id: string) => {
        if (!confirm('Eliminar esta guia?')) return;
        await api.delete(`/wiki/${id}`);
        setPosts((prev) => prev.filter((post) => post.id !== id));
        addToast({ title: 'Guia eliminada' });
    };

    return (
        <div className="profile-section-stack">
            {loading ? <div className="spinner" /> : posts.length === 0 ? (
                <EmptyPanel title="Sin posts" body="Aun no has creado ninguna guia." />
            ) : (
                <div className="profile-list-grid">
                    {posts.map((post: any) => (
                        <RecordCard key={post.id} clickable onClick={() => router.push(`/wiki/${post.id}`)}>
                            <div className="profile-record-main">
                                <div className="profile-record-title">{post.title}</div>
                                <div className="profile-record-subtitle">{post.dungeon_name}</div>
                            </div>
                            <button
                                className="btn btn-danger"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    deletePost(post.id);
                                }}
                                style={{ fontSize: 12, padding: '8px 12px' }}
                            >
                                Eliminar
                            </button>
                        </RecordCard>
                    ))}
                </div>
            )}
        </div>
    );
}
