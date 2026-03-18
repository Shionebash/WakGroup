'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

function CallbackHandler() {
    const router = useRouter();
    const params = useSearchParams();
    const { loginWithToken } = useAuth();

    useEffect(() => {
        const token = params.get('token');
        const finishLogin = async () => {
            if (token) {
                await loginWithToken(token);
            }
            window.location.replace('/');
        };
        finishLogin();
    }, [params, router, loginWithToken]);

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <div className="spinner" />
        </div>
    );
}

export default function AuthCallback() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div className="spinner" />
            </div>
        }>
            <CallbackHandler />
        </Suspense>
    );
}
