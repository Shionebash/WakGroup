'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useChat } from '@/lib/chat-context';

interface GroupDetailModalProps {
    groupId: string;
    onClose: () => void;
}

export default function GroupDetailModal({ groupId, onClose }: GroupDetailModalProps) {
    const { user } = useAuth();
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
                setError('Error al cargar grupo');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [groupId]);

    const handleApply = async () => {
        if (!selectedCharId) {
            setError('Selecciona un personaje');
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
            setError(err.response?.data?.error || 'Error al enviar solicitud');
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
                    <div className="modal-body">Cargando...</div>
                ) : !group ? (
                    <div className="modal-body">Grupo no encontrado</div>
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
                                    <span className="detail-label">Nivel Requerido:</span>
                                    <span className="detail-value">{group.dungeon_lvl}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Stasis:</span>
                                    <span className="detail-value">{group.stasis}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Servidor:</span>
                                    <span className="detail-value">{group.server}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Estado:</span>
                                    <span className="detail-value">
                                        {group.status === 'open' ? '🟢 Abierto' : '🔴 Lleno'}
                                    </span>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h4>Miembros</h4>
                                <div className="members-list">

                                    <div className="member-item">
                                        <span className="member-label">Líder:</span>
                                        {group.leader_class_icon && (
                                            <img src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${group.leader_class_icon}`} alt="" className="class-icon" />
                                        )}
                                        <span className="member-name">{group.leader_username}</span>
                                        <span className="member-role">{group.leader_class_name}</span>
                                    </div>
                                    {/* Add group members here if available */}
                                    <div className="member-item">
                                        <span className="member-label">Miembros:</span>
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
                                    <label>Selecciona tu personaje</label>
                                    <select
                                        value={selectedCharId}
                                        onChange={e => setSelectedCharId(e.target.value)}
                                    >
                                        <option value="">Elige un personaje</option>
                                        {characters.map(char => (
                                            <option key={char.id} value={char.id}>
                                                {char.name} - {char.class_name} Nv. {char.level}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        
                        {user && group.status === 'open' && (
                            <div className="modal-footer">
                                <button
                                    className="btn btn-secondary"
                                    onClick={onClose}
                                >
                                    Cerrar
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleApply}
                                    disabled={applying || !selectedCharId}
                                >
                                    {applying ? 'Enviando...' : '⚔ Solicitar Unirse'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
