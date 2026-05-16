'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useChat } from '@/lib/chat-context';
import CustomSelect from '@/components/CustomSelect';
import { useLanguage } from '@/lib/language-context';
import { t } from '@/lib/translations';

interface GroupDetailModalProps {
    groupId: string;
    onClose: () => void;
}

export default function GroupDetailModal({ groupId, onClose }: GroupDetailModalProps) {
    const { user } = useAuth();
    const { language } = useLanguage();
    const [group, setGroup] = useState<any>(null);
    const [characters, setCharacters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [selectedCharId, setSelectedCharId] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [isMember, setIsMember] = useState(false);

    useEffect(() => {
        const fetchData = async () => {

            try {
                const [groupRes, charsRes] = await Promise.all([
                    api.get(`/groups/${groupId}`),
                    api.get('/characters').catch(() => ({ data: [] })),
                ]);
                const g = groupRes.data;
                setGroup(g);
                const c = charsRes.data;
                setCharacters(c);
                if (c.length > 0) {
                    setSelectedCharId(c[0].id);
                }
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
    }, [groupId]);

    const handleApply = async () => {
        if (!selectedCharId) {
            setError(t('group.selectCharacterError', language));
            return;
        }

        setApplying(true);
        setError(null);

        try {
            await api.post('/applications', {
                group_id: groupId,
                character_id: selectedCharId,
            });
            setMessage('¡Solicitud enviada!');
            setTimeout(() => onClose(), 1500);
        } catch (err: any) {
            setError(err.response?.data?.error || t('group.errorApply', language));
        } finally {
            setApplying(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-large" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{group?.dungeon_name}</h2>
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
                                    alt={group.dungeon_name}
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
                                <div className="detail-item">
                                    <span className="detail-label">{t('common.server', language)}:</span>
                                    <span className="detail-value">{group.server}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">{t('common.status', language)}:</span>
                                    <span className="detail-value">
                                        {group.status === 'open' ? '🟢 Abierto' : '🔴 Lleno'}
                                    </span>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h4>{t('common.members', language)}</h4>
                                <div className="members-list">

                                    <div className="member-item">
                                        <span className="member-label">{t('common.leader', language)}:</span>
                                        {group.leader_class_icon && (
                                            <img src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${group.leader_class_icon}`} alt="" className="class-icon" />
                                        )}
                                        <span className="member-name">{group.leader_username}</span>
                                        <span className="member-role">{group.leader_class_name}</span>
                                    </div>
                                    {/* Add group members here if available */}
                                    <div className="member-item">
                                        <span className="member-label">{t('common.members', language)}:</span>
                                        {group.member_class_icon && (
                                            <img src={group.member_class_icon} alt="" className="class-icon" />
                                        )}
                                        <span className="member-name">{group.member_username}</span>
                                        <span className="member-role">{group.member_class_name}</span>
                                    </div>
                                </div>
                            </div>

                            {error && <div className="error-message">{error}</div>}
                            {message && <div className="success-message">{message}</div>}

                            {user && group.status === 'open' && (
                                <div className="form-group">
                                    <label>{t('group.selectCharacter', language)}</label>
                                    <CustomSelect
                                        value={selectedCharId}
                                        onChange={e => setSelectedCharId(e)}
                                        placeholder={t('group.selectCharacterPlaceholder', language)}
                                        options={characters.map(char => ({
                                            value: String(char.id),
                                            label: `${char.name} - ${char.class_name} Nv. ${char.level}`,
                                        }))}
                                    />
                                </div>
                            )}
                        </div>
                        
                        {user && group.status === 'open' && (
                            <div className="modal-footer">
                                <button
                                    className="btn btn-secondary"
                                    onClick={onClose}
                                >
                                    {t('common.close', language)}
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleApply}
                                    disabled={applying || !selectedCharId}
                                >
                                    {applying ? t('pvp.sending', language) : `? ${t('group.apply', language)}`}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
