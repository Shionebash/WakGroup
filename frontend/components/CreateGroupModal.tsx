'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, getAssetUrl } from '@/lib/api';
import CustomSelect from '@/components/CustomSelect';
import { useLanguage } from '@/lib/language-context';
import { t, getDungeonApiName, getItemTitle } from '@/lib/translations';

interface CreateGroupModalProps {
    onClose: () => void;
    onCreated: () => void;
    prefillDungeonId?: number | null;
}

export default function CreateGroupModal({ onClose, onCreated, prefillDungeonId }: CreateGroupModalProps) {
    const { user } = useAuth();
    const { language } = useLanguage();
    const [characters, setCharacters] = useState<any[]>([]);
    const [dungeons, setDungeons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        character_id: '',
        dungeon_id: prefillDungeonId ? String(prefillDungeonId) : '',
        title: '',
        stasis: 1,
        server: 'Ogrest',
        steles_active: false,
        steles_count: 1,
        intervention_active: false,
        steles_drops: [] as number[],
    });

    const [error, setError] = useState<string | null>(null);
    const [showDrops, setShowDrops] = useState(false);
    const [dungeonSearch, setDungeonSearch] = useState('');
    const [dungeonOpen, setDungeonOpen] = useState(false);
    const [bossDrops, setBossDrops] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [charsRes, dungeonsRes] = await Promise.all([
                    api.get('/characters'),
                    api.get('/dungeons'),
                ]);
                setCharacters(charsRes.data);
                setDungeons((dungeonsRes.data || []).filter((d: any) => d?.isActive !== false));
            } catch (err) {
                setError(t('group.errorLoadData', language));
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const selectedDungeonId = formData.dungeon_id ? Number(formData.dungeon_id) : null;
    const selectedDungeon = selectedDungeonId ? dungeons.find(d => Number(d.id) === selectedDungeonId) : null;
    const hasSteles = !!selectedDungeon?.steles;
    const stelesLvl = Number(selectedDungeon?.steleslvl || 0);
    const hasIntervention = !!selectedDungeon?.intervention;
    const bossId = selectedDungeon?.jefeId ? String(selectedDungeon.jefeId) : null;
    const dropItems = bossDrops.map((d: any) => {
        const itemId = Number(d?.id);
        const dropRate = d?.dropRate;
        const gfxId = d?.graphic_parameters?.gfxId ?? null;
        const title = getItemTitle(d, language) || `Item ${itemId}`;
        return { itemId, dropRate, gfxId, title };
    });

    useEffect(() => {
        if (!bossId) {
            setBossDrops([]);
            return;
        }
        api.get(`/mobs/${bossId}/drops`)
            .then(r => setBossDrops(r.data || []))
            .catch(() => setBossDrops([]));
    }, [bossId]);

    useEffect(() => {
        if (!hasSteles) {
            setFormData(prev => ({ ...prev, steles_active: false, steles_count: 1, steles_drops: [] }));
            setShowDrops(false);
        } else if (stelesLvl && formData.steles_count > stelesLvl) {
            setFormData(prev => ({ ...prev, steles_count: 1 }));
        }
        if (!hasIntervention && formData.intervention_active) {
            setFormData(prev => ({ ...prev, intervention_active: false }));
        }
    }, [hasSteles, stelesLvl, hasIntervention, formData.steles_count, formData.intervention_active]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            await api.post('/groups', {
                leader_char_id: formData.character_id,
                dungeon_id: Number(formData.dungeon_id),
                title: formData.title,
                stasis: Number(formData.stasis),
                steles_active: formData.steles_active,
                steles_count: formData.steles_active ? Number(formData.steles_count) : 1,
                intervention_active: formData.intervention_active,
                steles_drops: formData.steles_active ? formData.steles_drops : [],
                server: formData.server,
            });
            onCreated();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.error || t('group.errorCreate', language));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                style={{ display: 'flex', gap: 12, alignItems: 'stretch', width: 'fit-content', margin: '0 16px', maxHeight: '90vh' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="modal" style={{ flex: '0 0 520px', overflowY: 'auto' }}>
                <div className="modal-header">
                    <h2>{t('group.createTitle', language)}</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                {loading ? (
                    <div className="modal-body">{t('common.loading', language)}</div>
                ) : (
                    <form onSubmit={handleSubmit} className="modal-body">
                        {error && <div className="error-message">{error}</div>}

                        <div className="form-group">
                            <label>{t('group.character', language)}</label>
                            <CustomSelect
                                value={formData.character_id}
                                onChange={e => setFormData({ ...formData, character_id: e })}
                                placeholder={t('group.selectCharacter', language)}
                                options={characters.map(char => ({
                                    value: String(char.id),
                                    label: `${char.name} - ${char.class_name} Nv. ${char.level}`,
                                }))}
                            />
                        </div>

                        <div className="form-group" style={{ position: 'relative' }}>
                            <label>{t('group.dungeon', language)}</label>
                            <input
                                type="text"
                                placeholder={t('dungeons.searchPlaceholder', language)}
                                value={dungeonSearch !== '' ? dungeonSearch : (formData.dungeon_id ? (() => {
                                    const selected = dungeons.find(d => String(d.id) === formData.dungeon_id);
                                    return getDungeonApiName(selected, language) || '';
                                })() : '')}
                                onChange={e => {
                                    setDungeonSearch(e.target.value);
                                    setDungeonOpen(true);
                                    if (!e.target.value) setFormData(prev => ({ ...prev, dungeon_id: '' }));
                                }}
                                onFocus={() => {
                                    setDungeonSearch('');
                                    setDungeonOpen(true);
                                }}
                                onBlur={() => setTimeout(() => setDungeonOpen(false), 150)}
                                autoComplete="off"
                            />
                            {dungeonOpen && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    zIndex: 100,
                                    background: '#242019',
                                    border: '1px solid #4a4035',
                                    borderRadius: 8,
                                    maxHeight: 220,
                                    overflowY: 'auto',
                                    boxShadow: '0 8px 28px rgba(0,0,0,0.7)',
                                }}>
                                    {dungeons
                                        .filter(d => {
                                            const q = dungeonSearch.toLowerCase();
                                            const name = getDungeonApiName(d, language).toLowerCase();
                                            return !q || name.includes(q) || String(d.modulated).includes(q);
                                        })
                                        .map(dungeon => (
                                            <div
                                                key={dungeon.id}
                                                onMouseDown={() => {
                                                    setFormData(prev => ({ ...prev, dungeon_id: String(dungeon.id) }));
                                                    setDungeonSearch('');
                                                    setDungeonOpen(false);
                                                }}
                                                style={{
                                                    padding: '8px 12px',
                                                    cursor: 'pointer',
                                                    fontSize: 13,
                                                    color: 'var(--text-primary)',
                                                    background: String(dungeon.id) === formData.dungeon_id ? 'rgba(212,165,116,0.15)' : 'transparent',
                                                    borderBottom: '1px solid #4a4035',
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.background = '#2e2820')}
                                                onMouseLeave={e => (e.currentTarget.style.background = String(dungeon.id) === formData.dungeon_id ? 'rgba(212,165,116,0.15)' : 'transparent')}
                                            >
                                                {getDungeonApiName(dungeon, language)} <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{t('common.levelShort', language)} {dungeon.modulated}</span>
                                            </div>
                                        ))
                                    }
                                    {dungeons.filter(d => {
                                        const q = dungeonSearch.toLowerCase();
                                        const name = getDungeonApiName(d, language).toLowerCase();
                                        return !q || name.includes(q) || String(d.modulated).includes(q);
                                    }).length === 0 && (
                                        <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{t('common.noResults', language)}</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {selectedDungeon && (
                            <div style={{ marginTop: -4, marginBottom: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                                {t('common.players', language)}: {selectedDungeon.max_players || selectedDungeon.players || 6}
                            </div>
                        )}

                        <div className="form-group">
                            <label>{t('group.titleOptional', language)}</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder={t('group.titlePlaceholder', language)}
                                maxLength={100}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>{t('common.stasis', language)}</label>
                                <CustomSelect
                                    value={String(formData.stasis)}
                                    onChange={e => setFormData({ ...formData, stasis: Number(e) })}
                                    options={Array.from({ length: 10 }, (_, i) => i + 1).map(n => ({ value: String(n), label: `Stasis ${n}` }))}
                                />
                            </div>

                            <div className="form-group">
                                <label>{t('common.server', language)}</label>
                                <CustomSelect
                                    value={formData.server}
                                    onChange={e => setFormData({ ...formData, server: e })}
                                    options={['Ogrest', 'Rubilax', 'Pandora'].map(server => ({ value: server, label: server }))}
                                />
                            </div>
                        </div>

                        {hasSteles && (
                            <div style={{ marginTop: 6 }}>
                                <div className="form-group">
                                    <label>{t('group.stelesActive', language)}</label>
                                    <CustomSelect
                                        value={formData.steles_active ? 'yes' : 'no'}
                                        onChange={e => {
                                            const enabled = e === 'yes';
                                            setFormData(prev => ({ ...prev, steles_active: enabled }));
                                            if (!enabled) setShowDrops(false);
                                        }}
                                        options={[
                                            { value: 'no', label: t('common.no', language) },
                                            { value: 'yes', label: t('common.yes', language) },
                                        ]}
                                    />
                                </div>

                                {formData.steles_active && (
                                    <div>
                                        <div>
                                            <div className="form-group">
                                                <label>{t('group.stelesCount', language)}</label>
                                                <CustomSelect
                                                    value={String(formData.steles_count)}
                                                    onChange={e => setFormData({ ...formData, steles_count: Number(e) })}
                                                    options={Array.from({ length: Math.max(1, stelesLvl) }, (_, i) => i + 1).map(n => ({ value: String(n), label: String(n) }))}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                className="btn btn-ghost"
                                                onClick={() => setShowDrops(v => !v)}
                                                style={{ marginTop: 6 }}
                                            >
                                                {showDrops ? t('group.dropsHide', language) : t('group.dropsShow', language)}
                                            </button>
                                        </div>

                                    </div>
                                )}
                            </div>
                        )}

                        {hasIntervention && (
                            <div className="form-group" style={{ marginTop: 6 }}>
                                <label>{t('common.intervention', language)}</label>
                                <CustomSelect
                                    value={formData.intervention_active ? 'yes' : 'no'}
                                    onChange={e => setFormData({ ...formData, intervention_active: e === 'yes' })}
                                    options={[
                                        { value: 'no', label: t('common.no', language) },
                                        { value: 'yes', label: t('common.yes', language) },
                                    ]}
                                />
                            </div>
                        )}

                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>
                                {t('common.cancel', language)}
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                                {submitting ? t('group.creating', language) : t('group.create', language)}
                            </button>
                        </div>
                    </form>
                )}
                </div>
            </div>

            {showDrops && (
                <div
                    className="modal"
                    style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', minHeight: 0 }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="modal-header">
                        <h2>{t('group.dropsShow', language)}</h2>
                        <button className="modal-close" type="button" onClick={() => setShowDrops(false)}>✕</button>
                    </div>
                    <div className="modal-body" style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
                        {dropItems.length === 0 ? (
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('group.noDrops', language)}</div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 4 }}>
                                {dropItems.map((d: any) => {
                                    const imgPath = d.gfxId ? `assets/items/${d.gfxId}.png` : 'assets/items/0000000.png';
                                    const isSelected = formData.steles_drops.includes(d.itemId);
                                    return (
                                        <button
                                            key={`${d.itemId}-${d.dropRate}`}
                                            type="button"
                                            onClick={() => {
                                                setFormData(prev => {
                                                    const exists = prev.steles_drops.includes(d.itemId);
                                                    const next = exists
                                                        ? prev.steles_drops.filter(id => id !== d.itemId)
                                                        : [...prev.steles_drops, d.itemId];
                                                    return { ...prev, steles_drops: next };
                                                });
                                            }}
                                            style={{
                                                position: 'relative',
                                                textAlign: 'center',
                                                background: isSelected ? 'rgba(34,197,94,0.12)' : 'transparent',
                                                border: `1px solid ${isSelected ? '#22c55e' : 'var(--border)'}`,
                                                borderRadius: 10,
                                                padding: '3px 2px',
                                                cursor: 'pointer',
                                                boxShadow: isSelected ? '0 0 12px rgba(34,197,94,0.35)' : 'none',
                                            }}
                                            title={d.title}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={getAssetUrl(imgPath)}
                                                alt={`Item ${d.itemId}`}
                                                style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--bg-dark)', display: 'block', margin: '0 auto' }}
                                            />
                                            <div style={{ fontSize: 10, color: 'var(--text-primary)', marginTop: 2, lineHeight: 1.2, wordBreak: 'break-word' }}>
                                                {d.title}
                                            </div>
                                            <div style={{ fontSize: 9, color: '#ffffff', marginTop: 1 }}>{d.dropRate}</div>
                                            {isSelected && (
                                                <span style={{
                                                    position: 'absolute',
                                                    top: 4,
                                                    right: 4,
                                                    width: 16,
                                                    height: 16,
                                                    borderRadius: '50%',
                                                    background: '#22c55e',
                                                    color: '#0a0a0a',
                                                    fontSize: 11,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 900,
                                                }}>✓</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
