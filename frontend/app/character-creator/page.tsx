'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { api } from '@/lib/api';
import CustomSelect from '@/components/CustomSelect';
import { addToast } from '@/components/ToastContainer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const IFRAME_ORIGIN = new URL(API_URL).origin;

function parseAppearance(raw: unknown) {
    if (!raw || typeof raw !== 'string') return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export default function CharacterCreatorPage() {
    const { user, loading: authLoading } = useAuth();
    const { language } = useLanguage();
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [characters, setCharacters] = useState<any[]>([]);
    const [selectedCharacterId, setSelectedCharacterId] = useState('');
    const [loadingChars, setLoadingChars] = useState(false);
    const [saving, setSaving] = useState(false);
    const [ready, setReady] = useState(false);
    const [clientOrigin, setClientOrigin] = useState('');

    const selectedCharacter = useMemo(
        () => characters.find((item) => item.id === selectedCharacterId) || null,
        [characters, selectedCharacterId],
    );

    const sendAppearanceToFrame = useCallback((character: any | null) => {
        if (!iframeRef.current?.contentWindow || !character) return;
        const appearance = parseAppearance(character.appearance_config);
        if (!appearance) return;
        iframeRef.current.contentWindow.postMessage({
            type: 'wakgroup:appearance-load',
            appearance,
        }, IFRAME_ORIGIN);
    }, []);

    const sendConfigToFrame = useCallback(() => {
        if (!iframeRef.current?.contentWindow) return;
        iframeRef.current.contentWindow.postMessage({
            type: 'wakgroup:creator-config',
            language,
        }, IFRAME_ORIGIN);
    }, [language]);

    const fetchCharacters = useCallback(async () => {
        if (!user) return;
        setLoadingChars(true);
        try {
            const response = await api.get('/characters');
            const nextCharacters = response.data || [];
            const requestedCharacterId = new URLSearchParams(window.location.search).get('characterId') || '';
            setCharacters(nextCharacters);
            setSelectedCharacterId((current) => (
                current ||
                (nextCharacters.some((item: any) => item.id === requestedCharacterId) ? requestedCharacterId : '') ||
                nextCharacters[0]?.id ||
                ''
            ));
        } finally {
            setLoadingChars(false);
        }
    }, [user]);

    useEffect(() => {
        fetchCharacters();
    }, [fetchCharacters]);

    useEffect(() => {
        setClientOrigin(window.location.origin);
    }, []);

    useEffect(() => {
        if (ready) sendAppearanceToFrame(selectedCharacter);
    }, [ready, selectedCharacter, sendAppearanceToFrame]);

    useEffect(() => {
        const onMessage = async (event: MessageEvent) => {
            if (event.origin !== IFRAME_ORIGIN) return;
            const message = event.data || {};
            if (message.type === 'wakgroup:creator-ready') {
                setReady(true);
                sendConfigToFrame();
                sendAppearanceToFrame(selectedCharacter);
                return;
            }

            if (message.type !== 'wakgroup:appearance-save') return;
            if (!selectedCharacter) {
                iframeRef.current?.contentWindow?.postMessage({
                    type: 'wakgroup:appearance-save-result',
                    ok: false,
                    error: 'Elige un personaje de WakGroup para guardar.',
                }, IFRAME_ORIGIN);
                return;
            }

            setSaving(true);
            try {
                const payload = {
                    name: selectedCharacter.name,
                    level: Number(selectedCharacter.level),
                    class_id: Number(selectedCharacter.class_id),
                    role: selectedCharacter.role,
                    server: selectedCharacter.server,
                    appearance_config: JSON.stringify(message.appearance || {}),
                };
                await api.put(`/characters/${selectedCharacter.id}`, payload);
                setCharacters((current) => current.map((item) => (
                    item.id === selectedCharacter.id
                        ? { ...item, appearance_config: payload.appearance_config }
                        : item
                )));
                iframeRef.current?.contentWindow?.postMessage({ type: 'wakgroup:appearance-save-result', ok: true }, IFRAME_ORIGIN);
                addToast({ title: 'Apariencia guardada', body: `${selectedCharacter.name} ya tiene su apariencia visual.` });
            } catch (error: any) {
                const body = error.response?.data?.error || 'No se pudo guardar la apariencia.';
                iframeRef.current?.contentWindow?.postMessage({
                    type: 'wakgroup:appearance-save-result',
                    ok: false,
                    error: body,
                }, IFRAME_ORIGIN);
                addToast({ title: 'Error al guardar', body });
            } finally {
                setSaving(false);
            }
        };

        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [selectedCharacter, sendAppearanceToFrame, sendConfigToFrame]);

    useEffect(() => {
        if (ready) sendConfigToFrame();
    }, [ready, sendConfigToFrame]);

    const iframeSrc = useMemo(
        () => {
            const params = new URLSearchParams({
                v: 'wakgroup-creator-8',
                lang: language,
            });
            if (clientOrigin) params.set('parentOrigin', clientOrigin);
            return `${API_URL}/assets/character-creator/index.html?${params.toString()}`;
        },
        [clientOrigin, language],
    );

    useEffect(() => {
        setReady(false);
    }, [iframeSrc]);

    return (
        <div className="container character-creator-page" style={{ paddingTop: 16, paddingBottom: 32, maxWidth: 1480 }}>
            <section className="creator-toolbar">
                <div className="creator-toolbar-copy">
                    <h1 className="title-gold creator-title">Creador visual</h1>
                    <p>
                        Diseña la apariencia de tus personajes y guárdala en tu perfil.
                    </p>
                </div>

                <div className="creator-toolbar-actions">
                    {authLoading ? (
                        <div className="spinner" />
                    ) : user ? (
                        <>
                            <CustomSelect
                                className="creator-character-select"
                                value={selectedCharacterId}
                                onChange={(value) => setSelectedCharacterId(value)}
                                placeholder={loadingChars ? 'Cargando personajes...' : 'Elige personaje'}
                                options={characters.map((character) => ({
                                    value: character.id,
                                    label: `${character.name} - Nv.${character.level}`,
                                }))}
                            />
                            <Link href="/profile" className="btn btn-secondary creator-profile-btn">Perfil</Link>
                        </>
                    ) : (
                        <Link href="/profile" className="btn btn-primary">Iniciar sesión para guardar</Link>
                    )}
                </div>
            </section>

            {user && characters.length === 0 && !loadingChars && (
                <div className="empty-state creator-empty">
                    <div className="empty-state-icon">WG</div>
                    <h3>Primero crea un personaje</h3>
                    <p>El creador puede abrirse sin personaje, pero necesitas uno en tu perfil para guardar la apariencia.</p>
                    <Link href="/profile" className="btn btn-primary">Crear personaje</Link>
                </div>
            )}

            <section className="creator-frame-shell">
                {saving && <div className="creator-save-badge">Guardando...</div>}
                {clientOrigin ? (
                    <iframe
                        ref={iframeRef}
                        className="creator-frame"
                        src={iframeSrc}
                        title="Creador visual WakGroup"
                        allow="clipboard-write"
                    />
                ) : (
                    <div className="creator-frame" />
                )}
            </section>
        </div>
    );
}
