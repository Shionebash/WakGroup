'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useChat } from '@/lib/chat-context';
import { useLanguage, Language } from '@/lib/language-context';
import { api } from '@/lib/api';
import { addToast } from '@/components/ToastContainer';
import CustomSelect from '@/components/CustomSelect';
import { t } from '@/lib/translations';

interface PvpGroupDetailModalProps {
    groupId: string;
    onClose: () => void;
    onDeleted?: () => void;
}

const MODE_COLOR: Record<string, string> = {
    '1v1': '#e57373',
    '2v2': '#ffb74d',
    '3v3': '#64b5f6',
    '4v4': '#4db6ac',
    '5v5': '#9575cd',
    '6v6': '#f06292',
};

const SLOTS_PER_TEAM_BY_MODE: Record<string, number> = {
    '1v1': 1,
    '2v2': 2,
    '3v3': 3,
    '4v4': 4,
    '5v5': 5,
    '6v6': 6,
};

export default function PvpGroupDetailModal({ groupId, onClose, onDeleted }: PvpGroupDetailModalProps) {
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
    const [isLeader, setIsLeader] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [draggedCharId, setDraggedCharId] = useState<string | null>(null);
    const [dragOverTeam, setDragOverTeam] = useState<'red' | 'blue' | null>(null);

    const fetchGroup = async () => {
        try {
            const [groupRes, charsRes] = await Promise.all([
                api.get(`/pvp-groups/${groupId}`),
                api.get('/characters').catch(() => ({ data: [] })),
            ]);
            const g = groupRes.data;
            setGroup(g);
            const c = charsRes.data;
            setCharacters(c);
            if (c.length > 0) setSelectedCharId(c[0].id);
            const leader = !!user && g.leader_user_id === user.id;
            const member = !!user && g.members?.some((m: any) => m.user_id === user.id);
            setIsLeader(leader);
            setIsMember(leader || member);
        } catch {
            setError('Error al cargar el enfrentamiento');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchGroup(); }, [groupId, user]);

    const handleApply = async () => {
        if (!selectedCharId) { setError('Selecciona un personaje'); return; }
        setApplying(true); setError(null);
        try {
            await api.post('/pvp-applications', { pvp_group_id: groupId, character_id: selectedCharId });
            setMessage('¡Solicitud enviada!');
            setTimeout(() => onClose(), 2000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al enviar solicitud');
        } finally { setApplying(false); }
    };

    const handleOpenChat = () => {
        if (group) { openChat(groupId, `PVP ${group.pvp_mode} · ${group.title}`); onClose(); }
    };

    const handleDeleteGroup = async () => {
        if (!confirm('¿Eliminar este enfrentamiento?')) return;
        setDeleting(true);
        try {
            await api.delete(`/pvp-groups/${groupId}`);
            addToast({ title: '🗑 Enfrentamiento eliminado' });
            onClose();
            onDeleted?.();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al eliminar el enfrentamiento');
        } finally {
            setDeleting(false);
        }
    };

    const handleLeaveGroup = async () => {
        if (!user) return;
        const userChar = characters.find(c => c.user_id === user.id);
        if (!userChar) {
            setError('No tienes personajes en este grupo');
            return;
        }
        if (!confirm('¿Estás seguro de que quieres salir del grupo?')) return;
        try {
            await api.delete(`/pvp-groups/${groupId}/members/${userChar.id}`);
            addToast({ title: '👋 Has salido del grupo' });
            onClose();
            onDeleted?.();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al salir del grupo');
        }
    };

    const handleKickMember = async (characterId: string, charName: string) => {
        if (!confirm(`¿Expulsar a ${charName} del grupo?`)) return;
        try {
            await api.delete(`/pvp-groups/${groupId}/members/${characterId}`);
            addToast({ title: `👢 ${charName} ha sido expulsado` });
            // Refresh group data
            const groupRes = await api.get(`/pvp-groups/${groupId}`);
            setGroup(groupRes.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al expulsar miembro');
        }
    };

    const handleLeaveGroupAsLeader = async () => {
        const members = group?.members || [];
        if (members.length === 0) {
            if (!confirm('Eres el único miembro. ¿Cerrar el grupo?')) return;
            try {
                await api.patch(`/pvp-groups/${groupId}/close`);
                addToast({ title: 'Grupo cerrado' });
                onClose();
                return;
            } catch (err: any) {
                setError(err.response?.data?.error || 'Error al cerrar grupo');
            }
            return;
        }
        
        const newLeader = members[0];
        if (!confirm(`¿Salir del grupo? El liderazgo se pasará a ${newLeader.char_name}.`)) return;
        
        try {
            await api.delete(`/pvp-groups/${groupId}/leader`);
            addToast({ title: `👑 Liderazgo transferido a ${newLeader.char_name}` });
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al transferir liderazgo');
        }
    };

    const handleTransferLeadership = async (newLeaderCharId: string, newLeaderName: string) => {
        if (!confirm(`¿Transferir liderazgo a ${newLeaderName}?`)) return;
        try {
            await api.put(`/pvp-groups/${groupId}/transfer-leadership`, { new_leader_character_id: newLeaderCharId });
            addToast({ title: `👑 Liderazgo transferido a ${newLeaderName}` });
            const groupRes = await api.get(`/pvp-groups/${groupId}`);
            setGroup(groupRes.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al transferir liderazgo');
        }
    };

    // ── Drag & Drop ──────────────────────────────────────────────────
    const handleDragStart = (charId: string) => {
        // Only allow dragging your own chars (or any if you're leader)
        const isYourChar = characters.some(c => c.id === charId);
        if (!isYourChar && !isLeader) return;
        setDraggedCharId(charId);
    };

    const handleDropOnTeam = async (team: 'red' | 'blue') => {
        if (!draggedCharId) return;
        setDragOverTeam(null);
        setDraggedCharId(null);
        try {
            const res = await api.patch(`/pvp-groups/${groupId}/member-team`, {
                character_id: draggedCharId,
                team,
            });
            // Optimistic: update local state
            setGroup((prev: any) => {
                if (!prev) return prev;
                // Update leader team if it's the leader char
                if (prev.leader_char_id === draggedCharId) {
                    return { ...prev, leader_team: team };
                }
                return {
                    ...prev,
                    members: prev.members.map((m: any) =>
                        m.char_id === draggedCharId ? { ...m, team } : m
                    ),
                };
            });
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al cambiar equipo');
        }
    };

    // ── Render ───────────────────────────────────────────────────────
    const modeColor = group ? (MODE_COLOR[group.pvp_mode] || 'var(--primary-color)') : 'var(--primary-color)';
    const slotsPerTeam = SLOTS_PER_TEAM_BY_MODE[group?.pvp_mode] || 3;

    const TEAM_RED = { bg: 'rgba(220,50,50,0.10)', border: '#e57373', label: t('pvp.redTeam', language), color: '#e57373' };
    const TEAM_BLUE = { bg: 'rgba(50,100,220,0.10)', border: '#64b5f6', label: t('pvp.blueTeam', language), color: '#64b5f6' };

    // Collect all participants with their team
    const allParticipants: { charId: string; charName: string; classIcon?: string; className: string; userId: string; username: string; team: 'red' | 'blue'; isLeader: boolean }[] = [];
    if (group) {
        allParticipants.push({
            charId: group.leader_char_id,
            charName: group.leader_name,
            classIcon: group.leader_class_icon,
            className: group.leader_class_name,
            userId: group.leader_user_id,
            username: group.leader_username,
            team: (group.leader_team || 'red') as 'red' | 'blue',
            isLeader: true,
        });
        (group.members || []).forEach((m: any) => {
            allParticipants.push({
                charId: m.char_id,
                charName: m.char_name,
                classIcon: m.class_icon,
                className: m.class_name,
                userId: m.user_id,
                username: m.username,
                team: (m.team || 'red') as 'red' | 'blue',
                isLeader: false,
            });
        });
    }

    const redTeam = allParticipants.filter(p => p.team === 'red');
    const blueTeam = allParticipants.filter(p => p.team === 'blue');

    // Which chars can be dragged by this user
    const myCharIds = new Set(characters.map((c: any) => c.id));
    const canDrag = (charId: string) => myCharIds.has(charId) || isLeader;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-large" onClick={e => e.stopPropagation()} style={{ maxWidth: 760 }}>
                <div className="modal-header">
                    <h2 style={{ color: modeColor }}>
                        ⚔ {group?.pvp_mode || 'PVP'} — {group?.title || 'Cargando...'}
                    </h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                {loading ? (
                    <div className="modal-body">Cargando...</div>
                ) : !group ? (
                    <div className="modal-body">Enfrentamiento no encontrado</div>
                ) : (
                    <>
                        <div className="modal-body">
                            {/* Info row */}
                            <div className="detail-grid" style={{ marginBottom: 20 }}>
                                <div className="detail-item">
                                    <span className="detail-label">Modo:</span>
                                    <span className="detail-value" style={{ color: modeColor, fontWeight: 700 }}>{group.pvp_mode}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Franja:</span>
                                    <span className="detail-value">Nv. {group.equipment_band}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Servidor:</span>
                                    <span className="detail-value">{group.server}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Estado:</span>
                                    <span className="detail-value">{group.status === 'open' ? '🟢 Abierto' : '🔴 Lleno'}</span>
                                </div>
                            </div>

                            {/* ── Teams arena ── */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    marginBottom: 10, fontSize: 12, color: 'var(--text-secondary)'
                                }}>
                                    {isMember && (
                                        <span>💡 Arrastra tu personaje al equipo que deseas</span>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'stretch' }}>
                                    {/* Red team */}
                                    <TeamZone
                                        team="red"
                                        config={TEAM_RED}
                                        players={redTeam}
                                        slotsPerTeam={slotsPerTeam}
                                        isDragOver={dragOverTeam === 'red'}
                                        onDragOver={e => { e.preventDefault(); setDragOverTeam('red'); }}
                                        onDragLeave={() => setDragOverTeam(null)}
                                        onDrop={() => handleDropOnTeam('red')}
                                        canDrag={canDrag}
                                        onDragStart={handleDragStart}
                                        currentUserId={user?.id}
                                        backendUrl={process.env.NEXT_PUBLIC_BACKEND_URL}
                                        isLeader={isLeader}
                                        onKick={(charId, charName) => handleKickMember(charId, charName)}
                                    />

                                    {/* VS divider */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 22, fontWeight: 900, color: 'var(--primary-color)',
                                        fontFamily: 'Cinzel, serif', letterSpacing: 2,
                                        padding: '0 4px',
                                    }}>
                                        VS
                                    </div>

                                    {/* Blue team */}
                                    <TeamZone
                                        team="blue"
                                        config={TEAM_BLUE}
                                        players={blueTeam}
                                        slotsPerTeam={slotsPerTeam}
                                        isDragOver={dragOverTeam === 'blue'}
                                        onDragOver={e => { e.preventDefault(); setDragOverTeam('blue'); }}
                                        onDragLeave={() => setDragOverTeam(null)}
                                        onDrop={() => handleDropOnTeam('blue')}
                                        canDrag={canDrag}
                                        onDragStart={handleDragStart}
                                        currentUserId={user?.id}
                                        backendUrl={process.env.NEXT_PUBLIC_BACKEND_URL}
                                        isLeader={isLeader}
                                        onKick={(charId, charName) => handleKickMember(charId, charName)}
                                    />
                                </div>
                            </div>

                            {/* Chat / apply buttons */}
                            {isMember && (
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleOpenChat}
                                    style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}
                                >
                                    💬 Abrir chat del grupo
                                </button>
                            )}
                            {!isMember && user && (
                                <div style={{
                                    padding: '10px 14px', background: 'var(--background)',
                                    border: '1px solid var(--border-color)', borderRadius: 8,
                                    fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8,
                                }}>
                                    🔒 El chat está disponible solo para miembros del grupo.
                                </div>
                            )}

                            {error && <div className="error-message" style={{ marginTop: 8 }}>{error}</div>}
                            {message && <div className="success-message" style={{ marginTop: 8 }}>{message}</div>}

                            {user && group.status === 'open' && !isMember && (
                                <div className="form-group" style={{ marginTop: 12 }}>
                                    <label>Selecciona tu personaje para unirte</label>
                                    <CustomSelect
                                        value={selectedCharId}
                                        onChange={e => setSelectedCharId(e)}
                                        placeholder="Elige un personaje"
                                        options={characters.map((char: any) => ({
                                            value: String(char.id),
                                            label: `${char.name} - ${char.class_name} Nv. ${char.level}`,
                                        }))}
                                    />
                                </div>
                            )}
                        </div>

                        {user && group.status === 'open' && !isMember && (
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleApply}
                                    disabled={applying || !selectedCharId}
                                    style={{ background: modeColor, color: '#0a0a0a' }}
                                >
                                    {applying ? 'Enviando...' : '⚔ Solicitar Unirse'}
                                </button>
                            </div>
                        )}

                        {isLeader && (
                            <div className="modal-footer" style={{ flexDirection: 'column', gap: 8 }}>
                                {group?.members && group.members.length > 0 && (
                                    <CustomSelect
                                        value=""
                                        onChange={(value) => {
                                            if (value) {
                                                handleTransferLeadership(value, group.members.find((m: any) => m.char_id === value)?.char_name);
                                            }
                                        }}
                                        options={group.members.map((m: any) => ({
                                            value: String(m.char_id),
                                            label: m.char_name,
                                        }))}
                                        placeholder="Transferir liderazgo"
                                        className="form-select"
                                    />
                                )}
                                <button className="btn btn-warning" onClick={handleLeaveGroupAsLeader} style={{ color: '#000' }}>
                                    🚪 Salir y pasar liderazgo
                                </button>
                                <button className="btn btn-danger" onClick={handleDeleteGroup} disabled={deleting}>
                                    {deleting ? 'Eliminando...' : '🗑 Eliminar enfrentamiento'}
                                </button>
                            </div>
                        )}

                        {isMember && !isLeader && (
                            <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
                                <button className="btn btn-danger" onClick={handleLeaveGroup}>
                                    🚪 Salir del grupo
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ── TeamZone subcomponent ────────────────────────────────────────────
function TeamZone({
    team, config, players, slotsPerTeam,
    isDragOver, onDragOver, onDragLeave, onDrop,
    canDrag, onDragStart, currentUserId, backendUrl, isLeader, onKick,
}: {
    team: 'red' | 'blue';
    config: { bg: string; border: string; label: string; color: string };
    players: any[];
    slotsPerTeam: number;
    isDragOver: boolean;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: () => void;
    canDrag: (charId: string) => boolean;
    onDragStart: (charId: string) => void;
    currentUserId?: string;
    backendUrl?: string;
    isLeader?: boolean;
    onKick?: (charId: string, charName: string) => void;
}) {
    return (
        <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            style={{
                background: isDragOver ? `${config.bg.replace('0.10', '0.25')}` : config.bg,
                border: `2px dashed ${isDragOver ? config.color : config.border}`,
                borderRadius: 10,
                padding: 12,
                minHeight: 140,
                transition: 'all 0.18s',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
            }}
        >
            {/* Header */}
            <div style={{
                fontWeight: 700, fontSize: 13,
                color: config.color,
                marginBottom: 4,
                textAlign: 'center',
                letterSpacing: 1,
            }}>
                {config.label}
                <span style={{ marginLeft: 8, fontWeight: 400, fontSize: 11, color: 'var(--text-secondary)' }}>
                    {players.length}/{slotsPerTeam}
                </span>
            </div>

            {/* Players */}
            {players.map(p => (
                <PlayerChip
                    key={p.charId}
                    player={p}
                    teamColor={config.color}
                    draggable={canDrag(p.charId)}
                    onDragStart={() => onDragStart(p.charId)}
                    isCurrentUser={p.userId === currentUserId}
                    backendUrl={backendUrl}
                    isLeader={isLeader}
                    onKick={onKick ? () => onKick(p.charId, p.charName) : undefined}
                />
            ))}

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, slotsPerTeam - players.length) }).map((_, i) => (
                <div key={`slot-${i}`} style={{
                    height: 44,
                    border: `1.5px dashed ${config.border}`,
                    borderRadius: 8,
                    opacity: 0.3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    color: config.color,
                }}>
                    Libre
                </div>
            ))}

            {/* Drop hint */}
            {isDragOver && (
                <div style={{
                    textAlign: 'center', fontSize: 11,
                    color: config.color, marginTop: 4,
                    fontWeight: 600,
                }}>
                    Soltar aquí
                </div>
            )}
        </div>
    );
}

function PlayerChip({
    player, teamColor, draggable, onDragStart, isCurrentUser, backendUrl, isLeader, onKick,
}: {
    player: any;
    teamColor: string;
    draggable: boolean;
    onDragStart: () => void;
    isCurrentUser: boolean;
    backendUrl?: string;
    isLeader?: boolean;
    onKick?: () => void;
}) {
    return (
        <div
            draggable={draggable}
            onDragStart={draggable ? onDragStart : undefined}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                background: 'var(--background-light)',
                border: `1px solid ${isCurrentUser ? teamColor : 'var(--border-color)'}`,
                borderRadius: 8,
                cursor: draggable ? 'grab' : 'default',
                transition: 'border-color 0.2s, opacity 0.2s',
                userSelect: 'none',
            }}
            title={draggable ? 'Arrastra para cambiar de equipo' : ''}
        >
            {player.classIcon && (
                <img
                    src={`${backendUrl}/${player.classIcon}`}
                    alt={player.className}
                    style={{ width: 24, height: 24, borderRadius: 4, flexShrink: 0 }}
                />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: 12, fontWeight: 600,
                    color: isCurrentUser ? teamColor : 'var(--text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                    {player.charName}
                    {player.isLeader && (
                        <span style={{ marginLeft: 4, fontSize: 9, background: teamColor, color: '#0a0a0a', borderRadius: 4, padding: '1px 4px' }}>
                            Líder
                        </span>
                    )}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{player.className}</div>
            </div>
            {draggable && (
                <span style={{ fontSize: 14, opacity: 0.4, flexShrink: 0 }}>⠿</span>
            )}
            {isLeader && onKick && !player.isLeader && (
                <button
                    onClick={(e) => { e.stopPropagation(); onKick(); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px', flexShrink: 0 }}
                    title="Expulsar"
                >
                    👢
                </button>
            )}
        </div>
    );
}

