import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { ChatProvider } from '@/lib/chat-context';
import { LanguageProvider } from '@/lib/language-context';
import Navbar from '@/components/Navbar';
import ToastContainer from '@/components/ToastContainer';
import FloatingChatBar from '@/components/FloatingChatBar';

export const metadata: Metadata = {
    title: 'Wakfu LFG — Busca tu grupo para mazmorras',
    description: 'Plataforma para encontrar grupo y hacer mazmorras en Wakfu. Únete a grupos, crea tu party y conquista las mazmorras del mundo de los Doce.',
    keywords: 'wakfu, lfg, group finder, mazmorras, dungeons, online',
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
                            <ToastContainer />
                            <FloatingChatBar />
                        </ChatProvider>
                    </LanguageProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
