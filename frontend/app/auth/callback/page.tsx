'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

function CallbackHandler() {
    const params = useSearchParams();
    const { loginWithToken } = useAuth();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [retryAfterSeconds, setRetryAfterSeconds] = useState<string | null>(null);

    useEffect(() => {
        const token = params.get('token');
        const error = params.get('error');
        const retryAfter = params.get('retryAfterSeconds');

        const finishLogin = async () => {
            if (error) {
                setErrorMessage(error);
                setRetryAfterSeconds(retryAfter);
                return;
            }

            if (token) {
                await loginWithToken(token);
            }
            window.location.replace('/');
        };
        finishLogin();
    }, [params, loginWithToken]);

    if (errorMessage) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px' }}>
                <div style={{ maxWidth: 480, width: '100%', background: '#141729', color: '#fff', borderRadius: 18, padding: 28, boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)' }}>
                    <p style={{ fontSize: 28, fontWeight: 700, margin: '0 0 12px' }}>No se pudo iniciar sesion</p>
                    <p style={{ color: '#c8d0ff', lineHeight: 1.5, margin: '0 0 12px' }}>{errorMessage}</p>
                    {retryAfterSeconds && (
                        <p style={{ color: '#9fb0ff', margin: '0 0 20px' }}>
                            Vuelve a intentarlo en aproximadamente {retryAfterSeconds} segundos.
                        </p>
                    )}
                    <Link
                        href="/"
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 180, padding: '12px 18px', borderRadius: 12, background: '#5865f2', color: '#fff', textDecoration: 'none', fontWeight: 700 }}
                    >
                        Volver al inicio
                    </Link>
                </div>
            </div>
        );
    }

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
