'use client';
import { useEffect, useState } from 'react';

export default function SplashScreen() {
    const [visible, setVisible] = useState(true);
    const [fading, setFading] = useState(false);

    useEffect(() => {
        // Only show in standalone PWA mode (installed on iOS home screen)
        const isStandalone =
            ('standalone' in navigator && (navigator as any).standalone === true) ||
            window.matchMedia('(display-mode: standalone)').matches;

        if (!isStandalone) {
            setVisible(false);
            return;
        }

        // Start fade-out after 800ms
        const fadeTimer = setTimeout(() => setFading(true), 800);
        // Remove from DOM after fade completes
        const removeTimer = setTimeout(() => setVisible(false), 1300);

        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(removeTimer);
        };
    }, []);

    if (!visible) return null;

    return (
        <div
            aria-hidden="true"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
                background:
                    'radial-gradient(circle at top, rgba(212, 165, 116, 0.12), transparent 40%), ' +
                    'linear-gradient(180deg, #21180f 0%, #17110d 52%, #130e0b 100%)',
                transition: 'opacity 0.5s ease',
                opacity: fading ? 0 : 1,
                pointerEvents: 'none',
                // Respect iOS safe area
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)',
            }}
        >
            {/* Logo badge */}
            <div style={{
                width: 96,
                height: 96,
                borderRadius: 28,
                border: '1px solid rgba(212, 165, 116, 0.28)',
                background:
                    'radial-gradient(circle at top, rgba(243, 223, 197, 0.24), rgba(212, 165, 116, 0.08) 46%, rgba(0, 0, 0, 0) 78%)',
                boxShadow:
                    'inset 0 1px 0 rgba(255, 255, 255, 0.08), ' +
                    '0 24px 48px rgba(0, 0, 0, 0.36), ' +
                    '0 0 60px rgba(212, 165, 116, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'splashPulse 1.5s ease-in-out infinite',
            }}>
                <img
                    src="/logo.png"
                    alt="WakGroup"
                    style={{
                        width: 64,
                        height: 64,
                        objectFit: 'contain',
                        borderRadius: 16,
                    }}
                />
            </div>

            {/* App name */}
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: '#f5e5ca',
                    letterSpacing: '0.02em',
                    fontFamily: "'Segoe UI', 'Trebuchet MS', sans-serif",
                }}>
                    WakGroup
                </div>
                <div style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'rgba(176, 176, 176, 0.8)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    marginTop: 4,
                }}>
                    Party Finder
                </div>
            </div>

            <style>{`
                @keyframes splashPulse {
                    0%, 100% { box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 24px 48px rgba(0,0,0,0.36), 0 0 40px rgba(212,165,116,0.10); }
                    50%       { box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 24px 48px rgba(0,0,0,0.36), 0 0 70px rgba(212,165,116,0.22); }
                }
            `}</style>
        </div>
    );
}
