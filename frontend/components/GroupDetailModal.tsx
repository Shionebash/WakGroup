'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useChat } from '@/lib/chat-context';
import { useLanguage } from '@/lib/language-context';
import { api, getAssetUrl } from '@/lib/api';
import { addToast } from '@/components/ToastContainer';
import { t, getItemTitle, getDungeonApiName } from '@/lib/translations';

interface GroupDetailModalProps {
    groupId: string;
    onClose: () => void;
    onDeleted?: () => void;
}

export default function GroupDetailModal({ groupId, onClose, onDeleted }: GroupDetailModalProps) {
    const { user } = useAuth();
    const { openChat } = useChat();
    const { language } = useLanguage();
    const [group, setGroup] = useState<any>(null);
    const [characters, setCharacters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [selectedCharId, setSelectedCharId] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [isMember, setIsMember] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDrops, setShowDrops] = useState(false);
    const [dungeonMeta, setDungeonMeta] = useState<any>(null);
    const [bossDrops, setBossDrops] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [groupRes, charsRes] = await Promise.all([
                    api.get(`/groups/${groupId}`),
                    api.get('/characters').catch(() => ({ data: [] })),
                ]);
                const g = groupRes.data;
                setGroup(g);
                if (g?.dungeon_id) {
                    api.get(`/dungeons/${g.dungeon_id}`).then(r => setDungeonMeta(r.data)).catch(() => setDungeonMeta(null));
                } else {
                    setDungeonMeta(null);
                }
                const c = charsRes.data;
                setCharacters(c);
                if (c.length > 0) setSelectedCharId(c[0].id);
                setIsMember(
                    !!user && (
                        g.leader_user_id === user.id ||
                        g.members?.some((m: any) => m.user_id === user.id)
                    )
                );
            } catch (err: any) {
                console.error('Error detalle:', err.response?.data, err.message);
                setError(t('group.errorLoad', language));
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [groupId, user]);

    const handleApply = async () => {
        if (!selectedCharId) { setError(t('group.selectCharacterError', language)); return; }
        setApplying(true);
        setError(null);
        try {
            await api.post('/applications', { group_id: groupId, character_id: selectedCharId });
            setMessage(t('group.applicationSent', language));
            setTimeout(() => onClose(), 1500);
        } catch (err: any) {
            setError(err.response?.data?.error || t('group.errorApply', language));
        } finally {
            setApplying(false);
        }
    };

    const handleOpenChat = () => {
        if (group) {
            openChat(groupId, dungeonName || t('group.title', language));
            onClose();
        }
    };

    const handleDeleteGroup = async () => {
        if (!confirm(t('group.confirmDelete', language))) return;
        setDeleting(true);
        try {
            await api.delete(`/groups/${groupId}`);
            addToast({ title: t('group.toastDeleted', language) });
            onClose();
            onDeleted?.();
        } catch (err: any) {
            setError(err.response?.data?.error || t('group.errorDelete', language));
        } finally {
            setDeleting(false);
        }
    };

    const handleLeaveGroup = async () => {
        if (!user) return;
        const userChar = characters.find(c => c.user_id === user.id);
        if (!userChar) {
            setError(t('group.errorNoCharacters', language));
            return;
        }
        if (!confirm(t('group.confirmLeave', language))) return;
        try {
            await api.delete(`/groups/${groupId}/members/${userChar.id}`);
            addToast({ title: t('group.toastLeft', language) });
            onClose();
            onDeleted?.();
        } catch (err: any) {
            setError(err.response?.data?.error || t('group.errorLeave', language));
        }
    };

    const handleKickMember = async (characterId: string, charName: string) => {
        if (!confirm(t('group.confirmKick', language).replace('{name}', charName))) return;
        try {
            await api.delete(`/groups/${groupId}/members/${characterId}`);
            addToast({ title: t('group.toastKicked', language).replace('{name}', charName) });
            const groupRes = await api.get(`/groups/${groupId}`);
            setGroup(groupRes.data);
        } catch (err: any) {
            setError(err.response?.data?.error || t('group.errorKick', language));
        }
    };

    const handleLeaveGroupAsLeader = async () => {
        const members = group?.members || [];
        if (members.length === 0) {
            if (!confirm(t('group.confirmClose', language))) return;
            setDeleting(true);
            try {
                await api.delete(`/groups/${groupId}`);
                addToast({ title: t('group.toastClosed', language) });
                onClose();
                onDeleted?.();
            } catch (err: any) {
                setError(err.response?.data?.error || t('group.errorClose', language));
                setDeleting(false);
            }
            return;
        }
        
        const newLeader = members[0];
        if (!confirm(t('group.confirmLeaveLeader', language).replace('{name}', newLeader.char_name))) return;
        
        try {
            await api.delete(`/groups/${groupId}/leader`);
            addToast({ title: t('group.toastTransfer', language).replace('{name}', newLeader.char_name) });
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.error || t('group.errorTransfer', language));
        }
    };

    const handleTransferLeadership = async (newLeaderCharId: string, newLeaderName: string) => {
        if (!confirm(t('group.confirmTransfer', language).replace('{name}', newLeaderName))) return;
        try {
            await api.put(`/groups/${groupId}/transfer-leadership`, { new_leader_character_id: newLeaderCharId });
            addToast({ title: t('group.toastTransfer', language).replace('{name}', newLeaderName) });
            const groupRes = await api.get(`/groups/${groupId}`);
            setGroup(groupRes.data);
        } catch (err: any) {
            setError(err.response?.data?.error || t('group.errorTransfer', language));
        }
    };

    const isLeader = !!user && group?.leader_user_id === user.id;
    const hasSteles = !!dungeonMeta?.steles;
    const bossId = dungeonMeta?.jefeId ? String(dungeonMeta.jefeId) : null;
    const selectedDrops = (() => {
        const raw = group?.steles_drops;
        if (!raw) return [] as number[];
        if (Array.isArray(raw)) return raw.map((v: any) => Number(v)).filter((v: any) => !Number.isNaN(v));
        if (typeof raw === 'string') {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    return parsed.map((v: any) => Number(v)).filter((v: any) => !Number.isNaN(v));
                }
            } catch { /* ignore */ }
        }
        return [] as number[];
    })();
    const selectedDropItems = selectedDrops.length === 0
        ? []
        : selectedDrops.map((itemId: number) => {
            const itemData = bossDrops.find((it: any) => Number(it?.id) === itemId);
            const gfxId = itemData?.graphic_parameters?.gfxId ?? null;
            const title = getItemTitle(itemData, language);
            return { itemId, gfxId, title: title || `Item ${itemId}` };
        });

    const dungeonName = getDungeonApiName(dungeonMeta || group, language) || group?.dungeon_name || group?.title || '';

    useEffect(() => {
        if (!bossId) {
            setBossDrops([]);
            return;
        }
        api.get(`/mobs/${bossId}/drops`)
            .then(r => setBossDrops(r.data || []))
            .catch(() => setBossDrops([]));
    }, [bossId]);
    
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-large" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{dungeonName}</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                {loading ? (
                    <div className="modal-body">{t('common.loading', language)}</div>
                ) : !group ? (
                    <div className="modal-body">{t('group.noGroups', language)}</div>
                ) : (
                    <>
                        <div className="modal-body">
                            {group.dungeon_image && (
                                <img
                                    src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${group.dungeon_image}`}
                                    alt={dungeonName}
                                    className="detail-image"
                                />
                            )}

                            {group.title && (
                                <div className="detail-section">
                                    <h3>{group.title}</h3>
                                </div>
                            )}

                            {group.description && (
                                <div className="detail-section">
                                    <p>{group.description}</p>
                                </div>
                            )}

                            <div className="detail-grid">
                                <div className="detail-item">
                                    <span className="detail-label">{t('common.requiredLevel', language)}:</span>
                                    <span className="detail-value">{group.dungeon_lvl}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">{t('common.stasis', language)}:</span>
                                    <span className="detail-value">{group.stasis}</span>
                                </div>
                                {hasSteles && (
                                    <div className="detail-item">
                                        <span className="detail-label">{t('common.steles', language)}:</span>
                                        <span className="detail-value">
                                            {group.steles_active ? `${t('common.yes', language)} (${group.steles_count})` : t('common.no', language)}
                                        </span>
                                    </div>
                                )}
                                {dungeonMeta?.intervention && (
                                    <div className="detail-item">
                                        <span className="detail-label">{t('common.intervention', language)}:</span>
                                        <span className="detail-value">{group.intervention_active ? t('common.yes', language) : t('common.no', language)}</span>
                                    </div>
                                )}
                                <div className="detail-item">
                                    <span className="detail-label">{t('common.server', language)}:</span>
                                    <span className="detail-value">{group.server}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">{t('common.status', language)}:</span>
                                    <span className="detail-value">
                                        {group.status === 'open' ? `🟢 ${t('common.open', language)}` : `🔴 ${t('common.full', language)}`}
                                    </span>
                                </div>
                            </div>

                            {hasSteles && group.steles_active && (
                                <div className="detail-section" style={{ marginTop: 10 }}>
                                    <button
                                        className="btn btn-ghost"
                                        type="button"
                                        onClick={() => setShowDrops(v => !v)}
                                    >
                                        {showDrops ? t('group.dropsHide', language) : t('group.dropsShow', language)}
                                    </button>
                                    {showDrops && (
                                        <div style={{ marginTop: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
                                            <div style={{ fontWeight: 700, marginBottom: 8 }}>{t('group.bossDrops', language)}</div>
                                            {selectedDropItems.length === 0 ? (
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('group.noDrops', language)}</div>
                                            ) : (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8 }}>
                                                    {selectedDropItems.map((d: any) => {
                                                        const imgPath = d.gfxId ? `assets/items/${d.gfxId}.png` : 'assets/items/0000000.png';
                                                        return (
                                                            <div key={`${d.itemId}-${d.dropRate}`} style={{ textAlign: 'center' }}>
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img
                                                                    src={getAssetUrl(imgPath)}
                                                                    alt={`Item ${d.itemId}`}
                                                                    title={d.title}
                                                                    style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--bg-dark)', display: 'block', margin: '0 auto' }}
                                                                />
                                                                <div style={{ fontSize: 9, color: 'var(--text-primary)', marginTop: 4, lineHeight: 1.2, wordBreak: 'break-word' }}>{d.title}</div>
                                                                <div style={{ fontSize: 9, color: '#ffffff', marginTop: 2 }}>{d.dropRate}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="detail-section">
                                <h4>{t('group.membersTitle', language).replace('{count}', String((group.members?.length || 0) + 1)).replace('{max}', String(group.max_players || 6))}</h4>
                                <div className="members-list">
                                    <div className="member-item">
                                        {group.leader_class_icon && (
                                            <img src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${group.leader_class_icon}`} alt="" className="class-icon" />
                                        )}
                                        <span className="member-name">{group.leader_name}</span>
                                        <span className="member-role">{group.leader_class_name}</span>
                                        <span className="badge" style={{ marginLeft: 'auto', background: 'var(--primary-color)', color: 'var(--background)', fontSize: 10, padding: '2px 6px' }}>{t('common.leader', language)}</span>
                                    </div>
                                    {group.members?.map((m: any) => (
                                        <div key={m.membership_id} className="member-item">
                                            {m.class_icon && (
                                                <img src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${m.class_icon}`} alt="" className="class-icon" />
                                            )}
                                            <span className="member-name">{m.char_name}</span>
                                            <span className="member-role">{m.class_name}</span>
                                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 4 }}>{m.role}</span>
                                            {isLeader && (
                                                <button
                                                    onClick={() => handleKickMember(m.char_id, m.char_name)}
                                                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px 6px' }}
                                                    title={t('group.kick', language)}
                                                >
                                                    👢
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Open chat button for members */}
                            {isMember && (
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleOpenChat}
                                    style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
                                >
                                    💬 {t('group.openChat', language)}
                                </button>
                            )}

                            {!isMember && user && (
                                <div style={{
                                    marginTop: 8, padding: '10px 14px',
                                    background: 'var(--background)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 8, fontSize: 12,
                                    color: 'var(--text-secondary)',
                                    display: 'flex', alignItems: 'center', gap: 8,
                                }}>
                                    🔒 {t('group.chatLocked', language)}
                                </div>
                            )}

                            {error && <div className="error-message" style={{ marginTop: 12 }}>{error}</div>}
                            {message && <div className="success-message" style={{ marginTop: 12 }}>{message}</div>}

                            {user && group.status === 'open' && !isMember && (
                                <div className="form-group" style={{ marginTop: 16 }}>
                                    <label>{t('group.selectCharacter', language)}</label>
                                    <select value={selectedCharId} onChange={e => setSelectedCharId(e.target.value)}>
                                        <option value="">{t('group.selectCharacterPlaceholder', language)}</option>
                                        {characters.map(char => (
                                            <option key={char.id} value={char.id}>
                                                {char.name} - {char.class_name} Nv. {char.level}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {user && group.status === 'open' && !isMember && (
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={onClose}>{t('common.close', language)}</button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleApply}
                                    disabled={applying || !selectedCharId}
                                >
                                    {applying ? t('common.loading', language) : `⚔ ${t('group.apply', language)}`}
                                </button>
                            </div>
                        )}

                            {isLeader && (
                            <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
                                <button className="btn btn-danger" onClick={handleDeleteGroup} disabled={deleting}>
                                    {deleting ? t('group.deleting', language) : t('group.delete', language)}
                                </button>
                            </div>
                        )}

                        {isLeader && (
                            <div className="modal-footer" style={{ flexDirection: 'column', gap: 8 }}>
                                {group?.members && group.members.length > 0 && (
                                    <select 
                                        className="form-select"
                                        style={{ fontSize: 12 }}
                                        onChange={(e) => { 
                                            if (e.target.value) { 
                                                handleTransferLeadership(e.target.value, group.members.find((m: any) => m.char_id === e.target.value)?.char_name); 
                                                e.target.value = ''; 
                                            } 
                                        }}
                                    >
                                        <option value="">{t('group.transfer', language)}</option>
                                        {group.members.map((m: any) => (
                                            <option key={m.char_id} value={m.char_id}>{m.char_name}</option>
                                        ))}
                                    </select>
                                )}
                                <button className="btn btn-warning" onClick={handleLeaveGroupAsLeader} style={{ color: '#000' }}>
                                    🚪 {t('group.leaveAndTransfer', language)}
                                </button>
                            </div>
                        )}

                        {isMember && !isLeader && (
                            <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
                                <button className="btn btn-danger" onClick={handleLeaveGroup}>
                                    🚪 {t('group.leave', language)}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
