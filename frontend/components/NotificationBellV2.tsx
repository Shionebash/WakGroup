'use client';
import { useEffect, useRef, useState } from 'react';
import { useChat } from '@/lib/chat-context';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import { t } from '@/lib/translations';

type ActionState = 'accepted' | 'rejected' | 'keep_alive' | null;
type UiLanguage = 'es' | 'en' | 'fr' | 'pt';

function formatTemplate(template: string, values: Record<string, string>) {
    return Object.entries(values).reduce(
        (result, [key, value]) => result.replaceAll(`{${key}}`, value),
        template
    );
}

function getNotificationBody(notif: any, payload: any, language: UiLanguage) {
    if (notif.type === 'application_received') {
        return formatTemplate(t('notification.applicationReceivedBody', language), {
            user: payload.from_username || 'WakGroup',
            char: payload.char_name || 'Wakfu',
        });
    }
    if (notif.type === 'application_accepted') {
        return t('notification.applicationAcceptedBody', language);
    }
    if (notif.type === 'application_rejected') {
        return t('notification.applicationRejectedBody', language);
    }
    if (notif.type === 'group_inactivity_prompt') {
        return formatTemplate(t('notification.inactivityPromptBody', language), {
            title: payload.group_title || 'WakGroup',
        });
    }
    if (notif.type === 'group_inactivity_closed') {
        return formatTemplate(t('notification.inactivityClosedBody', language), {
            title: payload.group_title || 'WakGroup',
        });
    }
    return payload.preview || '';
}

export default function NotificationBellV2() {
    const { user } = useAuth();
    const { notifications, unreadCount, markAllRead, refreshNotifications } = useChat();
    const { language } = useLanguage();
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
        setOpen((value) => !value);
        if (!open && unreadCount > 0) markAllRead();
    };

    if (!user) return null;

    const recent = notifications.slice(0, 30);

    return (
        <div ref={panelRef} style={{ position: 'relative' }}>
            <button
                onClick={handleOpen}
                title={t('overlay.notifications', language)}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    padding: '4px 6px',
                    borderRadius: 6,
                    fontSize: 20,
                    lineHeight: 1,
                    color: unreadCount > 0 ? 'var(--primary-color)' : 'var(--text-secondary)',
                    transition: 'color 0.2s',
                }}
            >
                {'🔔'}
                {unreadCount > 0 && (
                    <span
                        style={{
                            position: 'absolute',
                            top: -2,
                            right: -2,
                            background: 'var(--error-color)',
                            color: '#fff',
                            borderRadius: 10,
                            fontSize: 10,
                            fontWeight: 700,
                            minWidth: 17,
                            height: 17,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 3px',
                            border: '2px solid var(--background-light)',
                        }}
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 10px)',
                        right: 0,
                        width: 360,
                        background: 'var(--background-light)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 10,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        zIndex: 9999,
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            borderBottom: '1px solid var(--border-color)',
                        }}
                    >
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary-color)' }}>
                            {'🔔'} {t('overlay.notifications', language)}
                        </span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {permissionState !== 'granted' && permissionState !== 'denied' && (
                                <button
                                    onClick={requestPermission}
                                    style={{
                                        background: 'var(--primary-color)',
                                        color: 'var(--background)',
                                        border: 'none',
                                        borderRadius: 4,
                                        fontSize: 10,
                                        padding: '3px 7px',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                    }}
                                >
                                    {t('notification.enableAlerts', language)}
                                </button>
                            )}
                            {permissionState === 'denied' && (
                                <span style={{ fontSize: 10, color: 'var(--error-color)' }}>{t('notification.alertsBlocked', language)}</span>
                            )}
                            {permissionState === 'granted' && (
                                <span style={{ fontSize: 10, color: 'var(--success-color)' }}>{t('notification.alertsActive', language)}</span>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={markAllRead}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-secondary)',
                                        fontSize: 11,
                                        cursor: 'pointer',
                                    }}
                                >
                                    {t('notification.readAll', language)}
                                </button>
                            )}
                        </div>
                    </div>

                    <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                        {recent.length === 0 ? (
                            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>{'🔔'}</div>
                                {t('notification.empty', language)}
                            </div>
                        ) : (
                            recent.map((notification) => (
                                <NotifItem
                                    key={notification.id}
                                    notif={notification}
                                    onAction={refreshNotifications}
                                    language={language as UiLanguage}
                                />
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function NotifItem({ notif, onAction, language }: { notif: any; onAction: () => void; language: UiLanguage }) {
    const typeLabels: Record<string, { icon: string; label: string }> = {
        application_received: { icon: '📨', label: t('notification.newApplication', language) },
        application_accepted: { icon: '✅', label: t('notification.applicationAccepted', language) },
        application_rejected: { icon: '❌', label: t('notification.applicationRejected', language) },
        group_message: { icon: '💬', label: t('notification.newMessage', language) },
        group_inactivity_prompt: { icon: '⏳', label: t('notification.inactivityPrompt', language) },
        group_inactivity_closed: { icon: '🔒', label: t('notification.inactivityClosed', language) },
    };
    const meta = typeLabels[notif.type] ?? { icon: '📣', label: notif.type };
    const payload = typeof notif.payload === 'string' ? JSON.parse(notif.payload) : (notif.payload ?? {});

    const [acting, setActing] = useState<ActionState>(null);
    const [done, setDone] = useState<ActionState>(null);

    const isApplicationReceived = notif.type === 'application_received';
    const isInactivityPrompt = notif.type === 'group_inactivity_prompt';
    const applicationId = payload.application_id;
    const groupId = payload.group_id;
    const groupType: 'pvp' | 'dungeon' = payload.group_type === 'pvp' ? 'pvp' : 'dungeon';

    const handleApplicationAction = async (action: 'accepted' | 'rejected') => {
        if (acting || done || !applicationId) return;
        setActing(action);
        try {
            const endpoint = groupType === 'pvp'
                ? `/pvp-applications/${applicationId}`
                : `/applications/${applicationId}`;
            await api.patch(endpoint, { action });
            setDone(action);
            onAction();
        } catch (err: any) {
            console.error('Error al procesar solicitud:', err.response?.data?.error);
            setActing(null);
        }
    };

    const handleKeepAlive = async () => {
        if (acting || done || !groupId) return;
        setActing('keep_alive');
        try {
            const endpoint = groupType === 'pvp'
                ? `/pvp-groups/${groupId}/keep-alive`
                : `/groups/${groupId}/keep-alive`;
            await api.post(endpoint);
            setDone('keep_alive');
            onAction();
        } catch (err: any) {
            console.error('Error al confirmar actividad del grupo:', err.response?.data?.error);
            setActing(null);
        }
    };

    const timeStr = (() => {
        const d = new Date(notif.created_at);
        const diff = Date.now() - d.getTime();
        if (diff < 60_000) return t('notification.now', language);
        if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
        if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
        return d.toLocaleDateString(language === 'pt' ? 'pt-BR' : language);
    })();

    return (
        <div
            style={{
                display: 'flex',
                gap: 10,
                padding: '12px 14px',
                borderBottom: '1px solid var(--border-color)',
                background: notif.is_read ? 'transparent' : 'rgba(212,165,116,0.06)',
                transition: 'background 0.2s',
                alignItems: 'flex-start',
            }}
        >
            <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1.3 }}>{meta.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div
                    style={{
                        fontSize: 13,
                        fontWeight: notif.is_read ? 400 : 600,
                        color: notif.is_read ? 'var(--text-secondary)' : 'var(--text-primary)',
                        marginBottom: 2,
                    }}
                >
                    {meta.label}
                </div>

                {payload.from_username ? (
                    <>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                            <strong style={{ color: 'var(--primary-color)' }}>{payload.from_username}</strong>
                            {notif.type === 'group_message' ? (
                                <>
                                    {payload.char_name && <> · <span>{payload.char_name}</span></>}
                                    {payload.preview && !payload.char_name && <> · "{payload.preview}"</>}
                                </>
                            ) : null}
                        </div>
                        {notif.type !== 'group_message' && getNotificationBody(notif, payload, language) ? (
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                                {getNotificationBody(notif, payload, language)}
                            </div>
                        ) : null}
                    </>
                ) : getNotificationBody(notif, payload, language) ? (
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        {getNotificationBody(notif, payload, language)}
                    </div>
                ) : null}

                {isApplicationReceived && applicationId && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        {done === 'accepted' ? (
                            <span style={{ fontSize: 11, color: 'var(--success-color)', fontWeight: 600 }}>✅ {t('notification.applicationAccepted', language)}</span>
                        ) : done === 'rejected' ? (
                            <span style={{ fontSize: 11, color: 'var(--error-color)', fontWeight: 600 }}>❌ {t('notification.applicationRejected', language)}</span>
                        ) : (
                            <>
                                <button
                                    onClick={() => handleApplicationAction('accepted')}
                                    disabled={!!acting}
                                    title={t('notification.applicationAccepted', language)}
                                    style={{
                                        background: acting === 'accepted' ? 'var(--success-color)' : 'rgba(76,175,80,0.15)',
                                        border: '1px solid var(--success-color)',
                                        borderRadius: 6,
                                        color: 'var(--success-color)',
                                        cursor: acting ? 'wait' : 'pointer',
                                        fontSize: 15,
                                        width: 32,
                                        height: 32,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        opacity: acting === 'rejected' ? 0.4 : 1,
                                        fontWeight: 700,
                                    }}
                                >
                                    {acting === 'accepted' ? '...' : '✓'}
                                </button>
                                <button
                                    onClick={() => handleApplicationAction('rejected')}
                                    disabled={!!acting}
                                    title={t('notification.applicationRejected', language)}
                                    style={{
                                        background: acting === 'rejected' ? 'var(--error-color)' : 'rgba(244,67,54,0.15)',
                                        border: '1px solid var(--error-color)',
                                        borderRadius: 6,
                                        color: 'var(--error-color)',
                                        cursor: acting ? 'wait' : 'pointer',
                                        fontSize: 15,
                                        width: 32,
                                        height: 32,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        opacity: acting === 'accepted' ? 0.4 : 1,
                                        fontWeight: 700,
                                    }}
                                >
                                    {acting === 'rejected' ? '...' : '✕'}
                                </button>
                            </>
                        )}
                    </div>
                )}

                {isInactivityPrompt && groupId && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        {done === 'keep_alive' ? (
                            <span style={{ fontSize: 11, color: 'var(--success-color)', fontWeight: 600 }}>✅ {t('notification.confirmed', language)}</span>
                        ) : (
                            <button
                                onClick={handleKeepAlive}
                                disabled={!!acting}
                                style={{
                                    background: acting === 'keep_alive' ? 'var(--primary-dark)' : 'rgba(212,165,116,0.15)',
                                    border: '1px solid var(--primary-color)',
                                    borderRadius: 6,
                                    color: 'var(--primary-color)',
                                    cursor: acting ? 'wait' : 'pointer',
                                    fontSize: 11,
                                    padding: '7px 10px',
                                    fontWeight: 700,
                                }}
                            >
                                {acting === 'keep_alive' ? t('common.loading', language) : t('notification.keepLooking', language)}
                            </button>
                        )}
                    </div>
                )}
            </div>

            <span style={{ fontSize: 10, color: 'var(--text-secondary)', flexShrink: 0, paddingTop: 2 }}>
                {timeStr}
            </span>
        </div>
    );
}
