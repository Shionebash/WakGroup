'use client';
import { useRef, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useChat, ChatMessage, ChatSession } from '@/lib/chat-context';

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        setIsMobile(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);
    return isMobile;
}

export default function FloatingChatBar() {
    const { user } = useAuth();
    const { sessions, closeChat, toggleChat, sendMessage, markChatRead, connected } = useChat();
    const isMobile = useIsMobile();

    if (!user || sessions.length === 0) return null;

    if (isMobile) {
        return (
            <MobileChatFab
                sessions={sessions}
                onClose={closeChat}
                onToggle={toggleChat}
                onSend={sendMessage}
                onFocus={markChatRead}
                connected={connected}
                userId={user.id}
            />
        );
    }

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
            {sessions.map((session) => (
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

// ─── Mobile FAB + Bottom Sheet ────────────────────────────────────────────────

function MobileChatFab({
    sessions, onClose, onToggle, onSend, onFocus, connected, userId
}: {
    sessions: ChatSession[];
    onClose: (id: string) => void;
    onToggle: (id: string) => void;
    onSend: (id: string, msg: string) => void;
    onFocus: (id: string) => void;
    connected: boolean;
    userId: string;
}) {
    const [sheetOpen, setSheetOpen] = useState(false);
    const [activeIdx, setActiveIdx] = useState(0);

    // Total unread across all sessions
    const totalUnread = sessions.reduce((sum, s) => sum + (s.unread || 0), 0);

    const activeSession = sessions[Math.min(activeIdx, sessions.length - 1)];

    const openSheet = () => {
        setSheetOpen(true);
        if (activeSession) onFocus(activeSession.groupId);
    };

    // Lock body scroll when sheet is open
    useEffect(() => {
        document.body.style.overflow = sheetOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [sheetOpen]);

    return (
        <>
            {/* FAB bubble */}
            <button
                className="chat-fab"
                onClick={openSheet}
                aria-label={`Chat — ${sessions.length} grupo${sessions.length !== 1 ? 's' : ''}`}
            >
                <span className="chat-fab-icon">💬</span>
                {totalUnread > 0 && (
                    <span className="chat-fab-badge">{totalUnread > 9 ? '9+' : totalUnread}</span>
                )}
            </button>

            {/* Backdrop */}
            {sheetOpen && (
                <div
                    className="chat-sheet-backdrop"
                    onClick={() => setSheetOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Bottom sheet */}
            <div className={`chat-sheet ${sheetOpen ? 'is-open' : ''}`}>
                {/* Sheet handle */}
                <div className="chat-sheet-handle-area" onClick={() => setSheetOpen(false)}>
                    <div className="chat-sheet-handle" />
                </div>

                {/* Tab row (one tab per session) */}
                {sessions.length > 1 && (
                    <div className="chat-sheet-tabs">
                        {sessions.map((s, i) => (
                            <button
                                key={s.groupId}
                                className={`chat-sheet-tab ${i === activeIdx ? 'active' : ''}`}
                                onClick={() => { setActiveIdx(i); onFocus(s.groupId); }}
                            >
                                <span className="chat-sheet-tab-name">{s.groupName}</span>
                                {s.unread > 0 && <span className="chat-fab-badge">{s.unread}</span>}
                            </button>
                        ))}
                    </div>
                )}

                {/* Active chat panel inside sheet */}
                {activeSession && (
                    <MobileSheetPanel
                        session={activeSession}
                        onClose={() => { onClose(activeSession.groupId); if (sessions.length <= 1) setSheetOpen(false); }}
                        onSend={(msg) => onSend(activeSession.groupId, msg)}
                        onFocus={() => onFocus(activeSession.groupId)}
                        connected={connected}
                        userId={userId}
                    />
                )}
            </div>
        </>
    );
}

function MobileSheetPanel({
    session, onClose, onSend, onFocus, connected, userId
}: {
    session: ChatSession;
    onClose: () => void;
    onSend: (msg: string) => void;
    onFocus: () => void;
    connected: boolean;
    userId: string;
}) {
    const [input, setInput] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [session.messages]);

    const handleSend = () => {
        const trimmed = input.trim();
        if (!trimmed || !connected) return;
        onSend(trimmed);
        setInput('');
    };

    return (
        <div className="chat-sheet-body">
            {/* Header */}
            <div className="chat-sheet-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: connected ? 'var(--success-color)' : 'var(--text-secondary)',
                        display: 'inline-block',
                    }} />
                    <span className="chat-sheet-group-name">💬 {session.groupName}</span>
                </div>
                <button className="chat-sheet-close-btn" onClick={onClose} aria-label="Cerrar chat">✕</button>
            </div>

            {/* Messages */}
            <div className="chat-sheet-messages" onClick={onFocus}>
                {session.messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13, marginTop: 48 }}>
                        No hay mensajes aún. ¡Sé el primero!
                    </div>
                )}
                {session.messages.map((msg) => (
                    <MessageBubble key={msg.id} msg={msg} isOwn={msg.user_id === userId} />
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="chat-sheet-input-row">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    onFocus={onFocus}
                    placeholder={connected ? 'Escribe un mensaje...' : 'Conectando...'}
                    maxLength={500}
                    disabled={!connected}
                    className="chat-sheet-input"
                />
                <button
                    onClick={handleSend}
                    disabled={!connected || !input.trim()}
                    className="chat-sheet-send-btn"
                    aria-label="Enviar"
                >
                    ➤
                </button>
            </div>
        </div>
    );
}

// ─── Desktop Chat Panel (unchanged) ──────────────────────────────────────────

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
        <div style={{
            pointerEvents: 'all',
            width: 300,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '12px 12px 0 0',
            overflow: 'hidden',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.5)',
            border: '1px solid var(--border-color)',
            borderBottom: 'none',
            background: 'var(--background-light)',
        }}>
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
                            background: 'var(--error-color)', color: '#fff',
                            borderRadius: 10, fontSize: 10, fontWeight: 700,
                            padding: '1px 6px', flexShrink: 0,
                        }}>
                            {session.unread}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={(e) => { e.stopPropagation(); onToggle(); }} style={headerBtn} title={session.open ? 'Minimizar' : 'Expandir'}>
                        {session.open ? '⌄' : '⌃'}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={headerBtn} title="Cerrar chat">
                        ✕
                    </button>
                </div>
            </div>

            {session.open && (
                <>
                    <div onClick={onFocus} style={{
                        height: 280, overflowY: 'auto', padding: '10px 12px',
                        display: 'flex', flexDirection: 'column', gap: 6,
                        background: 'var(--background)',
                    }}>
                        {session.messages.length === 0 && (
                            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12, marginTop: 40 }}>
                                No hay mensajes aún. ¡Sé el primero!
                            </div>
                        )}
                        {session.messages.map((msg) => (
                            <MessageBubble key={msg.id} msg={msg} isOwn={msg.user_id === userId} />
                        ))}
                        <div ref={bottomRef} />
                    </div>

                    <div style={{
                        display: 'flex', gap: 6, padding: '8px 10px',
                        borderTop: '1px solid var(--border-color)',
                        background: 'var(--background-light)',
                    }}>
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={onFocus}
                            placeholder="Escribe un mensaje..."
                            maxLength={500}
                            disabled={!connected}
                            style={{
                                flex: 1, background: 'var(--background)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 16, padding: '6px 12px',
                                color: 'var(--text-primary)', fontSize: 12, outline: 'none',
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!connected || !input.trim()}
                            style={{
                                background: 'var(--primary-color)', border: 'none',
                                borderRadius: '50%', width: 30, height: 30,
                                cursor: 'pointer', color: 'var(--background)', fontSize: 13,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
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
            gap: 6, alignItems: 'flex-end',
        }}>
            <img
                src={msg.avatar
                    ? `https://cdn.discordapp.com/avatars/${msg.discord_id}/${msg.avatar}.png`
                    : `https://cdn.discordapp.com/embed/avatars/0.png`}
                alt={msg.username}
                style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0 }}
            />
            <div style={{
                maxWidth: '75%', display: 'flex', flexDirection: 'column',
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
                    fontSize: 12, lineHeight: 1.4, wordBreak: 'break-word',
                    border: isOwn ? 'none' : '1px solid var(--border-color)',
                }}>
                    {msg.content}
                </div>
            </div>
        </div>
    );
}

const headerBtn: React.CSSProperties = {
    background: 'none', border: 'none',
    color: 'var(--text-secondary)', cursor: 'pointer',
    fontSize: 14, padding: '2px 5px', borderRadius: 4, lineHeight: 1,
};
