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
    const languageMenuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!languageMenuRef.current?.contains(event.target as Node)) {
                setIsLanguageOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsLanguageOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    const handleLogout = async () => {
        await logout();
    };

    const handleDiscordLogin = () => {
        window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/auth/discord`;
    };

    return (
        <nav className="navbar">
            <div className="navbar-container navbar-container-rich">
                <Link href="/" className="navbar-logo navbar-logo-rich">
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

                <div className="navbar-menu navbar-menu-rich">
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
                                        <button
                                            className="btn btn-secondary"
                                            onClick={handleLogout}
                                        >
                                            {t('nav.logout', language)}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleDiscordLogin}
                                    >
                                        {t('nav.login', language)}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
