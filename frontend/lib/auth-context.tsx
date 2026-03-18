'use client';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';

export interface User {
    id: string;
    discord_id: string;
    username: string;
    avatar: string | null;
}

interface AuthContextValue {
    user: User | null;
    loading: boolean;
    refetch: () => void;
    loginWithToken: (token: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    loading: true,
    refetch: () => { },
    loginWithToken: async () => { },
    logout: () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const refetch = useCallback(async () => {
        try {
            const res = await api.get('/auth/me');
            setUser(res.data);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const loginWithToken = useCallback(async (token: string) => {
        localStorage.setItem('session_token', token);
        setLoading(true);
        try {
            const res = await api.get('/auth/me', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUser(res.data);
        } catch {
            localStorage.removeItem('session_token');
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('session_token');
        setUser(null);
        window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/logout?redirect=${window.location.origin}`;
    }, []);

    useEffect(() => { refetch(); }, [refetch]);

    return (
        <AuthContext.Provider value={{ user, loading, refetch, loginWithToken, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
