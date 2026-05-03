'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import NotificationBell from '@/components/NotificationBellV2';
import { useLanguage, LANGUAGE_LABELS, LANGUAGE_FLAGS, Language } from '@/lib/language-context';
import { t } from '@/lib/translations';

export default function Navbar() {
    const { user, loading, logout } = useAuth();
    const { language, setLanguage } = useLanguage();
    const [isLanguageOpen, setIsLanguageOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const languageMenuRef = useRef<HTMLDivElement | null>(null);
    const mobileMenuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!languageMenuRef.current?.contains(event.target as Node)) {
                setIsLanguageOpen(false);
            }
            if (
                isMobileMenuOpen &&
                !mobileMenuRef.current?.contains(event.target as Node)
            ) {
                setIsMobileMenuOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsLanguageOpen(false);
                setIsMobileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isMobileMenuOpen]);

    // Lock body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isMobileMenuOpen]);

    const handleLogout = async () => {
        await logout();
        setIsMobileMenuOpen(false);
    };

    const handleDiscordLogin = () => {
        const authApiUrl =
            process.env.NEXT_PUBLIC_AUTH_API_URL ||
            process.env.NEXT_PUBLIC_API_URL ||
            'http://localhost:4000';
        window.location.href = `${authApiUrl}/auth/discord`;
    };

    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    return (
        <>
            <nav className="navbar">
                <div className="navbar-container navbar-container-rich">
                    {/* Logo */}
                    <Link href="/" className="navbar-logo navbar-logo-rich" onClick={closeMobileMenu}>
                        <span className="navbar-logo-badge">
                            <img
                                src="/logo.png"
                                alt="WakGroup"
                                style={{ width: 34, height: 34, objectFit: 'contain', borderRadius: 8 }}
                            />
                        </span>
                        <span className="navbar-logo-copy">
                            <strong>WakGroup</strong>
                            <small>Party Finder</small>
                        </span>
                    </Link>

                    {/* Desktop menu */}
                    <div className="navbar-menu navbar-menu-rich navbar-desktop-only">
                        <div className="navbar-links">
                            <Link href="/" className="nav-link nav-link-rich">{t('nav.groups', language)}</Link>
                            <Link href="/dungeons" className="nav-link nav-link-rich">{t('nav.dungeons', language)}</Link>
                            <Link href="/builder" className="nav-link nav-link-rich">Builder</Link>
                            <Link href="/vspvp" className="nav-link nav-link-rich">{t('nav.pvp', language)}</Link>
                            <Link href="/wiki" className="nav-link nav-link-rich">{t('nav.wiki', language)}</Link>
                        </div>

                        <div className="navbar-actions">
                            <div className="language-menu" ref={languageMenuRef}>
                                <button
                                    type="button"
                                    className={`language-trigger ${isLanguageOpen ? 'is-open' : ''}`}
                                    onClick={() => setIsLanguageOpen((prev) => !prev)}
                                    aria-haspopup="menu"
                                    aria-expanded={isLanguageOpen}
                                >
                                    <span className="language-trigger-value">
                                        <span>{LANGUAGE_FLAGS[language]}</span>
                                        <span>{LANGUAGE_LABELS[language]}</span>
                                    </span>
                                    <span className="language-trigger-caret">▾</span>
                                </button>

                                {isLanguageOpen && (
                                    <div className="language-dropdown" role="menu">
                                        {Object.entries(LANGUAGE_LABELS).map(([code, label]) => {
                                            const current = code as Language;
                                            const active = current === language;
                                            return (
                                                <button
                                                    key={code}
                                                    type="button"
                                                    className={`language-option ${active ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setLanguage(current);
                                                        setIsLanguageOpen(false);
                                                    }}
                                                    role="menuitemradio"
                                                    aria-checked={active}
                                                >
                                                    <span className="language-option-code">{code.toUpperCase()}</span>
                                                    <span className="language-option-label">
                                                        <span>{LANGUAGE_FLAGS[current]}</span>
                                                        <span>{label}</span>
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {!loading && (
                                <>
                                    {user ? (
                                        <div className="navbar-user navbar-user-rich">
                                            <NotificationBell />
                                            <Link href="/profile" className="nav-user-link nav-user-link-rich">
                                                {user.avatar ? (
                                                    <img
                                                        src={`https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png`}
                                                        alt={user.username}
                                                        className="user-avatar"
                                                    />
                                                ) : (
                                                    <div className="user-avatar-placeholder">
                                                        {user.username[0]?.toUpperCase()}
                                                    </div>
                                                )}
                                                <span className="user-name">{user.username}</span>
                                            </Link>
                                            <button className="btn btn-secondary" onClick={handleLogout}>
                                                {t('nav.logout', language)}
                                            </button>
                                        </div>
                                    ) : (
                                        <button className="btn btn-primary" onClick={handleDiscordLogin}>
                                            {t('nav.login', language)}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Mobile right side: notification bell (if user) + hamburger */}
                    <div className="navbar-mobile-right">
                        {!loading && user && (
                            <NotificationBell />
                        )}
                        <button
                            className={`hamburger-btn ${isMobileMenuOpen ? 'is-open' : ''}`}
                            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                            aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                            aria-expanded={isMobileMenuOpen}
                        >
                            <span className="hamburger-line" />
                            <span className="hamburger-line" />
                            <span className="hamburger-line" />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile menu drawer */}
            {isMobileMenuOpen && (
                <div className="mobile-menu-backdrop" onClick={closeMobileMenu} aria-hidden="true" />
            )}
            <div
                ref={mobileMenuRef}
                className={`mobile-drawer ${isMobileMenuOpen ? 'is-open' : ''}`}
                aria-hidden={!isMobileMenuOpen}
            >
                {/* Drawer header */}
                <div className="mobile-drawer-header">
                    <span className="mobile-drawer-title">Menú</span>
                    <button className="mobile-drawer-close" onClick={closeMobileMenu} aria-label="Cerrar menú">✕</button>
                </div>

                {/* User info */}
                {!loading && user && (
                    <div className="mobile-drawer-user">
                        {user.avatar ? (
                            <img
                                src={`https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png`}
                                alt={user.username}
                                className="mobile-drawer-avatar"
                            />
                        ) : (
                            <div className="user-avatar-placeholder mobile-drawer-avatar-placeholder">
                                {user.username[0]?.toUpperCase()}
                            </div>
                        )}
                        <span className="mobile-drawer-username">{user.username}</span>
                    </div>
                )}

                {/* Nav links */}
                <nav className="mobile-drawer-nav">
                    <Link href="/" className="mobile-drawer-link" onClick={closeMobileMenu}>
                        <span className="mobile-drawer-link-icon">⚔️</span>
                        {t('nav.groups', language)}
                    </Link>
                    <Link href="/dungeons" className="mobile-drawer-link" onClick={closeMobileMenu}>
                        <span className="mobile-drawer-link-icon">🏰</span>
                        {t('nav.dungeons', language)}
                    </Link>
                    <Link href="/builder" className="mobile-drawer-link" onClick={closeMobileMenu}>
                        <span className="mobile-drawer-link-icon">🛡️</span>
                        Builder
                    </Link>
                    <Link href="/vspvp" className="mobile-drawer-link" onClick={closeMobileMenu}>
                        <span className="mobile-drawer-link-icon">🏆</span>
                        {t('nav.pvp', language)}
                    </Link>
                    <Link href="/wiki" className="mobile-drawer-link" onClick={closeMobileMenu}>
                        <span className="mobile-drawer-link-icon">📖</span>
                        {t('nav.wiki', language)}
                    </Link>
                    {user && (
                        <Link href="/profile" className="mobile-drawer-link" onClick={closeMobileMenu}>
                            <span className="mobile-drawer-link-icon">👤</span>
                            Perfil
                        </Link>
                    )}
                </nav>

                {/* Language selector */}
                <div className="mobile-drawer-section">
                    <span className="mobile-drawer-section-label">Idioma</span>
                    <div className="mobile-drawer-langs">
                        {Object.entries(LANGUAGE_LABELS).map(([code, label]) => {
                            const current = code as Language;
                            const active = current === language;
                            return (
                                <button
                                    key={code}
                                    type="button"
                                    className={`mobile-drawer-lang-btn ${active ? 'active' : ''}`}
                                    onClick={() => { setLanguage(current); closeMobileMenu(); }}
                                >
                                    <span>{LANGUAGE_FLAGS[current]}</span>
                                    <span>{code.toUpperCase()}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Auth action */}
                <div className="mobile-drawer-footer">
                    {!loading && (
                        user ? (
                            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleLogout}>
                                {t('nav.logout', language)}
                            </button>
                        ) : (
                            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { handleDiscordLogin(); closeMobileMenu(); }}>
                                {t('nav.login', language)}
                            </button>
                        )
                    )}
                </div>
            </div>
        </>
    );
}
