'use client';
import { useState, useEffect } from 'react';

interface Toast {
    id: string;
    title: string;
    body?: string;
    type: 'success' | 'error' | 'info';
}

// Global toast state
let toastQueue: Toast[] = [];
let listeners: (() => void)[] = [];

export function addToast(payload: string | { title: string; body?: string }, type: 'success' | 'error' | 'info' = 'info') {
    const id = Math.random().toString(36);
    let toast: Toast;

    if (typeof payload === 'string') {
        toast = { id, title: payload, type };
    } else {
        toast = { id, title: payload.title, body: payload.body, type };
    }

    toastQueue = [...toastQueue, toast];
    listeners.forEach(l => l());

    setTimeout(() => {
        toastQueue = toastQueue.filter(t => t.id !== id);
        listeners.forEach(l => l());
    }, 5000);
}

export default function ToastContainer() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        const listener = () => setToasts([...toastQueue]);
        listeners.push(listener);
        return () => {
            listeners = listeners.filter(l => l !== listener);
        };
    }, []);

    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <div key={toast.id} className={`toast toast-${toast.type}`} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                        {toast.type === 'success' && '✅'}
                        {toast.type === 'error' && '❌'}
                        {toast.type === 'info' && 'ℹ️'}
                        <span>{toast.title}</span>
                    </div>
                    {toast.body && <div style={{ fontSize: '0.85em', opacity: 0.9 }}>{toast.body}</div>}
                </div>
            ))}
        </div>
    );
}

