'use client';
import React, {
    createContext, useContext, useEffect, useRef,
    useState, useCallback, ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

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
    const socketRef = useRef<Socket | null>(null);
    const [connected, setConnected] = useState(false);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    // ── Notifications ──────────────────────────────────────────
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

    // ── Socket ─────────────────────────────────────────────────
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
                const title = data.type === 'application_received'
                    ? '⚔ Nueva solicitud de unión'
                    : data.type === 'application_accepted'
                    ? '✅ Solicitud aceptada'
                    : data.type === 'application_rejected'
                    ? '❌ Solicitud rechazada'
                    : '💬 Nuevo mensaje';

                const body = data.fromUsername
                    ? `${data.fromUsername}: ${data.preview || ''}`
                    : data.preview || '';

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
    }, [user, refreshNotifications]);

    // Poll notifications every 30s
    useEffect(() => {
        if (!user) return;
        refreshNotifications();
        const interval = setInterval(refreshNotifications, 30_000);
        return () => clearInterval(interval);
    }, [user, refreshNotifications]);

    // ── Chat session management ─────────────────────────────────
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

