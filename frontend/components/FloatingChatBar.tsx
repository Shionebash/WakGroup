'use client';
import { useRef, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useChat, ChatMessage, ChatSession } from '@/lib/chat-context';

export default function FloatingChatBar() {
    const { user } = useAuth();
    const { sessions, closeChat, toggleChat, sendMessage, markChatRead, connected } = useChat();

    if (!user || sessions.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            right: 20,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 12,
            zIndex: 900,
            pointerEvents: 'none',
        }}>
            {sessions.map((session, i) => (
                <ChatPanel
                    key={session.groupId}
                    session={session}
                    onClose={() => closeChat(session.groupId)}
                    onToggle={() => toggleChat(session.groupId)}
                    onSend={(msg) => sendMessage(session.groupId, msg)}
                    onFocus={() => markChatRead(session.groupId)}
                    connected={connected}
                    userId={user.id}
                />
            ))}
        </div>
    );
}

function ChatPanel({
    session, onClose, onToggle, onSend, onFocus, connected, userId
}: {
    session: ChatSession;
    onClose: () => void;
    onToggle: () => void;
    onSend: (msg: string) => void;
    onFocus: () => void;
    connected: boolean;
    userId: string;
}) {
    const [input, setInput] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (session.open) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [session.messages, session.open]);

    const handleSend = () => {
        const trimmed = input.trim();
        if (!trimmed || !connected) return;
        onSend(trimmed);
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div
            style={{
                pointerEvents: 'all',
                width: 300,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: session.open ? '12px 12px 0 0' : '12px 12px 0 0',
                overflow: 'hidden',
                boxShadow: '0 -4px 24px rgba(0,0,0,0.5)',
                border: '1px solid var(--border-color)',
                borderBottom: 'none',
                background: 'var(--background-light)',
            }}
        >
            {/* Header / toggle bar */}
            <div
                onClick={onToggle}
                onFocus={onFocus}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: 'var(--secondary-color)',
                    borderBottom: session.open ? '1px solid var(--border-color)' : 'none',
                    cursor: 'pointer',
                    userSelect: 'none',
                    gap: 8,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                    {/* Connection dot */}
                    <span style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: connected ? 'var(--success-color)' : 'var(--text-secondary)',
                    }} />
                    <span style={{
                        fontSize: 13, fontWeight: 600, color: 'var(--primary-color)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        💬 {session.groupName}
                    </span>
                    {session.unread > 0 && (
                        <span style={{
                            background: 'var(--error-color)',
                            color: '#fff',
                            borderRadius: 10,
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '1px 6px',
                            flexShrink: 0,
                        }}>
                            {session.unread}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                        onClick={e => { e.stopPropagation(); onToggle(); }}
                        style={headerBtn}
                        title={session.open ? 'Minimizar' : 'Expandir'}
                    >
                        {session.open ? '⌄' : '⌃'}
                    </button>
                    <button
                        onClick={e => { e.stopPropagation(); onClose(); }}
                        style={headerBtn}
                        title="Cerrar chat"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Messages area */}
            {session.open && (
                <>
                    <div
                        onClick={onFocus}
                        style={{
                            height: 280,
                            overflowY: 'auto',
                            padding: '10px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                            background: 'var(--background)',
                        }}
                    >
                        {session.messages.length === 0 && (
                            <div style={{
                                textAlign: 'center', color: 'var(--text-secondary)',
                                fontSize: 12, marginTop: 40,
                            }}>
                                No hay mensajes aún. ¡Sé el primero!
                            </div>
                        )}
                        {session.messages.map(msg => (
                            <MessageBubble
                                key={msg.id}
                                msg={msg}
                                isOwn={msg.user_id === userId}
                            />
                        ))}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div style={{
                        display: 'flex',
                        gap: 6,
                        padding: '8px 10px',
                        borderTop: '1px solid var(--border-color)',
                        background: 'var(--background-light)',
                    }}>
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={onFocus}
                            placeholder="Escribe un mensaje..."
                            maxLength={500}
                            disabled={!connected}
                            style={{
                                flex: 1,
                                background: 'var(--background)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 16,
                                padding: '6px 12px',
                                color: 'var(--text-primary)',
                                fontSize: 12,
                                outline: 'none',
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!connected || !input.trim()}
                            style={{
                                background: 'var(--primary-color)',
                                border: 'none',
                                borderRadius: '50%',
                                width: 30,
                                height: 30,
                                cursor: 'pointer',
                                color: 'var(--background)',
                                fontSize: 13,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                opacity: (!connected || !input.trim()) ? 0.4 : 1,
                            }}
                        >
                            ➤
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

function MessageBubble({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) {
    const time = new Date(msg.created_at * 1000).toLocaleTimeString('es', {
        hour: '2-digit', minute: '2-digit',
    });

    return (
        <div style={{
            display: 'flex',
            flexDirection: isOwn ? 'row-reverse' : 'row',
            gap: 6,
            alignItems: 'flex-end',
        }}>
            <img
                src={msg.avatar
                    ? `https://cdn.discordapp.com/avatars/${msg.discord_id}/${msg.avatar}.png`
                    : `https://cdn.discordapp.com/embed/avatars/0.png`}
                alt={msg.username}
                style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0 }}
            />
            <div style={{
                maxWidth: '75%', display: 'flex',
                flexDirection: 'column',
                alignItems: isOwn ? 'flex-end' : 'flex-start',
            }}>
                <span style={{ fontSize: 9, color: 'var(--text-secondary)', marginBottom: 2 }}>
                    {!isOwn && <strong style={{ color: 'var(--primary-color)', marginRight: 3 }}>{msg.username}</strong>}
                    {time}
                </span>
                <div style={{
                    padding: '6px 10px',
                    borderRadius: isOwn ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                    background: isOwn ? 'var(--primary-color)' : 'var(--background-light)',
                    color: isOwn ? 'var(--background)' : 'var(--text-primary)',
                    fontSize: 12,
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

const headerBtn: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: 14,
    padding: '2px 5px',
    borderRadius: 4,
    lineHeight: 1,
};
