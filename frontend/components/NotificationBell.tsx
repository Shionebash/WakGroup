'use client';
import { useEffect, useRef, useState } from 'react';
import { useChat } from '@/lib/chat-context';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

const TYPE_LABELS: Record<string, { icon: string; label: string }> = {
    application_received: { icon: '📨', label: 'Nueva solicitud de unión' },
    application_accepted: { icon: '✅', label: 'Solicitud aceptada' },
    application_rejected: { icon: '❌', label: 'Solicitud rechazada' },
    group_message:        { icon: '💬', label: 'Mensaje en grupo' },
};

export default function NotificationBell() {
    const { user } = useAuth();
    const { notifications, unreadCount, markAllRead, refreshNotifications } = useChat();
    const [open, setOpen] = useState(false);
    const [permissionState, setPermissionState] = useState<string>('default');
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermissionState(window.Notification.permission);
        }
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const requestPermission = async () => {
        if (!('Notification' in window)) return;
        const result = await window.Notification.requestPermission();
        setPermissionState(result);
    };

    const handleOpen = () => {
        setOpen(v => !v);
        if (!open && unreadCount > 0) markAllRead();
    };

    if (!user) return null;

    const recent = notifications.slice(0, 30);

    return (
        <div ref={panelRef} style={{ position: 'relative' }}>
            {/* Bell button */}
            <button
                onClick={handleOpen}
                title="Notificaciones"
                style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    position: 'relative', padding: '4px 6px', borderRadius: 6,
                    fontSize: 20, lineHeight: 1,
                    color: unreadCount > 0 ? 'var(--primary-color)' : 'var(--text-secondary)',
                    transition: 'color 0.2s',
                }}
            >
                🔔
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', top: -2, right: -2,
                        background: 'var(--error-color)', color: '#fff',
                        borderRadius: 10, fontSize: 10, fontWeight: 700,
                        minWidth: 17, height: 17,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 3px', border: '2px solid var(--background-light)',
                    }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown panel */}
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                    width: 360,
                    background: 'var(--background-light)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 10,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    zIndex: 9999, overflow: 'hidden',
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border-color)',
                    }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary-color)' }}>
                            🔔 Notificaciones
                        </span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {permissionState !== 'granted' && permissionState !== 'denied' && (
                                <button onClick={requestPermission} style={{
                                    background: 'var(--primary-color)', color: 'var(--background)',
                                    border: 'none', borderRadius: 4, fontSize: 10,
                                    padding: '3px 7px', cursor: 'pointer', fontWeight: 600,
                                }}>
                                    Activar avisos
                                </button>
                            )}
                            {permissionState === 'denied' && (
                                <span style={{ fontSize: 10, color: 'var(--error-color)' }}>Avisos bloqueados</span>
                            )}
                            {permissionState === 'granted' && (
                                <span style={{ fontSize: 10, color: 'var(--success-color)' }}>✓ Avisos activos</span>
                            )}
                            {notifications.length > 0 && (
                                <button onClick={markAllRead} style={{
                                    background: 'none', border: 'none',
                                    color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer',
                                }}>
                                    Leer todo
                                </button>
                            )}
                        </div>
                    </div>

                    {/* List */}
                    <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                        {recent.length === 0 ? (
                            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
                                Sin notificaciones
                            </div>
                        ) : recent.map(n => (
                            <NotifItem
                                key={n.id}
                                notif={n}
                                onAction={refreshNotifications}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Single notification row ────────────────────────────────────────
function NotifItem({ notif, onAction }: { notif: any; onAction: () => void }) {
    const meta = TYPE_LABELS[notif.type] ?? { icon: '📣', label: notif.type };
    const payload = typeof notif.payload === 'string'
        ? JSON.parse(notif.payload) : (notif.payload ?? {});

    const [acting, setActing] = useState<'accepted' | 'rejected' | null>(null);
    const [done, setDone] = useState<'accepted' | 'rejected' | null>(null);

    const isApplicationReceived = notif.type === 'application_received';
    const applicationId = payload.application_id;
    const groupType: 'pvp' | 'dungeon' = payload.group_type === 'pvp' ? 'pvp' : 'dungeon';

    const handleAction = async (action: 'accepted' | 'rejected') => {
        if (acting || done) return;
        setActing(action);
        try {
            const endpoint = groupType === 'pvp'
                ? `/pvp-applications/${applicationId}`
                : `/applications/${applicationId}`;
            await api.patch(endpoint, { action });
            setDone(action);
            onAction(); // refresh notifications
        } catch (err: any) {
            console.error('Error al procesar solicitud:', err.response?.data?.error);
            setActing(null);
        }
    };

    const timeStr = (() => {
        const d = new Date(notif.created_at);
        const diff = Date.now() - d.getTime();
        if (diff < 60_000) return 'ahora';
        if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
        if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
        return d.toLocaleDateString('es');
    })();

    return (
        <div style={{
            display: 'flex', gap: 10,
            padding: '12px 14px',
            borderBottom: '1px solid var(--border-color)',
            background: notif.is_read ? 'transparent' : 'rgba(212,165,116,0.06)',
            transition: 'background 0.2s',
            alignItems: 'flex-start',
        }}>
            {/* Icon */}
            <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1.3 }}>{meta.icon}</span>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: 13, fontWeight: notif.is_read ? 400 : 600,
                    color: notif.is_read ? 'var(--text-secondary)' : 'var(--text-primary)',
                    marginBottom: 2,
                }}>
                    {meta.label}
                </div>

                {payload.from_username && (
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        <strong style={{ color: 'var(--primary-color)' }}>{payload.from_username}</strong>
                        {payload.char_name && <> · <span>{payload.char_name}</span></>}
                        {payload.preview && !payload.char_name && (
                            <> · &ldquo;{payload.preview.slice(0, 60)}{payload.preview.length > 60 ? '…' : ''}&rdquo;</>
                        )}
                    </div>
                )}

                {/* Accept / Reject buttons for incoming applications */}
                {isApplicationReceived && applicationId && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        {done === 'accepted' ? (
                            <span style={{ fontSize: 11, color: 'var(--success-color)', fontWeight: 600 }}>✅ Aceptado</span>
                        ) : done === 'rejected' ? (
                            <span style={{ fontSize: 11, color: 'var(--error-color)', fontWeight: 600 }}>❌ Rechazado</span>
                        ) : (
                            <>
                                <button
                                    onClick={() => handleAction('accepted')}
                                    disabled={!!acting}
                                    title="Aceptar solicitud"
                                    style={{
                                        background: acting === 'accepted' ? 'var(--success-color)' : 'rgba(76,175,80,0.15)',
                                        border: '1px solid var(--success-color)',
                                        borderRadius: 6,
                                        color: 'var(--success-color)',
                                        cursor: acting ? 'wait' : 'pointer',
                                        fontSize: 15,
                                        width: 32, height: 32,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'all 0.15s',
                                        opacity: acting === 'rejected' ? 0.4 : 1,
                                        fontWeight: 700,
                                    }}
                                >
                                    {acting === 'accepted' ? '…' : '✓'}
                                </button>
                                <button
                                    onClick={() => handleAction('rejected')}
                                    disabled={!!acting}
                                    title="Rechazar solicitud"
                                    style={{
                                        background: acting === 'rejected' ? 'var(--error-color)' : 'rgba(244,67,54,0.15)',
                                        border: '1px solid var(--error-color)',
                                        borderRadius: 6,
                                        color: 'var(--error-color)',
                                        cursor: acting ? 'wait' : 'pointer',
                                        fontSize: 15,
                                        width: 32, height: 32,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'all 0.15s',
                                        opacity: acting === 'accepted' ? 0.4 : 1,
                                        fontWeight: 700,
                                    }}
                                >
                                    {acting === 'rejected' ? '…' : '✕'}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Time */}
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', flexShrink: 0, paddingTop: 2 }}>
                {timeStr}
            </span>
        </div>
    );
}
