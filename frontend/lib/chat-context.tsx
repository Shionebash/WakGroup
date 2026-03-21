'use client';
import React, {
    createContext, useContext, useEffect, useRef,
    useState, useCallback, ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { t } from '@/lib/translations';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface ChatMessage {
    id: string;
    group_id: string;
    user_id: string;
    discord_id: string;
    username: string;
    avatar: string | null;
    content: string;
    created_at: number;
}

export interface ChatSession {
    groupId: string;
    groupName: string;
    messages: ChatMessage[];
    unread: number;
    open: boolean;       // panel expanded
    minimized: boolean;  // bar visible but collapsed
}

export interface Notification {
    id: string;
    type: string;
    payload: any;
    is_read: boolean;
    created_at: string;
}

function getBrowserNotificationTitle(type: string, language: 'es' | 'en' | 'fr' | 'pt') {
    if (type === 'application_received') return t('notification.newApplication', language);
    if (type === 'application_accepted') return t('notification.applicationAccepted', language);
    if (type === 'application_rejected') return t('notification.applicationRejected', language);
    if (type === 'group_inactivity_prompt') return t('notification.inactivityPrompt', language);
    if (type === 'group_inactivity_closed') return t('notification.inactivityClosed', language);
    return t('notification.newMessage', language);
}

function formatTemplate(template: string, values: Record<string, string>) {
    return Object.entries(values).reduce(
        (result, [key, value]) => result.replaceAll(`{${key}}`, value),
        template
    );
}

function getBrowserNotificationBody(data: any, language: 'es' | 'en' | 'fr' | 'pt') {
    if (data.type === 'application_received') {
        return formatTemplate(t('notification.applicationReceivedBody', language), {
            user: data.fromUsername || 'WakGroup',
            char: data.charName || 'Wakfu',
        });
    }
    if (data.type === 'application_accepted') {
        return t('notification.applicationAcceptedBody', language);
    }
    if (data.type === 'application_rejected') {
        return t('notification.applicationRejectedBody', language);
    }
    if (data.type === 'group_inactivity_prompt') {
        return formatTemplate(t('notification.inactivityPromptBody', language), {
            title: data.group_title || 'WakGroup',
        });
    }
    if (data.type === 'group_inactivity_closed') {
        return formatTemplate(t('notification.inactivityClosedBody', language), {
            title: data.group_title || 'WakGroup',
        });
    }
    if (data.fromUsername) {
        return `${data.fromUsername}: ${data.preview || ''}`;
    }
    return data.preview || '';
}

interface ChatContextValue {
    // chat
    sessions: ChatSession[];
    openChat: (groupId: string, groupName: string) => void;
    closeChat: (groupId: string) => void;
    toggleChat: (groupId: string) => void;
    sendMessage: (groupId: string, content: string) => void;
    markChatRead: (groupId: string) => void;
    connected: boolean;

    // notifications
    notifications: Notification[];
    unreadCount: number;
    markAllRead: () => void;
    refreshNotifications: () => void;
}

const ChatContext = createContext<ChatContextValue>({
    sessions: [], openChat: () => {}, closeChat: () => {},
    toggleChat: () => {}, sendMessage: () => {}, markChatRead: () => {},
    connected: false, notifications: [], unreadCount: 0,
    markAllRead: () => {}, refreshNotifications: () => {},
});

export function ChatProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { language } = useLanguage();
    const socketRef = useRef<Socket | null>(null);
    const [connected, setConnected] = useState(false);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    // â”€â”€ Notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const refreshNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data);
        } catch { /* silent */ }
    }, [user]);

    const markAllRead = useCallback(async () => {
        try {
            await api.patch('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch { /* silent */ }
    }, []);

    // â”€â”€ Socket â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    useEffect(() => {
        if (!user) {
            socketRef.current?.disconnect();
            socketRef.current = null;
            setConnected(false);
            return;
        }

        const token = typeof window !== 'undefined'
            ? localStorage.getItem('session_token') : null;

        const socket = io(BACKEND_URL, {
            withCredentials: true,
            transports: ['polling', 'websocket'],
            auth: token ? { token } : undefined,
            extraHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            // Re-join all active sessions
            setSessions(prev => {
                prev.forEach(s => socket.emit('join_group', s.groupId));
                return prev;
            });
            // Fetch fresh notifications on connect
            refreshNotifications();
        });

        socket.on('disconnect', () => setConnected(false));

        socket.on('new_message', (msg: ChatMessage) => {
            setSessions(prev => prev.map(s => {
                if (s.groupId !== msg.group_id) return s;
                const alreadyExists = s.messages.find(m => m.id === msg.id);
                if (alreadyExists) return s;
                return {
                    ...s,
                    messages: [...s.messages, msg],
                    unread: s.open ? s.unread : s.unread + 1,
                };
            }));
        });

        // Real-time notification from socket
        socket.on('notification', (data: any) => {
            refreshNotifications();
            // Browser push notification
            if (
                typeof window !== 'undefined' &&
                'Notification' in window &&
                window.Notification.permission === 'granted'
            ) {
                const title = getBrowserNotificationTitle(data.type, language);
                const body = getBrowserNotificationBody(data, language);

                new window.Notification(title, {
                    body,
                    icon: '/favicon.ico',
                    tag: data.groupId || 'wakgroup',
                });
            }
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
            setConnected(false);
        };
    }, [user, refreshNotifications, language]);

    // Poll notifications every 30s
    useEffect(() => {
        if (!user) return;
        refreshNotifications();
        const interval = setInterval(refreshNotifications, 30_000);
        return () => clearInterval(interval);
    }, [user, refreshNotifications, language]);

    // â”€â”€ Chat session management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const openChat = useCallback(async (groupId: string, groupName: string) => {
        // If already open, just expand it
        setSessions(prev => {
            const existing = prev.find(s => s.groupId === groupId);
            if (existing) {
                return prev.map(s => s.groupId === groupId
                    ? { ...s, open: true, minimized: false, unread: 0 }
                    : s
                );
            }
            return [...prev, {
                groupId, groupName, messages: [], unread: 0,
                open: true, minimized: false,
            }];
        });

        // Join socket room
        socketRef.current?.emit('join_group', groupId);

        // Load history
        try {
            const res = await api.get(`/groups/${groupId}/messages`)
                .catch(() => api.get(`/pvp-groups/${groupId}/messages`));
            setSessions(prev => prev.map(s =>
                s.groupId === groupId
                    ? { ...s, messages: res.data || [] }
                    : s
            ));
        } catch { /* silent */ }
    }, []);

    const closeChat = useCallback((groupId: string) => {
        socketRef.current?.emit('leave_group', groupId);
        setSessions(prev => prev.filter(s => s.groupId !== groupId));
    }, []);

    const toggleChat = useCallback((groupId: string) => {
        setSessions(prev => prev.map(s =>
            s.groupId === groupId
                ? { ...s, open: !s.open, unread: s.open ? s.unread : 0 }
                : s
        ));
    }, []);

    const markChatRead = useCallback((groupId: string) => {
        setSessions(prev => prev.map(s =>
            s.groupId === groupId ? { ...s, unread: 0 } : s
        ));
    }, []);

    const sendMessage = useCallback((groupId: string, content: string) => {
        if (!socketRef.current?.connected || !content.trim()) return;
        socketRef.current.emit('send_message', { groupId, content: content.trim() });
    }, []);

    return (
        <ChatContext.Provider value={{
            sessions, openChat, closeChat, toggleChat,
            sendMessage, markChatRead, connected,
            notifications, unreadCount, markAllRead, refreshNotifications,
        }}>
            {children}
        </ChatContext.Provider>
    );
}

export const useChat = () => useContext(ChatContext);


