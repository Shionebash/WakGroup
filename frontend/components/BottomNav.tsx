'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useLanguage, LANGUAGE_LABELS, LANGUAGE_FLAGS, Language } from '@/lib/language-context';

/* ── Tabs ─────────────────────────────────────────────────── */
const TABS = [
    { id: 'home',     href: '/',         label: 'Grupos',    icon: 'home'    },
    { id: 'dungeons', href: '/dungeons', label: 'Mazmorras', icon: 'castle'  },
    { id: 'pvp',      href: '/vspvp',    label: 'PvP',       icon: 'pvp'     },
    { id: 'profile',  href: '/profile',  label: 'Perfil',    icon: 'user'    },
    { id: 'more',     href: null,        label: 'Más',       icon: 'more'    },
] as const;

const MORE_ITEMS = [
    { href: '/builder',           label: 'Builder', emoji: '🛡️', desc: 'Arma tu build perfecta'               },
    { href: '/character-creator', label: 'Creador', emoji: '⭐', desc: 'Diseña la apariencia de tu personaje' },
    { href: '/wiki',              label: 'Wiki',    emoji: '📖', desc: 'Guías y estrategias'                  },
];

/* ── SVG icons ────────────────────────────────────────────── */
function NavIcon({ name, color }: { name: string; color: string }) {
    const s = { flexShrink: 0 as const };
    if (name === 'home') return (
        <svg width={22} height={22} viewBox="0 0 24 24" style={s}>
            <path d="M3 12L12 3l9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"
                fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
    if (name === 'castle') return (
        <svg width={22} height={22} viewBox="0 0 24 24" style={s}>
            <rect x="3" y="11" width="18" height="11" rx="1" fill="none" stroke={color} strokeWidth="2"/>
            <path d="M3 11V5h3v2h3V5h3v2h3V5h3v6" fill="none" stroke={color} strokeWidth="2"/>
            <rect x="9" y="15" width="6" height="7" fill="none" stroke={color} strokeWidth="2"/>
        </svg>
    );
    if (name === 'pvp') return (
        <svg width={22} height={22} viewBox="0 0 24 24" style={s}>
            <circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="2"/>
            <path d="M8.5 14.5L12 9l3.5 5.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="9.5" y1="13" x2="14.5" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        </svg>
    );
    if (name === 'user') return (
        <svg width={22} height={22} viewBox="0 0 24 24" style={s}>
            <circle cx="12" cy="8" r="4" fill="none" stroke={color} strokeWidth="2"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        </svg>
    );
    // 'more' — 3×3 dots grid
    return (
        <div style={{ width: 22, height: 22, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3, alignItems: 'center', justifyItems: 'center', padding: 2 }}>
            {[...Array(9)].map((_, i) => (
                <div key={i} style={{ width: i === 4 ? 5 : 4, height: i === 4 ? 5 : 4, borderRadius: '50%', background: color, transition: 'background 0.18s' }}/>
            ))}
        </div>
    );
}

/* ── Component ────────────────────────────────────────────── */
export default function BottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const [moreOpen, setMoreOpen] = useState(false);
    const { user, loading, logout } = useAuth();
    const { language, setLanguage } = useLanguage();

    const secondaryPaths = MORE_ITEMS.map(i => i.href);
    const isSecondaryActive = secondaryPaths.some(p => pathname.startsWith(p));

    const isActive = (tab: typeof TABS[number]) => {
        if (tab.id === 'more')     return isSecondaryActive;
        if (tab.href === '/')      return pathname === '/';
        return tab.href ? pathname.startsWith(tab.href) : false;
    };

    return (
        <>
            {/* ── More sheet ──────────────────────────── */}
            {moreOpen && (
                <div className="bottom-nav-more-overlay" onClick={() => setMoreOpen(false)}>
                    <div className="bottom-nav-more-sheet" onClick={e => e.stopPropagation()}>
                        <div className="bottom-nav-more-handle"/>
                        <div className="bottom-nav-more-title">Más secciones</div>
                        {MORE_ITEMS.map(item => (
                            <button
                                key={item.href}
                                className="bottom-nav-more-item press-fx"
                                onClick={() => { router.push(item.href); setMoreOpen(false); }}
                            >
                                <span className="bottom-nav-more-icon">{item.emoji}</span>
                                <div style={{ flex: 1 }}>
                                    <div className="bottom-nav-more-item-label">{item.label}</div>
                                    <div className="bottom-nav-more-item-desc">{item.desc}</div>
                                </div>
                                <span className="bottom-nav-more-chev">›</span>
                            </button>
                        ))}

                        {/* Language selector */}
                        <div className="bottom-nav-more-section-label">Idioma</div>
                        <div className="bottom-nav-more-langs">
                            {(Object.entries(LANGUAGE_LABELS) as [Language, string][]).map(([code, label]) => (
                                <button
                                    key={code}
                                    className={`bottom-nav-more-lang-btn press-fx${language === code ? ' active' : ''}`}
                                    onClick={() => setLanguage(code)}
                                >
                                    <span>{LANGUAGE_FLAGS[code]}</span>
                                    <span>{code.toUpperCase()}</span>
                                </button>
                            ))}
                        </div>

                        {/* Auth action */}
                        {!loading && (
                            <div style={{ marginTop: 12 }}>
                                {user ? (
                                    <button
                                        className="btn btn-secondary press-fx"
                                        style={{ width: '100%' }}
                                        onClick={() => { logout(); setMoreOpen(false); }}
                                    >
                                        Cerrar sesión
                                    </button>
                                ) : (
                                    <button
                                        className="btn btn-primary press-fx"
                                        style={{ width: '100%' }}
                                        onClick={() => { router.push('/profile'); setMoreOpen(false); }}
                                    >
                                        Iniciar sesión
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Nav bar ─────────────────────────────── */}
            <nav className="bottom-nav-mobile">
                {TABS.map(tab => {
                    const active = isActive(tab);
                    const color = active ? '#d4a574' : '#5e5448';
                    return (
                        <button
                            key={tab.id}
                            className={`bottom-nav-tab press-fx${active ? ' active' : ''}`}
                            onClick={() => tab.id === 'more' ? setMoreOpen(true) : router.push(tab.href!)}
                            aria-label={tab.label}
                        >
                            {active && <span className="bottom-nav-indicator"/>}
                            <NavIcon name={tab.icon} color={color}/>
                            <span className="bottom-nav-label">{tab.label}</span>
                        </button>
                    );
                })}
            </nav>
        </>
    );
}
