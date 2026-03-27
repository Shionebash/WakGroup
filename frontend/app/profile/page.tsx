'use client';
import type { ReactNode } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, getAssetUrl } from '@/lib/api';
import { addToast } from '@/components/ToastContainer';
import CustomSelect from '@/components/CustomSelect';
import { useLanguage } from '@/lib/language-context';
import { t } from '@/lib/translations';

const ROLES = ['dps', 'healer', 'tank', 'support', 'invocador', 'posicionador'];
const SERVERS = ['Ogrest', 'Rubilax', 'Pandora'];
const CLASSES_LABELS: Record<number, string> = {
    1: 'Feca', 2: 'Osamodas', 3: 'Anutrof', 4: 'Sram', 5: 'Xelor', 6: 'Zurcarak',
    7: 'Aniripsa', 8: 'Yopuka', 9: 'Ocra', 10: 'Sadida', 11: 'Sacrogito', 12: 'Pandawa',
    13: 'Tymador', 14: 'Zobal', 15: 'Ouginak', 16: 'Steamer', 18: 'Selotrop', 19: 'Hipermago',
};

type Tab = 'chars' | 'sent' | 'incoming' | 'groups' | 'wiki';

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
    const { language } = useLanguage();
    const tabOptions: Array<{ key: Tab; label: string; eyebrow: string; icon: string }> = [
        { key: 'chars', label: t('profile.characters', language), eyebrow: t('profile.tabCharsEyebrow', language), icon: '01' },
        { key: 'sent', label: t('profile.tabSent', language), eyebrow: t('profile.tabSentEyebrow', language), icon: '02' },
        { key: 'incoming', label: t('profile.tabIncoming', language), eyebrow: t('profile.tabIncomingEyebrow', language), icon: '03' },
        { key: 'groups', label: t('profile.tabGroups', language), eyebrow: t('profile.tabGroupsEyebrow', language), icon: '04' },
        { key: 'wiki', label: 'Wiki', eyebrow: t('profile.tabWikiEyebrow', language), icon: '05' },
    ];
    const [tab, setTab] = useState<Tab>('chars');
    const activeTab = tabOptions.find((entry) => entry.key === tab) || tabOptions[0];

    if (authLoading) {
        return <div className="container" style={{ paddingTop: 60 }}><div className="spinner" /></div>;
    }

    if (!user) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        return (
            <div className="container" style={{ paddingTop: 80, textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)' }}>{t('profile.loginRequired', language)}</p>
                <a href={`${apiUrl}/auth/discord`} className="btn btn-primary" style={{ display: 'inline-flex', marginTop: 20 }}>
                    {t('profile.loginDiscord', language)}
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
                        <span className="profile-hero-eyebrow">{t('profile.heroEyebrow', language)}</span>
                        <h1 className="profile-hero-title">{user.username}</h1>
                        <p className="profile-hero-description">{t('profile.heroDescription', language)}</p>
                        <div className="profile-hero-tags">
                            <span className="profile-hero-tag">{t('profile.tagDiscord', language)}</span>
                            <span className="profile-hero-tag">{t('profile.tagModes', language)}</span>
                            <span className="profile-hero-tag">{t('profile.tagAccount', language)}</span>
                        </div>
                    </div>
                </div>

                <div className="profile-hero-side">
                    <div className="profile-hero-stat">
                        <span className="profile-hero-stat-label">{t('profile.activeSection', language)}</span>
                        <strong className="profile-hero-stat-value">{activeTab.label}</strong>
                        <span className="profile-hero-stat-note">{activeTab.eyebrow}</span>
                    </div>
                    <div className="profile-hero-stat">
                        <span className="profile-hero-stat-label">{t('profile.accountStatus', language)}</span>
                        <strong className="profile-hero-stat-value">{t('profile.readyToPlay', language)}</strong>
                        <span className="profile-hero-stat-note">{t('profile.accountNote', language)}</span>
                    </div>
                </div>
            </section>

            <section className="profile-tabs-shell">
                <div className="profile-tabs-head">
                    <div>
                        <h2 className="filters-title" style={{ marginBottom: 4 }}>{t('profile.centerTitle', language)}</h2>
                        <p className="filters-subtitle">{t('profile.centerSubtitle', language)}</p>
                    </div>
                    <span className="results-chip">{t('profile.sectionsCount', language).replace('{count}', String(tabOptions.length))}</span>
                </div>

                <div className="profile-tab-grid">
                    {tabOptions.map((entry) => (
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
                    <span className="profile-content-badge">{t('profile.badge', language)}</span>
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
    const { language } = useLanguage();
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
                addToast({ title: t('profile.characterAdded', language) });
            } else if (editingId) {
                await api.put(`/characters/${editingId}`, form);
                addToast({ title: t('profile.characterUpdated', language) });
            }
            fetchChars();
            setFormMode(null);
            setEditingId(null);
            setForm({ name: '', level: 1, class_id: 1, role: 'dps', server: 'Ogrest' });
        } catch (error: any) {
            addToast({ title: t('common.error', language), body: error.response?.data?.error });
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
        if (!confirm(t('profile.deleteCharacterConfirm', language))) return;
        await api.delete(`/characters/${id}`);
        fetchChars();
        addToast({ title: t('profile.characterDeleted', language) });
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
                title={t('profile.charactersTitle', language)}
                action={(
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setForm({ name: '', level: 1, class_id: 1, role: 'dps', server: 'Ogrest' });
                            setEditingId(null);
                            setFormMode('add');
                        }}
                    >
                        {t('profile.addCharacter', language)}
                    </button>
                )}
            />

            {formMode && (
                <div className="profile-editor-card">
                    <h3 style={{ fontFamily: 'Cinzel', fontSize: 16, marginBottom: 16, color: 'var(--primary-color)' }}>
                        {formMode === 'add' ? t('profile.newCharacter', language) : t('profile.editCharacter', language)}
                    </h3>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{t('profile.nameLabel', language)}</label>
                            <input className="form-input" value={form.name} onChange={(event) => setField('name', event.target.value)} maxLength={50} placeholder={t('profile.namePlaceholder', language)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('profile.levelLabel', language)}</label>
                            <input className="form-input" type="number" min={1} max={245} value={form.level} onChange={(event) => setField('level', Number(event.target.value))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('profile.classLabel', language)}</label>
                            <CustomSelect value={String(form.class_id)} onChange={(value) => setField('class_id', Number(value))} options={classes.map((item) => ({ value: String(item.id), label: item.name }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('profile.roleLabel', language)}</label>
                            <CustomSelect value={form.role} onChange={(value) => setField('role', value)} options={ROLES.map((role) => ({ value: role, label: role.charAt(0).toUpperCase() + role.slice(1) }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('profile.serverLabel', language)}</label>
                            <CustomSelect value={form.server} onChange={(value) => setField('server', value)} options={SERVERS.map((server) => ({ value: server, label: server }))} />
                        </div>
                    </div>
                    <div className="profile-inline-actions">
                        <button className="btn btn-secondary" onClick={() => { setFormMode(null); setEditingId(null); }}>{t('common.cancel', language)}</button>
                        <button className="btn btn-primary" onClick={saveChar} disabled={saving}>
                            {saving ? t('wiki.saving', language) : formMode === 'add' ? t('profile.saveCharacter', language) : t('profile.updateCharacter', language)}
                        </button>
                    </div>
                </div>
            )}

            {loading ? <div className="spinner" /> : chars.length === 0 ? (
                <EmptyPanel title={t('profile.emptyCharactersTitle', language)} body={t('profile.emptyCharactersBody', language)} />
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
                                <div className="profile-record-subtitle">{t('common.levelShort', language)} {char.level} {char.class_name} - {char.server}</div>
                            </div>
                            <span style={{ fontSize: 12, color: ROLE_COLORS[char.role], background: `${ROLE_COLORS[char.role]}22`, padding: '5px 11px', borderRadius: 999, fontWeight: 700 }}>
                                {char.role.charAt(0).toUpperCase() + char.role.slice(1)}
                            </span>
                            <div className="profile-card-actions">
                                <button className="btn btn-secondary" onClick={() => startEdit(char)} style={{ fontSize: 12, padding: '8px 12px' }}>{t('common.edit', language)}</button>
                                <button className="btn btn-danger" onClick={() => deleteChar(char.id)} style={{ fontSize: 12, padding: '8px 12px' }}>{t('common.delete', language)}</button>
                            </div>
                        </RecordCard>
                    ))}
                </div>
            )}
        </div>
    );
}

function SentApplicationsTab() {
    const { language } = useLanguage();
    const [apps, setApps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/applications/mine').then((response) => setApps(response.data)).finally(() => setLoading(false));
    }, []);

    const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
        pending: { color: '#f59e0b', bg: '#f59e0b22', label: t('profile.pending', language) },
        accepted: { color: '#22c55e', bg: '#22c55e22', label: t('profile.accepted', language) },
        rejected: { color: '#ef4444', bg: '#ef444422', label: t('profile.rejected', language) },
    };

    return (
        <div className="profile-section-stack">
            {loading ? <div className="spinner" /> : apps.length === 0 ? (
                <EmptyPanel title={t('profile.sentEmptyTitle', language)} body={t('profile.sentEmptyBody', language)} />
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
    const { language } = useLanguage();
    const [apps, setApps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchApps = useCallback(() => {
        api.get('/applications/incoming').then((response) => setApps(response.data)).finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchApps(); }, [fetchApps]);

    const handleAction = async (appId: string, action: 'accepted' | 'rejected') => {
        await api.patch(`/applications/${appId}`, { action });
        addToast({ title: action === 'accepted' ? t('profile.applicationAccepted', language) : t('profile.applicationRejected', language) });
        fetchApps();
    };

    return (
        <div className="profile-section-stack">
            {loading ? <div className="spinner" /> : apps.length === 0 ? (
                <EmptyPanel title={t('profile.incomingEmptyTitle', language)} body={t('profile.incomingEmptyBody', language)} />
            ) : (
                <div className="profile-list-grid">
                    {apps.map((app: any) => (
                        <RecordCard key={app.id}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="https://cdn.discordapp.com/embed/avatars/0.png" alt="" width={44} height={44} className="avatar" />
                            <div className="profile-record-main">
                                <div className="profile-record-title">{app.applicant_username}</div>
                                <div className="profile-record-subtitle">
                                    {app.char_name} - {t('common.levelShort', language)} {app.level} {app.class_name} - {app.role} - {app.group_title}
                                </div>
                            </div>
                            <div className="profile-card-actions">
                                <button className="btn btn-secondary" style={{ fontSize: 12, padding: '8px 12px' }} onClick={() => handleAction(app.id, 'accepted')}>{t('group.accept', language)}</button>
                                <button className="btn btn-danger" style={{ fontSize: 12, padding: '8px 12px' }} onClick={() => handleAction(app.id, 'rejected')}>{t('group.reject', language)}</button>
                            </div>
                        </RecordCard>
                    ))}
                </div>
            )}
        </div>
    );
}

function GroupsHistoryTab({ userId }: { userId: string }) {
    const { language } = useLanguage();
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
        if (!confirm(t('profile.deleteDungeonGroupConfirm', language))) return;
        await api.delete(`/groups/${id}`);
        addToast({ title: t('profile.groupDeleted', language) });
        fetchGroups();
    };

    const deletePvpGroup = async (id: string) => {
        if (!confirm(t('profile.deletePvpGroupConfirm', language))) return;
        await api.delete(`/pvp-groups/${id}`);
        addToast({ title: t('profile.pvpDeleted', language) });
        fetchGroups();
    };

    return (
        <div className="profile-section-stack">
            {loading ? <div className="spinner" /> : (
                <>
                    <div className="profile-subsection">
                        <h3 className="profile-subsection-title">{t('profile.dungeonGroupsTitle', language)}</h3>
                        {dungeonGroups.length === 0 ? (
                            <EmptyPanel compact title={t('profile.emptyDungeonGroupsTitle', language)} body={t('profile.emptyDungeonGroupsBody', language)} />
                        ) : (
                            <div className="profile-list-grid">
                                {dungeonGroups.map((group: any) => (
                                    <RecordCard key={group.id}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={getAssetUrl(group.dungeon_image)} alt="" width={52} height={52} className="profile-record-media is-cover" />
                                        <div className="profile-record-main">
                                            <div className="profile-record-title">{group.title}</div>
                                            <div className="profile-record-subtitle">{group.dungeon_name} - {group.server} - {t('common.stasis', language)} {group.stasis}</div>
                                        </div>
                                        <span style={{ fontSize: 12, color: group.status === 'open' ? '#22c55e' : 'var(--text-secondary)', fontWeight: 700 }}>
                                            {group.status === 'open' ? t('common.open', language) : group.status === 'full' ? t('common.full', language) : t('common.closed', language)}
                                        </span>
                                        <button className="btn btn-danger" onClick={() => deleteDungeonGroup(group.id)} style={{ fontSize: 12, padding: '8px 12px' }}>{t('common.delete', language)}</button>
                                    </RecordCard>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="profile-subsection">
                        <h3 className="profile-subsection-title">{t('profile.pvpGroupsTitle', language)}</h3>
                        {pvpGroups.length === 0 ? (
                            <EmptyPanel compact title={t('profile.emptyPvpGroupsTitle', language)} body={t('profile.emptyPvpGroupsBody', language)} />
                        ) : (
                            <div className="profile-list-grid">
                                {pvpGroups.map((group: any) => (
                                    <RecordCard key={group.id}>
                                        <div className="profile-record-media profile-record-mode">{group.pvp_mode}</div>
                                        <div className="profile-record-main">
                                            <div className="profile-record-title">{group.title}</div>
                                            <div className="profile-record-subtitle">{t('common.levelShort', language)} {group.equipment_band} - {group.server}</div>
                                        </div>
                                        <span style={{ fontSize: 12, color: group.status === 'open' ? '#22c55e' : 'var(--text-secondary)', fontWeight: 700 }}>
                                            {group.status === 'open' ? t('common.open', language) : group.status === 'full' ? t('common.full', language) : t('common.closed', language)}
                                        </span>
                                        <button className="btn btn-danger" onClick={() => deletePvpGroup(group.id)} style={{ fontSize: 12, padding: '8px 12px' }}>{t('common.delete', language)}</button>
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
    const { language } = useLanguage();
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/wiki').then((response) => setPosts(response.data.filter((post: any) => post.user_id === userId))).finally(() => setLoading(false));
    }, [userId]);

    const deletePost = async (id: string) => {
        if (!confirm(t('profile.deleteGuideConfirm', language))) return;
        await api.delete(`/wiki/${id}`);
        setPosts((prev) => prev.filter((post) => post.id !== id));
        addToast({ title: t('profile.guideDeleted', language) });
    };

    return (
        <div className="profile-section-stack">
            {loading ? <div className="spinner" /> : posts.length === 0 ? (
                <EmptyPanel title={t('profile.emptyPostsTitle', language)} body={t('profile.emptyPostsBody', language)} />
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
                                {t('common.delete', language)}
                            </button>
                        </RecordCard>
                    ))}
                </div>
            )}
        </div>
    );
}
