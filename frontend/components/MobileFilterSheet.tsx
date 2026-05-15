'use client';
import { useState } from 'react';
import { useLanguage } from '@/lib/language-context';
import { t } from '@/lib/translations';
import { GROUP_LANGUAGE_OPTIONS, getGroupLanguageLabel } from '@/lib/group-languages';

const SERVERS = ['Ogrest', 'Rubilax', 'Pandora'];
const STASIS_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);
const BAND_OPTIONS = [20, 35, 50, 65, 80, 95, 110, 125, 140, 155, 170, 185, 200, 215, 230, 245];

interface Props {
    onClose: () => void;
    filterServer: string;
    setFilterServer: (v: string) => void;
    filterStasis: number | '';
    setFilterStasis: (v: number | '') => void;
    filterLanguage: string;
    setFilterLanguage: (v: string) => void;
    filterBand: number | '';
    setFilterBand: (v: number | '') => void;
}

export default function MobileFilterSheet({
    onClose,
    filterServer, setFilterServer,
    filterStasis, setFilterStasis,
    filterLanguage, setFilterLanguage,
    filterBand, setFilterBand,
}: Props) {
    const { language } = useLanguage();

    // Local state so changes only apply on "Aplicar"
    const [localServer, setLocalServer]     = useState(filterServer);
    const [localStasis, setLocalStasis]     = useState(filterStasis);
    const [localLanguage, setLocalLanguage] = useState(filterLanguage);
    const [localBand, setLocalBand]         = useState(filterBand);

    const hasFilters = !!(localServer || localStasis || localLanguage || localBand);

    const handleClear = () => {
        setLocalServer('');
        setLocalStasis('');
        setLocalLanguage('');
        setLocalBand('');
    };

    const handleApply = () => {
        setFilterServer(localServer);
        setFilterStasis(localStasis);
        setFilterLanguage(localLanguage);
        setFilterBand(localBand);
        onClose();
    };

    return (
        <div className="mobile-filter-overlay" onClick={onClose}>
            <div className="mobile-filter-sheet" onClick={e => e.stopPropagation()}>
                <div className="mobile-filter-handle"/>

                <div className="mobile-filter-header">
                    <span className="mobile-filter-title">Filtros</span>
                    {hasFilters && (
                        <button className="mobile-filter-clear press-fx" onClick={handleClear}>
                            Limpiar todo
                        </button>
                    )}
                </div>

                {/* Servidor */}
                <div className="mobile-filter-section">
                    <div className="mobile-filter-section-label">{t('home.allServers', language) || 'Servidor'}</div>
                    <div className="mobile-filter-pills">
                        {SERVERS.map(s => (
                            <button
                                key={s}
                                className={`mobile-filter-pill press-fx${localServer === s ? ' active' : ''}`}
                                onClick={() => setLocalServer(localServer === s ? '' : s)}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stasis */}
                <div className="mobile-filter-section">
                    <div className="mobile-filter-section-label">Stasis</div>
                    <div className="mobile-filter-pills">
                        {STASIS_OPTIONS.map(n => (
                            <button
                                key={n}
                                className={`mobile-filter-pill press-fx${localStasis === n ? ' active' : ''}`}
                                onClick={() => setLocalStasis(localStasis === n ? '' : n)}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Banda de nivel */}
                <div className="mobile-filter-section">
                    <div className="mobile-filter-section-label">Nivel mínimo</div>
                    <div className="mobile-filter-pills">
                        {BAND_OPTIONS.map(n => (
                            <button
                                key={n}
                                className={`mobile-filter-pill press-fx${localBand === n ? ' active' : ''}`}
                                onClick={() => setLocalBand(localBand === n ? '' : n)}
                            >
                                {n}+
                            </button>
                        ))}
                    </div>
                </div>

                {/* Idioma */}
                <div className="mobile-filter-section">
                    <div className="mobile-filter-section-label">Idioma</div>
                    <div className="mobile-filter-pills">
                        {GROUP_LANGUAGE_OPTIONS.map(code => (
                            <button
                                key={code}
                                className={`mobile-filter-pill press-fx${localLanguage === code ? ' active' : ''}`}
                                onClick={() => setLocalLanguage(localLanguage === code ? '' : code)}
                            >
                                {getGroupLanguageLabel(code)}
                            </button>
                        ))}
                    </div>
                </div>

                <button className="mobile-filter-apply press-fx" onClick={handleApply}>
                    Aplicar filtros
                </button>
            </div>
        </div>
    );
}
