'use client';
import { useEffect, useRef, useState } from 'react';
import { useGroupChat, ChatMessage } from '@/lib/useGroupChat';
import { getDiscordAvatar } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface GroupChatProps {
    groupId: string;
    isMember: boolean;
}

export default function GroupChat({ groupId, isMember }: GroupChatProps) {
    const { user } = useAuth();
    const { messages, connected, error, loadingHistory, sendMessage } = useGroupChat(groupId, isMember);
    const [input, setInput] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;
        sendMessage(input);
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isMember) {
        return (
            <div style={styles.lockedBox}>
                <span style={{ fontSize: 28 }}>🔒</span>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8 }}>
                    El chat es solo para miembros del grupo
                </p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary-color)' }}>
                    💬 Chat del grupo
                </span>
                <span style={{
                    fontSize: 11,
                    color: connected ? 'var(--success-color)' : 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', gap: 4
                }}>
                    <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: connected ? 'var(--success-color)' : 'var(--border-color)',
                        display: 'inline-block'
                    }} />
                    {connected ? 'Conectado' : 'Conectando...'}
                </span>
            </div>

            {/* Messages */}
            <div style={styles.messages}>
                {loadingHistory && (
                    <div style={{ textAlign: 'center', padding: 16 }}>
                        <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto' }} />
                    </div>
                )}

                {!loadingHistory && messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13, padding: 24 }}>
                        No hay mensajes aún. ¡Sé el primero en escribir!
                    </div>
                )}

                {messages.map(msg => {
                    return (
                        <MessageBubble
                            key={msg.id}
                            msg={msg}
                            isOwn={msg.user_id === user?.id}
                        />
                    );
                })}

                {error && (
                    <div style={{ textAlign: 'center', color: 'var(--error-color)', fontSize: 12, padding: 8 }}>
                        ⚠ {error}
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={styles.inputRow}>
                <input
                    style={styles.input}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe un mensaje... (Enter para enviar)"
                    maxLength={500}
                    disabled={!connected}
                />
                <button
                    style={{
                        ...styles.sendBtn,
                        opacity: (!connected || !input.trim()) ? 0.4 : 1,
                    }}
                    onClick={handleSend}
                    disabled={!connected || !input.trim()}
                >
                    ➤
                </button>
            </div>
        </div>
    );
}

function MessageBubble({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) {
    const time = new Date(msg.created_at * 1000).toLocaleTimeString('es', {
        hour: '2-digit', minute: '2-digit'
    });

    return (
        <div style={{
            display: 'flex',
            flexDirection: isOwn ? 'row-reverse' : 'row',
            gap: 8,
            marginBottom: 10,
            alignItems: 'flex-end',
        }}>
            {/* Avatar */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={msg.avatar
                    ? `https://cdn.discordapp.com/avatars/${msg.discord_id}/${msg.avatar}.png`
                    : `https://cdn.discordapp.com/embed/avatars/0.png`}
                alt={msg.username}
                style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }}
            />

            <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                {/* Username + time */}
                <span style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>
                    {!isOwn && <strong style={{ color: 'var(--primary-color)', marginRight: 4 }}>{msg.username}</strong>}
                    {time}
                </span>

                {/* Bubble */}
                <div style={{
                    padding: '8px 12px',
                    borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: isOwn ? 'var(--primary-color)' : 'var(--background)',
                    color: isOwn ? 'var(--background)' : 'var(--text-primary)',
                    fontSize: 13,
                    lineHeight: 1.4,
                    wordBreak: 'break-word',
                    border: isOwn ? 'none' : '1px solid var(--border-color)',
                }}>
                    {msg.content}
                </div>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--border-color)',
        borderRadius: 8,
        overflow: 'hidden',
        marginTop: 20,
        background: 'var(--background-light)',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 14px',
        borderBottom: '1px solid var(--border-color)',
    },
    messages: {
        flex: 1,
        overflowY: 'auto',
        padding: '12px 14px',
        minHeight: 200,
        maxHeight: 320,
        display: 'flex',
        flexDirection: 'column',
    },
    inputRow: {
        display: 'flex',
        gap: 8,
        padding: '10px 12px',
        borderTop: '1px solid var(--border-color)',
        background: 'var(--background)',
    },
    input: {
        flex: 1,
        background: 'var(--background-light)',
        border: '1px solid var(--border-color)',
        borderRadius: 20,
        padding: '8px 14px',
        color: 'var(--text-primary)',
        fontSize: 13,
        outline: 'none',
    },
    sendBtn: {
        background: 'var(--primary-color)',
        border: 'none',
        borderRadius: '50%',
        width: 36,
        height: 36,
        cursor: 'pointer',
        color: 'var(--background)',
        fontSize: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    lockedBox: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 24,
        border: '1px solid var(--border-color)',
        borderRadius: 8,
        marginTop: 20,
        background: 'var(--background-light)',
    },
};
