'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import CustomSelect from '@/components/CustomSelect';

interface CreatePvpGroupModalProps {
    onClose: () => void;
    onCreated: () => void;
}

const PVP_MODES = ['1v1', '2v2', '3v3', '4v4', '5v5', '6v6'];
const BAND_OPTIONS = [20, 35, 50, 65, 80, 95, 110, 125, 140, 155, 170, 185, 200, 215, 230, 245];

const PVP_MODE_COLORS: Record<string, string> = {
    '1v1': '#e57373',
    '2v2': '#ffb74d',
    '3v3': '#64b5f6',
    '4v4': '#4db6ac',
    '5v5': '#9575cd',
    '6v6': '#f06292',
};

export default function CreatePvpGroupModal({ onClose, onCreated }: CreatePvpGroupModalProps) {
    const { user } = useAuth();
    const [characters, setCharacters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        character_id: '',
        title: '',
        pvp_mode: '1v1',
        equipment_band: 200,
        server: 'Ogrest',
    });

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.get('/characters')
            .then(r => setCharacters(r.data))
            .catch(() => setError('Error al cargar personajes'))
            .finally(() => setLoading(false));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            await api.post('/pvp-groups', {
                leader_char_id: formData.character_id,
                title: formData.title,
                pvp_mode: formData.pvp_mode,
                equipment_band: Number(formData.equipment_band),
                server: formData.server,
            });
            onCreated();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al crear enfrentamiento');
        } finally {
            setSubmitting(false);
        }
    };

    const selectedModeColor = PVP_MODE_COLORS[formData.pvp_mode];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 style={{ color: selectedModeColor }}>⚔ Crear Enfrentamiento PVP</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                {loading ? (
                    <div className="modal-body">Cargando...</div>
                ) : (
                    <form onSubmit={handleSubmit} className="modal-body">
                        {error && <div className="error-message">{error}</div>}

                        {/* Título */}
                        <div className="form-group">
                            <label>Título del enfrentamiento</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Ej: Busco rival serio, Entrenamiento amistoso..."
                                maxLength={100}
                                required
                            />
                        </div>

                        {/* Modo PVP */}
                        <div className="form-group">
                            <label>Modo PVP</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginTop: 4 }}>
                                {PVP_MODES.map(mode => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, pvp_mode: mode })}
                                        style={{
                                            flex: 1,
                                            padding: '12px 8px',
                                            border: `2px solid ${formData.pvp_mode === mode ? PVP_MODE_COLORS[mode] : 'var(--border-color)'}`,
                                            borderRadius: 8,
                                            background: formData.pvp_mode === mode
                                                ? `${PVP_MODE_COLORS[mode]}22`
                                                : 'var(--background-light)',
                                            color: formData.pvp_mode === mode ? PVP_MODE_COLORS[mode] : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            fontWeight: 700,
                                            fontSize: 16,
                                            fontFamily: 'Cinzel, serif',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
                                {formData.pvp_mode === '1v1' && '2 jugadores en total — duelo individual'}
                                {formData.pvp_mode === '2v2' && '4 jugadores en total — 2 por equipo'}
                                {formData.pvp_mode === '3v3' && '6 jugadores en total — 3 por equipo'}
                                {formData.pvp_mode === '4v4' && '8 jugadores en total — 4 por equipo'}
                                {formData.pvp_mode === '5v5' && '10 jugadores en total — 5 por equipo'}
                                {formData.pvp_mode === '6v6' && '12 jugadores en total — 6 por equipo'}
                            </p>
                        </div>

                        {/* Franja de equipamiento */}
                        <div className="form-group">
                            <label>Franja de nivel del equipamiento</label>
                            <CustomSelect
                                value={String(formData.equipment_band)}
                                onChange={e => setFormData({ ...formData, equipment_band: Number(e) })}
                                options={BAND_OPTIONS.map(n => ({ value: String(n), label: `Nivel ${n}` }))}
                            />
                            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                                Franja de nivel máximo del equipo permitido en el PVP
                            </p>
                        </div>

                        <div className="form-row">
                            {/* Personaje líder */}
                            <div className="form-group">
                                <label>Tu personaje</label>
                                <CustomSelect
                                    value={formData.character_id}
                                    onChange={e => setFormData({ ...formData, character_id: e })}
                                    placeholder="Selecciona personaje"
                                    options={characters.map(char => ({
                                        value: String(char.id),
                                        label: `${char.name} - ${char.class_name} Nv. ${char.level}`,
                                    }))}
                                />
                            </div>

                            {/* Servidor */}
                            <div className="form-group">
                                <label>Servidor</label>
                                <CustomSelect
                                    value={formData.server}
                                    onChange={e => setFormData({ ...formData, server: e })}
                                    options={['Ogrest', 'Rubilax', 'Pandora'].map(server => ({ value: server, label: server }))}
                                />
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={submitting}
                                style={{ background: selectedModeColor, color: '#0a0a0a' }}
                            >
                                {submitting ? 'Creando...' : '⚔ Crear Enfrentamiento'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
