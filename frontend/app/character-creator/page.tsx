'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { t } from '@/lib/translations';
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
        document.body.classList.add('creator-route');
        return () => {
            document.body.classList.remove('creator-route');
        };
    }, []);

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
                    error: t('creator.chooseToSave', language),
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
                addToast({ title: t('creator.savedTitle', language), body: t('creator.savedBody', language).replace('{name}', selectedCharacter.name) });
            } catch (error: any) {
                const body = error.response?.data?.error || t('creator.saveErrorBody', language);
                iframeRef.current?.contentWindow?.postMessage({
                    type: 'wakgroup:appearance-save-result',
                    ok: false,
                    error: body,
                }, IFRAME_ORIGIN);
                addToast({ title: t('creator.saveErrorTitle', language), body });
            } finally {
                setSaving(false);
            }
        };

        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [language, selectedCharacter, sendAppearanceToFrame, sendConfigToFrame]);

    useEffect(() => {
        if (ready) sendConfigToFrame();
    }, [ready, sendConfigToFrame]);

    const iframeSrc = useMemo(
        () => {
            const params = new URLSearchParams({
                v: 'wakgroup-creator-9',
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
        <div className="container character-creator-page creator-app-shell" style={{ maxWidth: 1480 }}>
            <section className="app-toolbar creator-app-toolbar">
                <div className="app-toolbar-copy">
                    <span className="eyebrow">{t('creator.eyebrow', language)}</span>
                    <h1>{t('creator.title', language)}</h1>
                    <p>{t('creator.subtitle', language)}</p>
                </div>

                <div className="app-toolbar-actions creator-toolbar-actions">
                    {authLoading ? (
                        <div className="spinner" />
                    ) : user ? (
                        <>
                            <CustomSelect
                                className="creator-character-select"
                                value={selectedCharacterId}
                                onChange={(value) => setSelectedCharacterId(value)}
                                placeholder={loadingChars ? t('creator.loadingCharacters', language) : t('creator.chooseCharacter', language)}
                                options={characters.map((character) => ({
                                    value: character.id,
                                    label: `${character.name} - Nv.${character.level}`,
                                }))}
                            />
                            <Link href="/profile" className="btn btn-secondary creator-profile-btn">{t('nav.profile', language)}</Link>
                        </>
                    ) : (
                        <Link href="/profile" className="btn btn-primary">{t('creator.loginToSave', language)}</Link>
                    )}
                </div>
            </section>

            {user && characters.length === 0 && !loadingChars && (
                <div className="empty-state creator-empty">
                    <div className="empty-state-icon">WG</div>
                    <h3>{t('creator.emptyTitle', language)}</h3>
                    <p>{t('creator.emptyBody', language)}</p>
                    <Link href="/profile" className="btn btn-primary">{t('creator.createCharacter', language)}</Link>
                </div>
            )}

            <section className="creator-workbench">
                <aside className="creator-context-panel">
                    <div className="panel-head">
                        <div>
                            <span className="eyebrow">{t('creator.activeCharacter', language)}</span>
                            <h3>{selectedCharacter?.name || t('creator.noCharacter', language)}</h3>
                        </div>
                        <span className={`status-dot ${ready ? 'is-ready' : ''}`} />
                    </div>
                    <div className="creator-context-body">
                        <div className="creator-portrait-card">
                            <strong>{selectedCharacter?.name?.slice(0, 2)?.toUpperCase() || 'WG'}</strong>
                            <span>{selectedCharacter ? `Nv. ${selectedCharacter.level}` : t('creator.freeView', language)}</span>
                        </div>
                        <div className="creator-stat-grid">
                            <div>
                                <span>{t('common.server', language)}</span>
                                <strong>{selectedCharacter?.server || '-'}</strong>
                            </div>
                            <div>
                                <span>{t('creator.role', language)}</span>
                                <strong>{selectedCharacter?.role || '-'}</strong>
                            </div>
                            <div>
                                <span>{t('creator.status', language)}</span>
                                <strong>{saving ? t('common.saving', language) : ready ? t('common.ready', language) : t('common.loading', language)}</strong>
                            </div>
                        </div>
                        <p className="creator-context-note">
                            {t('creator.contextNote', language)}
                        </p>
                    </div>
                </aside>

                <div className="creator-frame-shell">
                    {saving && <div className="creator-save-badge">{t('creator.saving', language)}</div>}
                    {!ready && clientOrigin && <div className="creator-loading-badge">{t('creator.preparing', language)}</div>}
                    {clientOrigin ? (
                        <iframe
                            ref={iframeRef}
                            className="creator-frame"
                            src={iframeSrc}
                            title={t('creator.iframeTitle', language)}
                            allow="clipboard-write"
                        />
                    ) : (
                        <div className="creator-frame" />
                    )}
                </div>
            </section>
        </div>
    );
}
