import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { ChatProvider } from '@/lib/chat-context';
import { LanguageProvider } from '@/lib/language-context';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ToastContainer from '@/components/ToastContainer';
import FloatingChatBar from '@/components/FloatingChatBar';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import SplashScreen from '@/components/SplashScreen';

const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

// Next.js recognises the named `viewport` export by convention — no type annotation needed
export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
    themeColor: '#d4a574',
} as const;

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: 'WakGroup — Busca tu grupo para mazmorras',
    description: 'Plataforma para encontrar grupo y hacer mazmorras en Wakfu. Únete a grupos, crea tu party y conquista las mazmorras del mundo de los Doce.',
    keywords: 'wakfu, lfg, group finder, mazmorras, dungeons, online',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'WakGroup',
        startupImage: '/logo.png',
    },
    icons: {
        icon: '/logo.png',
        shortcut: '/logo.png',
        apple: [
            { url: '/logo.png', sizes: '180x180', type: 'image/png' },
        ],
    },
    openGraph: {
        title: 'WakGroup',
        description: 'Plataforma para encontrar grupo y hacer mazmorras en Wakfu.',
        images: ['/logo.png'],
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es" style={{ backgroundColor: '#1a1410' }}>
            <body style={{ backgroundColor: '#1a1410' }}>
                <SplashScreen />
                <ServiceWorkerRegistrar />
                <AuthProvider>
                    <LanguageProvider>
                        <ChatProvider>
                            <Navbar />
                            <main className="page-wrapper">
                                {children}
                            </main>
                            <Footer />
                            <ToastContainer />
                            <FloatingChatBar />
                        </ChatProvider>
                    </LanguageProvider>
                </AuthProvider>
            </body>
        </html>
    );
}

