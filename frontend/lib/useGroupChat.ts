import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';

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

export function useGroupChat(groupId: string, isMember: boolean) {
    const socketRef = useRef<Socket | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Load message history from REST API
    useEffect(() => {
        if (!isMember || !groupId) return;
        setLoadingHistory(true);
        api.get(`/groups/${groupId}/messages`)
            .catch(() => api.get(`/pvp-groups/${groupId}/messages`))
            .then(r => setMessages(r.data || []))
            .catch(() => setMessages([]))
            .finally(() => setLoadingHistory(false));
    }, [groupId, isMember]);

    // Connect socket
    useEffect(() => {
        if (!isMember || !groupId) return;

        // Pass token via auth so the socket middleware can authenticate
        const token = typeof window !== 'undefined' ? localStorage.getItem('session_token') : null;

        const socket = io(BACKEND_URL, {
            withCredentials: true,
            transports: ['polling', 'websocket'],
            auth: token ? { token } : undefined,
            extraHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            setError(null);
            socket.emit('join_group', groupId);
        });

        socket.on('disconnect', () => {
            setConnected(false);
        });

        socket.on('connect_error', (err) => {
            setError('No se pudo conectar al chat');
            console.error('Socket error:', err.message);
        });

        socket.on('error', (msg: string) => {
            setError(msg);
        });

        socket.on('new_message', (msg: ChatMessage) => {
            setMessages(prev => {
                if (prev.find(m => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
        });

        return () => {
            socket.emit('leave_group', groupId);
            socket.disconnect();
            socketRef.current = null;
            setConnected(false);
        };
    }, [groupId, isMember]);

    const sendMessage = useCallback((content: string) => {
        if (!socketRef.current?.connected || !content.trim()) return;
        socketRef.current.emit('send_message', { groupId, content: content.trim() });
    }, [groupId]);

    return { messages, connected, error, loadingHistory, sendMessage };
}
