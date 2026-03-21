'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import NotificationBell from '@/components/NotificationBellV2';
import { useLanguage, LANGUAGE_LABELS, LANGUAGE_FLAGS, Language } from '@/lib/language-context';
import { t } from '@/lib/translations';

export default function Navbar() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const { language, setLanguage } = useLanguage();

    const handleLogout = async () => {
        await logout();
    };

    const handleDiscordLogin = () => {
        window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/auth/discord`;
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link href="/" className="navbar-logo">
                    <img
                        src="/logo.png"
                        alt="WakGroup"
                        style={{ width: 34, height: 34, objectFit: 'contain', borderRadius: 8 }}
                    />
                    <span>WakGroup</span>
                </Link>

                <div className="navbar-menu">
                    <Link href="/" className="nav-link">{t('nav.groups', language)}</Link>
                    <Link href="/dungeons" className="nav-link">{t('nav.dungeons', language)}</Link>
                    <Link href="/vspvp" className="nav-link">{t('nav.pvp', language)}</Link>
                    <Link href="/wiki" className="nav-link">{t('nav.wiki', language)}</Link>

                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as Language)}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            color: '#fff',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: 4,
                            padding: '4px 8px',
                            marginLeft: 8,
                            fontSize: 12,
                            cursor: 'pointer',
                        }}
                    >
                        {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                            <option key={code} value={code} style={{ background: '#1a1a2e' }}>
                                {LANGUAGE_FLAGS[code as Language]} {label}
                            </option>
                        ))}
                    </select>

                    {!loading && (
                        <>
                            {user ? (
                                <div className="navbar-user">
                                    <NotificationBell />

                                    <Link href="/profile" className="nav-user-link">
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
                                        style={{ marginLeft: 8 }}
                                    >
                                        Logout
                                    </button>
                                </div>
                            ) : (
                                <button
                                    className="btn btn-primary"
                                    onClick={handleDiscordLogin}
                                >
                                    🔑 Login con Discord
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
