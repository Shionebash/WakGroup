import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { ChatProvider } from '@/lib/chat-context';
import { LanguageProvider } from '@/lib/language-context';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ToastContainer from '@/components/ToastContainer';
import FloatingChatBar from '@/components/FloatingChatBar';

const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: 'WakGroup — Busca tu grupo para mazmorras',
    description: 'Plataforma para encontrar grupo y hacer mazmorras en Wakfu. Únete a grupos, crea tu party y conquista las mazmorras del mundo de los Doce.',
    keywords: 'wakfu, lfg, group finder, mazmorras, dungeons, online',
    icons: {
        icon: '/logo.png',
        shortcut: '/logo.png',
        apple: '/logo.png',
    },
    openGraph: {
        title: 'WakGroup',
        description: 'Plataforma para encontrar grupo y hacer mazmorras en Wakfu.',
        images: ['/logo.png'],
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es">
            <body>
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
