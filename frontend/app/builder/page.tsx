'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import CustomSelect from '@/components/CustomSelect';
import { BuilderStatLabel } from '@/components/BuilderStatLabel';
import { BuilderItemStatsHover } from '@/components/BuilderItemStatsHover';
import { EnchantmentsPanel, type EnchantmentSummaryEntry, type EnchantmentsSnapshot } from './EnchantmentsPanel';
import styles from './page.module.css';
import { api, getAssetUrl } from '@/lib/api';
import { getElementIconAssetPath, getPrimaryStatIconAssetPath, type PrimaryStatLayoutId } from '@/lib/builder-stat-icons';
import {
    addBuilderStatValue,
    applyRelatedStats,
    BUILDER_SECONDARY_MASTERY_ACTION_IDS,
    createBuilderStatMap,
    getBuilderStatEntries,
    getVisibleBuilderStatDefinitions,
    getBuilderStatValue,
    SUBLIMATION_MAX_HP_PERCENT_ACTION_IDS,
    type BuilderStatEntry,
} from '@/lib/builder-stats';
import { useLanguage, type Language } from '@/lib/language-context';
import {
    getAptitudeLineLabel,
    getAptitudeSectionLabel,
    getBuilderCopy,
    getBuilderElementLabel,
    getBuilderElementOptions,
    getBuilderStatLabel,
    getBuilderStatInfo,
    getElementMetricInfo,
    getExclusivePropertyRuleLabel,
} from './i18n';

type LocaleText = Record<string, string | undefined>;
type TabId = 'equipment' | 'characteristics' | 'adjustments' | 'enchantments' | 'summary';
type SectionId = 'intelligence' | 'strength' | 'agility' | 'chance' | 'major';
type ElementKey = 'fire' | 'water' | 'earth' | 'air';

interface BuilderSlot { id: string; label: LocaleText; typeIds?: number[]; includePosition?: string; }
interface BuilderClass {
    id: number;
    names: LocaleText;
    icon: string;
    illustrations?: {
        male?: string;
        female?: string;
    };
}
interface BuilderStat { key: string; actionId: number; label: string; value: number; elementCount?: number; }
interface BuilderStatOption { key: string; actionId: number; label: LocaleText; }
interface EquipmentTypeOption { id: number; label: LocaleText; positions: string[]; }
interface BuilderItem {
    id: number;
    level: number;
    rarity: number;
    itemTypeId: number;
    properties: number[];
    itemTypeName: LocaleText;
    positions: string[];
    disabledPositions: string[];
    title: LocaleText;
    description: LocaleText;
    gfxId: number | null;
    minShardSlots: number;
    maxShardSlots: number;
    stats: BuilderStat[];
    isTwoHanded: boolean;
    equipmentRequirements?: EquipmentRequirement[];
}
interface BuilderMetadataResponse {
    slots: BuilderSlot[];
    classes: BuilderClass[];
    equipmentTypes: EquipmentTypeOption[];
    statOptions: BuilderStatOption[];
    rarities: Array<{ id: number; label: LocaleText }>;
    totalItems: number;
}
interface BuilderItemsResponse { total: number; items: BuilderItem[]; }
interface EquipmentRequirement {
    type: 'PA' | 'PW' | 'Placaje' | 'Fuerza' | 'Inteligencia' | 'Agilidad' | 'Suerte' | 'Carisma' | 'Vida' | 'Nivel';
    value: number;
    description: string;
}
interface AptitudeLine { id: string; label: string; max: number; bonuses: Array<{ actionId: number; value: number }>; }
interface AptitudeSection { id: SectionId; label: string; lines: AptitudeLine[]; }
interface ImportedBuildEquipment { id_equipment?: number; metadata?: { side?: number | string }; }
interface ImportedBuildBuilderState {
    mastery_preference?: ElementKey[];
    resistance_preference?: ElementKey[];
    enchantments?: EnchantmentsSnapshot | null;
    guild_bonus_enabled?: boolean;
    manual_stats?: Record<string, number | string>;
}
interface ImportedBuildPayload {
    id_build?: number | string | null;
    name_build?: string;
    level_build?: number | string;
    id_job?: number | string;
    equipments?: ImportedBuildEquipment[];
    aptitudes?: Record<string, number | string>;
    mastery_preference?: ElementKey[];
    resistance_preference?: ElementKey[];
    enchantments?: EnchantmentsSnapshot | null;
    builder_state?: ImportedBuildBuilderState;
}
interface ImportedBuilderEntry {
    item: BuilderItem;
    side: number | string | undefined;
}
type EnchantmentStatMap = Map<number, { value: number; label: string }>;

function SlotPlaceholderIcon({ slotId }: { slotId: string }) {
    switch (slotId) {
        case 'helmet':
            return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11a5 5 0 0 1 10 0v5H7z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 16v2h6v-2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
        case 'amulet':
            return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M8 5.5 12 3l4 2.5M12 12.2V20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
        case 'cloak':
            return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8l2 4-6 12L6 8z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>;
        case 'breastplate':
            return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6l3 3-1 11H7L6 7z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M9 4v4h6V4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>;
        case 'epaulettes':
            return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9l4-3 3 3-3 9-4-3zM19 9l-4-3-3 3 3 9 4-3z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>;
        case 'belt':
            return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="9" width="16" height="6" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" /><rect x="9" y="9" width="6" height="6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>;
        case 'boots':
            return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6v7l2 2h3v3H5a2 2 0 0 1 2-2V6zM17 6v7l2 2h1v3h-6v-3h1l-2-2V6z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>;
        case 'ring_left':
        case 'ring_right':
            return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5.4" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M9.4 6.8h5.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
        case 'main_hand':
            return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 16 8-8 2 2-8 8H8zM14 6l1.5-1.5L19 8l-1.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" /></svg>;
        case 'off_hand':
            return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 18 7v5c0 3.5-2.4 6.4-6 8-3.6-1.6-6-4.5-6-8V7z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M12 7v10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
        case 'accessory':
            return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5 14 9l5 .7-3.6 3.5.8 5-4.2-2.2-4.2 2.2.8-5L5 9.7 10 9z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>;
        case 'mount':
            return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16c0-2.8 2.2-5 5-5h2.2c2.1 0 4 1.1 5 3l.8 1.5V18h-2v-1.3h-1.8V18h-2v-1.3H9.6V18h-2v-2z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M8.2 11.3 6.7 9.7a1.9 1.9 0 0 1 2.7-2.7l1.8 1.8M14.8 9.2l1.2-2.7 2.4 1.1-1.2 2.7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
        case 'pet':
            return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 10c-1.7 0-3 1.5-3 3.2C5 15.8 7.3 18 12 18s7-2.2 7-4.8c0-1.7-1.3-3.2-3-3.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="9" cy="8" r="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" /><circle cx="15" cy="8" r="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>;
        case 'costume':
            return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6l1 3 2 2-2 10H8L6 9l2-2z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M10 7h4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
        default:
            return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>;
    }
}

const COPY = {
    buildName: 'Nombre del equipo',
    level: 'Nivel',
    maxLevel: 'Nivel máximo',
    class: 'Clase',
    search: 'Buscar',
    searchPlaceholder: 'Nombre, stat o tipo...',
    rarity: 'Rareza',
    rarityAll: 'Todas',
    itemType: 'Tipo de equipamiento',
    itemTypeAll: 'Todos',
    statFilter: 'Estadistica',
    statAll: 'Todas',
    equipment: 'Buscar',
    characteristics: 'Caracteristicas',
    enchantments: 'Encantamientos',
    summary: 'Resumen',
    equip: 'Equipar',
    equipped: 'Equipada',
    loading: 'Cargando piezas...',
    noResults: 'No hay piezas con esos filtros.',
    relics: 'Reliquias',
    epics: 'Epicos',
    souvenirs: 'Recuerdos',
    noItem: 'Selecciona una pieza equipada para revisar detalles.',
    summaryPlaceholder: 'Vista compacta de estadisticas, equipamiento y encantamientos del build.',
    shardRange: 'Ranuras',
    equippedItems: 'Piezas equipadas',
    activeFilters: 'Filtros activos',
    buildLimits: 'Limites del build',
    maxOneRelic: 'Maximo 1 reliquia recomendado',
    maxOneEpic: 'Maximo 1 epico recomendado',
    souvenirsNote: 'Los recuerdos ayudan a comparar variantes.',
    mainStats: 'Estadisticas principales',
    elementalStats: 'Elementos',
    secondaryStats: 'Secundarias',
    aptitudeSummary: 'Resumen',
    basePoints: 'Base nivel 230',
    points: 'pts',
    importBuild: 'Importar Build',
    exportBuild: 'Exportar Build',
    importError: 'No se pudo importar el archivo del build.',
    importSuccess: 'Build importado.',
    exportSuccess: 'Build exportado.',
    unequip: 'Desequipar',
    compare: 'Comparacion',
    compareEmpty: 'Selecciona una pieza del catalogo para compararla con la equipada.',
    compareNoEquipped: 'No hay item equipado en este slot. La comparacion se hace contra vacio.',
    compareSame: 'Esta pieza ya esta equipada en el slot activo.',
    compareNoStatChange: 'Sin cambios netos en el build (por ejemplo mismo valor agregado y quitado).',
    compareVsEquipped: 'vs equipado actual',
    compareBuildDelta: 'Diferencia en el build',
    masteryPrefs: 'Preferencia dominio',
    resistancePrefs: 'Preferencia resis',
    invalidCondition: 'Condicion no cumplida',
    cannotEquip: 'No equipable',
    twoHandedWeaponEquipped: 'Arma de dos manos equipada - slot secundario bloqueado',
    sameRingType: 'Anillos del mismo tipo no permitidos',
    epicGemConflict: 'Solo 1 item con ranura épica',
    relicGemConflict: 'Solo 1 item con ranura reliquia',
    equipmentRequirementNotMet: 'No cumples los requisitos para equipar este item',
};

const TABS: TabId[] = ['equipment', 'characteristics', 'adjustments', 'enchantments', 'summary'];
const SLOT_GROUPS = [
    ['helmet', 'amulet', 'cloak', 'breastplate', 'epaulettes', 'belt', 'boots'],
    ['ring_left', 'ring_right', 'main_hand', 'off_hand'],
    ['accessory', 'mount', 'pet', 'costume'],
] as const;
const SLOT_ORDER: string[] = SLOT_GROUPS.flat();
const RARITY_TONES: Record<number, string> = { 0: styles.rarityCommon, 1: styles.rarityCommon, 2: styles.rarityUncommon, 3: styles.rarityMythic, 4: styles.rarityLegendary, 5: styles.rarityRelic, 6: styles.raritySouvenir, 7: styles.rarityEpic };
const RARITY_SURFACE: Record<number, string> = {
    0: styles.raritySurfaceCommon,
    1: styles.raritySurfaceCommon,
    2: styles.raritySurfaceUncommon,
    3: styles.raritySurfaceMythic,
    4: styles.raritySurfaceLegendary,
    5: styles.raritySurfaceRelic,
    6: styles.raritySurfaceSouvenir,
    7: styles.raritySurfaceEpic,
};
const APTITUDE_SECTION_TONES: Record<SectionId, string> = {
    intelligence: styles.aptitudeToneIntelligence,
    strength: styles.aptitudeToneStrength,
    agility: styles.aptitudeToneAgility,
    chance: styles.aptitudeToneChance,
    major: styles.aptitudeToneMajor,
};
const LEVEL_BRACKETS = [
    { min: 1, max: 20 },
    { min: 21, max: 35 },
    { min: 36, max: 50 },
    { min: 51, max: 65 },
    { min: 66, max: 80 },
    { min: 81, max: 95 },
    { min: 96, max: 110 },
    { min: 111, max: 125 },
    { min: 126, max: 140 },
    { min: 141, max: 155 },
    { min: 156, max: 170 },
    { min: 171, max: 185 },
    { min: 186, max: 200 },
    { min: 201, max: 215 },
    { min: 216, max: 230 },
    { min: 231, max: 245 },
] as const;
const ELEMENT_OPTIONS: Array<{ value: ElementKey; label: string }> = [
    { value: 'fire', label: 'Fuego' },
    { value: 'water', label: 'Agua' },
    { value: 'earth', label: 'Tierra' },
    { value: 'air', label: 'Aire' },
];
const EXCLUSIVE_PROPERTY_RULES = [
    { propertyId: 8, label: 'Solo 1 reliquia equipada' },
    { propertyId: 12, label: 'Solo 1 epico equipado' },
    { propertyId: 19, label: 'Solo 1 item con ranura épica' },
    { propertyId: 20, label: 'Solo 1 item con ranura reliquia' },
] as const;

const APTITUDE_SECTIONS: AptitudeSection[] = [
    { id: 'intelligence', label: 'Inteligencia', lines: [
        { id: 'int-hp-percent', label: '% Puntos de Vida', max: Number.POSITIVE_INFINITY, bonuses: [] },
        { id: 'int-res', label: 'Resistencia elemental', max: 10, bonuses: [{ actionId: 80, value: 10 }] },
        { id: 'int-barrier', label: 'Barrera', max: 10, bonuses: [] },
        { id: 'int-heal-received', label: '% Soins recibidos', max: 5, bonuses: [] },
        { id: 'int-armor-hp', label: '% Puntos de Vida en Armadura', max: 10, bonuses: [] },
    ]},
    { id: 'strength', label: 'Fuerza', lines: [
        { id: 'str-elemental', label: 'Dominio elemental', max: Number.POSITIVE_INFINITY, bonuses: [{ actionId: 120, value: 5 }] },
        { id: 'str-melee', label: 'Dominio melee', max: 40, bonuses: [{ actionId: 1052, value: 8 }] },
        { id: 'str-distance', label: 'Dominio distancia', max: 40, bonuses: [{ actionId: 1053, value: 8 }] },
        { id: 'str-hp', label: 'Puntos de Vida', max: Number.POSITIVE_INFINITY, bonuses: [{ actionId: 20, value: 60 }] },
    ]},
    { id: 'agility', label: 'Agilidad', lines: [
        { id: 'agi-lock', label: 'Placaje', max: Number.POSITIVE_INFINITY, bonuses: [{ actionId: 173, value: 6 }] },
        { id: 'agi-dodge', label: 'Esquiva', max: Number.POSITIVE_INFINITY, bonuses: [{ actionId: 175, value: 6 }] },
        { id: 'agi-initiative', label: 'Iniciativa', max: 20, bonuses: [{ actionId: 171, value: 6 }] },
        { id: 'agi-lock-dodge', label: 'Placaje y Esquiva', max: Number.POSITIVE_INFINITY, bonuses: [{ actionId: 173, value: 4 }, { actionId: 175, value: 4 }] },
        { id: 'agi-will', label: 'Voluntad', max: 20, bonuses: [{ actionId: 177, value: 1 }] },
    ]},
    { id: 'chance', label: 'Suerte', lines: [
        { id: 'cha-crit', label: '% Golpe critico', max: 20, bonuses: [{ actionId: 150, value: 1 }] },
        { id: 'cha-block', label: '% Parada', max: 20, bonuses: [{ actionId: 875, value: 1 }] },
        { id: 'cha-crit-mastery', label: 'Dominio critico', max: Number.POSITIVE_INFINITY, bonuses: [{ actionId: 149, value: 4 }] },
        { id: 'cha-rear-mastery', label: 'Dominio espalda', max: Number.POSITIVE_INFINITY, bonuses: [{ actionId: 180, value: 6 }] },
        { id: 'cha-berserk', label: 'Dominio berserker', max: Number.POSITIVE_INFINITY, bonuses: [{ actionId: 1055, value: 8 }] },
        { id: 'cha-heal', label: 'Dominio cura', max: Number.POSITIVE_INFINITY, bonuses: [{ actionId: 26, value: 6 }] },
        { id: 'cha-rear-res', label: 'Resistencia espalda', max: 20, bonuses: [{ actionId: 71, value: 2 }] },
        { id: 'cha-crit-res', label: 'Resistencia critica', max: 20, bonuses: [{ actionId: 988, value: 4 }] },
    ]},
    { id: 'major', label: 'Mayor', lines: [
        { id: 'maj-ap', label: 'Punto de Accion', max: 1, bonuses: [{ actionId: 31, value: 1 }] },
        { id: 'maj-mp', label: 'Punto de Movimiento y daños', max: 1, bonuses: [{ actionId: 41, value: 1 }, { actionId: 120, value: 20 }] },
        { id: 'maj-range', label: 'Portee y daños', max: 1, bonuses: [{ actionId: 160, value: 1 }, { actionId: 120, value: 20 }] },
        { id: 'maj-wp', label: 'Punto de Wakfu', max: 1, bonuses: [{ actionId: 191, value: 2 }] },
        { id: 'maj-control', label: 'Control y daños', max: 1, bonuses: [{ actionId: 304, value: 1 }, { actionId: 120, value: 20 }] },
        { id: 'maj-damage', label: '% Daños infligidos', max: 1, bonuses: [{ actionId: 126, value: 10 }] },
        { id: 'maj-indirect-damage', label: '% Danos indirectos', max: 1, bonuses: [{ actionId: 900001, value: 10 }] },
        { id: 'maj-heals-performed', label: '% Curas realizadas', max: 1, bonuses: [{ actionId: 1095, value: 10 }] },
        { id: 'maj-res', label: 'Resistencia elemental', max: 1, bonuses: [{ actionId: 80, value: 50 }] },
    ]},
];

const DEFAULT_ELEMENT_PREFERENCE: ElementKey[] = ['fire', 'water', 'earth', 'air'];
const VISIBLE_MANUAL_STAT_IDS = new Set(getVisibleBuilderStatDefinitions().map((entry) => entry.actionId));
const GUILD_BONUS_PRESET: Array<{ actionId: number; value: number }> = [
    { actionId: 20, value: 55 },
    { actionId: 82, value: 20 },
    { actionId: 83, value: 20 },
    { actionId: 84, value: 20 },
    { actionId: 85, value: 20 },
    { actionId: 126, value: 8 },
    { actionId: 162, value: 10 },
    { actionId: 166, value: 10 },
    { actionId: 171, value: 10 },
    { actionId: 173, value: 20 },
    { actionId: 175, value: 20 },
    { actionId: 1095, value: 8 },
];

function normalizeImportedAptitudes(source: ImportedBuildPayload['aptitudes'], buildLevel: number) {
    const next: Record<string, number> = {};
    if (!source || typeof source !== 'object') return next;

    for (const section of APTITUDE_SECTIONS) {
        let remainingPoints = getAptitudeAvailable(section.id, buildLevel);
        if (remainingPoints <= 0) continue;

        for (const line of section.lines) {
            const rawValue = source[line.id];
            const numeric = Math.round(Number(rawValue));
            if (!Number.isFinite(numeric) || numeric <= 0) continue;
            const maxByLine = Number.isFinite(line.max) ? line.max : numeric;
            const applied = Math.min(numeric, maxByLine, remainingPoints);
            if (applied <= 0) continue;
            next[line.id] = applied;
            remainingPoints -= applied;
            if (remainingPoints <= 0) break;
        }
    }

    return next;
}

function normalizeElementPreference(source: unknown) {
    const normalized: ElementKey[] = [];
    if (Array.isArray(source)) {
        for (const entry of source) {
            if (entry !== 'fire' && entry !== 'water' && entry !== 'earth' && entry !== 'air') continue;
            if (normalized.includes(entry)) continue;
            normalized.push(entry);
        }
    }
    for (const entry of DEFAULT_ELEMENT_PREFERENCE) {
        if (!normalized.includes(entry)) normalized.push(entry);
    }
    return normalized;
}

function normalizeImportedManualStats(source: unknown) {
    const next: Record<number, number> = {};
    if (!source || typeof source !== 'object') return next;

    for (const [actionIdText, rawValue] of Object.entries(source as Record<string, unknown>)) {
        const actionId = Math.round(Number(actionIdText));
        const value = Math.round(Number(rawValue));
        if (!Number.isFinite(actionId) || actionId <= 0 || actionId === 20) continue;
        if (!VISIBLE_MANUAL_STAT_IDS.has(actionId)) continue;
        if (!Number.isFinite(value) || value === 0) continue;
        next[actionId] = value;
    }

    return next;
}

function getText(text: LocaleText | undefined, language: string) { return text?.[language] || text?.es || text?.en || ''; }
function getItemIconUrl(item: BuilderItem) { return item.gfxId ? getAssetUrl(`assets/items/${item.gfxId}.png`) : ''; }
function isPercentStat(actionId: number, label?: string) {
    if ([126, 150, 168, 1095, 900001].includes(actionId)) return true;
    return (label || '').trim().startsWith('%');
}
function isResistanceStat(actionId: number, label?: string) {
    return [71, 80, 82, 83, 84, 85, 988].includes(actionId) || (label || '').toLowerCase().startsWith('resistencia');
}
function getResistanceReductionPercent(resistance: number) {
    return Math.trunc((1 - Math.pow(0.8, resistance / 100)) * 100);
}
function formatStatValue(actionId: number, value: number, options?: { signed?: boolean; label?: string; effectiveResistance?: boolean }) {
    const prefix = options?.signed && value > 0 ? '+' : '';
    if (options?.effectiveResistance && isResistanceStat(actionId, options?.label)) {
        return `${prefix}${getResistanceReductionPercent(value)}%`;
    }
    const suffix = isPercentStat(actionId, options?.label) ? '%' : '';
    return `${prefix}${value}${suffix}`;
}
function normalizeClassName(value: string | undefined) {
    return (value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}
function getRingBaseName(title: LocaleText): string {
    // Extraer el nombre base del anillo eliminando rareza y nivel
    const fullName = getText(title, 'es') || getText(title, 'en') || '';
    
    // Patrones comunes de nombres de anillos en Wakfu
    // Ej: "Anillo de Rushu", "Anillo de Rushu legendario", "Anillo de Rushu mítico"
    const baseNamePatterns = [
        /^(Anillo .+?)(?:\s+(?:legendario|mítico|épico|reliquia|común|poco común|raro))?$/i,
        /^(Ring .+?)(?:\s+(?:legendary|mythic|epic|relic|common|uncommon|rare))?$/i,
        /^(Anneau .+?)(?:\s+(?:légendaire|mythique|épique|relique|commun|peu commun|rare))?$/i,
        /^(Anel .+?)(?:\s+(?:lendário|lendario|épico|relíquia|comum|incomum|raro))?$/i
    ];
    
    for (const pattern of baseNamePatterns) {
        const match = fullName.match(pattern);
        if (match) {
            return match[1].trim();
        }
    }
    
    // Si no coincide con ningún patrón, usar el nombre completo normalizado
    return fullName.toLowerCase()
        .replace(/\s+(?:legendario|mítico|épico|reliquia|común|poco común|raro)$/i, '')
        .replace(/\s+(?:legendary|mythic|epic|relic|common|uncommon|rare)$/i, '')
        .replace(/\s+(?:légendaire|mythique|épique|relique|commun|peu commun|rare)$/i, '')
        .replace(/\s+(?:lendário|lendario|épico|relíquia|comum|incomum|raro)$/i, '')
        .trim();
}
function itemFitsSlot(item: BuilderItem, slotId: string) {
    switch (slotId) {
        case 'amulet':
            return item.itemTypeId === 120;
        case 'helmet':
            return item.itemTypeId === 134;
        case 'cloak':
            return item.itemTypeId === 132;
        case 'breastplate':
            return item.itemTypeId === 136;
        case 'epaulettes':
            return item.itemTypeId === 138;
        case 'belt':
            return item.itemTypeId === 133;
        case 'boots':
            return item.itemTypeId === 119;
        case 'ring_left':
        case 'ring_right':
            return item.itemTypeId === 103;
        case 'main_hand':
            return item.positions.includes('FIRST_WEAPON');
        case 'off_hand':
            return item.positions.includes('SECOND_WEAPON');
        case 'accessory':
            return item.positions.includes('ACCESSORY');
        case 'mount':
            return item.itemTypeId === 611;
        case 'pet':
            return item.positions.includes('PET');
        case 'costume':
            return item.positions.includes('COSTUME');
        default:
            return false;
    }
}
function normalizeImportedSlotId(value: number | string | undefined, item: BuilderItem) {
    if (typeof value !== 'string') return '';
    const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (!SLOT_ORDER.includes(normalized)) return '';
    return itemFitsSlot(item, normalized) ? normalized : '';
}
function parseEquipmentRequirements(description: LocaleText): EquipmentRequirement[] {
    const text = getText(description, 'es') || getText(description, 'en') || '';
    const requirements: EquipmentRequirement[] = [];
    
    // Patrones para requisitos numéricos
    const patterns = [
        // PA requirements
        { type: 'PA', regex: /(?:requiere|necesita|exige|precisa)\s+(\d+)\s*(?:pa|puntos?\s*de\s*acci[oó]n?)/gi },
        { type: 'PA', regex: /(\d+)\s*(?:pa|puntos?\s*de\s*acci[oó]n?)\s*(?:requiere|necesita|exige|precisa)/gi },
        { type: 'PA', regex: /(?:pa|puntos?\s*de\s*acci[oó]n?)\s*(?:m[íi]nimo|minimo)?\s*:?\s*(\d+)/gi },
        
        // PW requirements
        { type: 'PW', regex: /(?:requiere|necesita|exige|precisa)\s+(\d+)\s*(?:pw|puntos?\s*de\s*voluntad)/gi },
        { type: 'PW', regex: /(\d+)\s*(?:pw|puntos?\s*de\s*voluntad)\s*(?:requiere|necesita|exige|precisa)/gi },
        { type: 'PW', regex: /(?:pw|puntos?\s*de\s*voluntad)\s*(?:m[íi]nimo|minimo)?\s*:?\s*(\d+)/gi },
        
        // Placaje requirements
        { type: 'Placaje', regex: /(?:requiere|necesita|exige|precisa)\s+(\d+)\s*(?:placaje|armadura)/gi },
        { type: 'Placaje', regex: /(\d+)\s*(?:placaje|armadura)\s*(?:requiere|necesita|exige|precisa)/gi },
        { type: 'Placaje', regex: /(?:placaje|armadura)\s*(?:m[íi]nimo|minimo)?\s*:?\s*(\d+)/gi },
        
        // Stat requirements
        { type: 'Fuerza', regex: /(?:requiere|necesita|exige|precisa)\s+(\d+)\s*fuerza/gi },
        { type: 'Inteligencia', regex: /(?:requiere|necesita|exige|precisa)\s+(\d+)\s*inteligencia/gi },
        { type: 'Agilidad', regex: /(?:requiere|necesita|exige|precisa)\s+(\d+)\s*agilidad/gi },
        { type: 'Suerte', regex: /(?:requiere|necesita|exige|precisa)\s+(\d+)\s*suerte/gi },
        { type: 'Carisma', regex: /(?:requiere|necesita|exige|precisa)\s+(\d+)\s*carisma/gi },
        
        // HP/Vida requirements
        { type: 'Vida', regex: /(?:requiere|necesita|exige|precisa)\s+(\d+)\s*(?:puntos?\s*de\s*vida|hp|vida)/gi },
        { type: 'Vida', regex: /(\d+)\s*(?:puntos?\s*de\s*vida|hp|vida)\s*(?:requiere|necesita|exige|precisa)/gi },
        { type: 'Vida', regex: /(?:puntos?\s*de\s*vida|hp|vida)\s*(?:m[íi]nimo|minimo)?\s*:?\s*(\d+)/gi },
        
        // Level requirements
        { type: 'Nivel', regex: /(?:requiere|necesita|exige|precisa)\s+(?:nivel|level)\s+(\d+)/gi },
        { type: 'Nivel', regex: /(?:nivel|level)\s+(?:m[íi]nimo|minimo)?\s*:?\s*(\d+)/gi }
    ];
    
    patterns.forEach(pattern => {
        const matches = text.match(pattern.regex);
        if (matches) {
            matches.forEach(match => {
                const numberMatch = match.match(/\d+/);
                if (numberMatch) {
                    requirements.push({
                        type: pattern.type as EquipmentRequirement['type'],
                        value: parseInt(numberMatch[0]),
                        description: match.trim()
                    });
                }
            });
        }
    });
    
    return requirements;
}
function getAptitudeAvailable(sectionId: SectionId, level: number) {
    if (sectionId === 'major') {
        if (level < 25) return 0;
        return Math.min(Math.floor((level - 25) / 50) + 1, 5);
    }
    return Math.floor(Math.max(level - 1, 0) / 4);
}
function formatAptitudeMax(max: number, noLimitLabel: string) { return Number.isFinite(max) ? String(max) : noLimitLabel; }
function reorderElementPreference(current: ElementKey[], fromIndex: number, toIndex: number) {
    const next = [...current];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
}
function distributePreferredElementStat(stats: BuilderStat[], actionId: number, preference: ElementKey[]) {
    const totals: Record<ElementKey, number> = { fire: 0, water: 0, earth: 0, air: 0 };
    for (const stat of stats) {
        if (stat.actionId !== actionId) continue;
        const count = Math.max(1, Math.min(stat.elementCount || 1, 4));
        for (const element of preference.slice(0, count)) totals[element] += stat.value;
    }
    return totals;
}
function buildFinalStatMap(params: {
    buildLevel: number;
    isIop: boolean;
    isHuppermage: boolean;
    aptitudes: Record<string, number>;
    aptitudeBonusMap: Map<number, number>;
    guildBonusMap?: Map<number, number>;
    manualStatMap?: Map<number, number>;
    equippedItems: BuilderItem[];
    runeStats?: EnchantmentStatMap;
}) {
    const totals = createBuilderStatMap({ buildLevel: params.buildLevel, isIop: params.isIop, isHuppermage: params.isHuppermage });
    const equipmentTotals = new Map<string, BuilderStat>();
    for (const item of params.equippedItems) {
        for (const stat of item.stats) {
            const current = equipmentTotals.get(stat.key);
            if (current) current.value += stat.value;
            else equipmentTotals.set(stat.key, { ...stat });
        }
    }
    for (const stat of equipmentTotals.values()) addBuilderStatValue(totals, stat.actionId, stat.value, stat.label);
    params.aptitudeBonusMap.forEach((value, actionId) => addBuilderStatValue(totals, actionId, value));
    params.guildBonusMap?.forEach((value, actionId) => addBuilderStatValue(totals, actionId, value));
    params.manualStatMap?.forEach((value, actionId) => addBuilderStatValue(totals, actionId, value));

    let sublimationMaxHpPercent = 0;
    params.runeStats?.forEach((entry, actionId) => {
        if (SUBLIMATION_MAX_HP_PERCENT_ACTION_IDS.has(actionId)) {
            sublimationMaxHpPercent += entry.value;
            return;
        }
        addBuilderStatValue(totals, actionId, entry.value, entry.label);
    });

    // Zenith (% PdV por punto) y Cicatrización (stat 986) son % del mismo pool de PdV antes de estos bonos — se suman en puntos porcentuales y se aplican una sola vez (aditivo).
    const hpPercentPoints = params.aptitudes['int-hp-percent'] || 0;
    const zenithLifeFraction = 0.04 * hpPercentPoints;
    const cicatrizLifeFraction = sublimationMaxHpPercent / 100;
    const combinedLifeFraction = zenithLifeFraction + cicatrizLifeFraction;
    if (combinedLifeFraction > 0) {
        const hpBeforeLifePercentBonuses = getBuilderStatValue(totals, [20]);
        const lifePercentFlat = Math.round(hpBeforeLifePercentBonuses * combinedLifeFraction);
        if (lifePercentFlat) {
            addBuilderStatValue(totals, 20, lifePercentFlat, 'PdV');
        }
    }

    applyRelatedStats(totals, { buildLevel: params.buildLevel, isIop: params.isIop, isHuppermage: params.isHuppermage });
    return totals;
}
/** Lista de items para simular el build al sustituir el slot activo (sin depender de que la vista previa pase todas las reglas de UI). */
function buildHypotheticalEquippedItems(activeEquippedItems: BuilderItem[], equippedBySlot: Record<string, BuilderItem>, activeSlot: string, previewItem: BuilderItem) {
    const previous = equippedBySlot[activeSlot];
    const baseItems = previous ? activeEquippedItems.filter((item) => item.id !== previous.id) : activeEquippedItems;
    return [...baseItems, previewItem];
}
function getEquippedConditionState(
    equippedBySlot: Record<string, BuilderItem>,
    exclusiveRules: Array<{ propertyId: number; label: string }>,
    copy: ReturnType<typeof getBuilderCopy>,
) {
    const invalidBySlot = new Map<string, string[]>();
    const activeItems: BuilderItem[] = [];
    const usedExclusiveProperties = new Set<number>();
    const usedRingNames = new Set<string>();
    let hasTwoHandedWeapon = false;

    // Primera pasada: validar propiedades exclusivas y detectar armas de dos manos
    for (const slotId of SLOT_ORDER) {
        const item = equippedBySlot[slotId];
        if (!item) continue;

        // Validar propiedades exclusivas (reliquias/épicos)
        const exclusiveIssues = exclusiveRules
            .filter((rule) => item.properties.includes(rule.propertyId) && usedExclusiveProperties.has(rule.propertyId))
            .map((rule) => rule.label);
        
        if (exclusiveIssues.length > 0) {
            invalidBySlot.set(slotId, exclusiveIssues);
            continue;
        }

        // Detectar arma de dos manos
        if (item.isTwoHanded && slotId === 'main_hand') {
            hasTwoHandedWeapon = true;
        }

        // Validar anillos del mismo tipo (por nombre base)
        if (slotId === 'ring_left' || slotId === 'ring_right') {
            const ringBaseName = getRingBaseName(item.title);
            if (usedRingNames.has(ringBaseName)) {
                invalidBySlot.set(slotId, [copy.sameRingType]);
                continue;
            }
            usedRingNames.add(ringBaseName);
        }

        // Registrar propiedades exclusivas usadas
        for (const rule of exclusiveRules) {
            if (item.properties.includes(rule.propertyId)) usedExclusiveProperties.add(rule.propertyId);
        }

        activeItems.push(item);
    }

    // Segunda pasada: validar bloqueo de slot secundario por arma de dos manos
    if (hasTwoHandedWeapon && equippedBySlot.off_hand) {
        invalidBySlot.set('off_hand', [copy.twoHandedWeaponEquipped]);
        // Remover el item del slot secundario de los items activos
        const offHandItem = equippedBySlot.off_hand;
        const offHandIndex = activeItems.findIndex(item => item.id === offHandItem.id);
        if (offHandIndex !== -1) {
            activeItems.splice(offHandIndex, 1);
        }
    }

    return { invalidBySlot, activeItems };
}
function assignImportedItemsToSlots(entries: ImportedBuilderEntry[]) {
    const next: Record<string, BuilderItem> = {};
    const remaining: BuilderItem[] = [];

    for (const entry of entries) {
        const slotId = normalizeImportedSlotId(entry.side, entry.item);
        if (!slotId || next[slotId]) {
            remaining.push(entry.item);
            continue;
        }
        next[slotId] = entry.item;
    }

    // Asignar anillos validando que no sean del mismo tipo (nombre base)
    const rings = remaining.filter((item) => item.itemTypeId === 103);
    const usedRingNames = new Set<string>();

    for (const slotId of ['ring_left', 'ring_right'] as const) {
        const ring = next[slotId];
        if (!ring) continue;
        usedRingNames.add(getRingBaseName(ring.title));
    }

    for (const ring of rings) {
        const ringName = getRingBaseName(ring.title);
        if (usedRingNames.has(ringName)) continue;
        if (!next.ring_left) {
            next.ring_left = ring;
            usedRingNames.add(ringName);
            continue;
        }
        if (!next.ring_right) {
            next.ring_right = ring;
            usedRingNames.add(ringName);
            break;
        }
    }

    const remainingNonRings = remaining.filter((item) => item.itemTypeId !== 103);
    for (const item of remainingNonRings) {
        if (item.positions.includes('FIRST_WEAPON') && !next.main_hand) {
            next.main_hand = item;
            // Si es un arma de dos manos, no permitir nada en off_hand
            if (item.isTwoHanded) {
                delete next.off_hand;
            }
            continue;
        }
        if (item.positions.includes('SECOND_WEAPON') && !next.off_hand) {
            // Verificar que no haya un arma de dos manos equipada
            const mainHandItem = next.main_hand;
            if (!mainHandItem || !mainHandItem.isTwoHanded) {
                next.off_hand = item;
            }
            continue;
        }
        if (item.positions.includes('ACCESSORY') && !next.accessory) {
            next.accessory = item;
            continue;
        }
        if (item.itemTypeId === 611 && !next.mount) {
            next.mount = item;
            continue;
        }
        if (item.positions.includes('PET') && !next.pet) {
            next.pet = item;
            continue;
        }
        if (item.positions.includes('COSTUME') && !next.costume) {
            next.costume = item;
            continue;
        }
        if (item.itemTypeId === 120 && !next.amulet) next.amulet = item;
        else if (item.itemTypeId === 134 && !next.helmet) next.helmet = item;
        else if (item.itemTypeId === 132 && !next.cloak) next.cloak = item;
        else if (item.itemTypeId === 136 && !next.breastplate) next.breastplate = item;
        else if (item.itemTypeId === 138 && !next.epaulettes) next.epaulettes = item;
        else if (item.itemTypeId === 133 && !next.belt) next.belt = item;
        else if (item.itemTypeId === 119 && !next.boots) next.boots = item;
    }
    return next;
}

function ItemIcon({ item, className, fallback, alt }: { item: BuilderItem; className: string; fallback: string; alt: string }) {
    const [broken, setBroken] = useState(false);
    const iconUrl = getItemIconUrl(item);
    if (!iconUrl || broken) return <span>{fallback}</span>;
    return <img src={iconUrl} alt={alt} className={className} onError={() => setBroken(true)} />;
}

export default function BuilderPage() {
    const { language } = useLanguage();
    const copy = useMemo(() => getBuilderCopy(language as Language), [language]);
    const elementOptions = useMemo(() => getBuilderElementOptions(language as Language), [language]);
    const exclusivePropertyRules = useMemo(
        () => EXCLUSIVE_PROPERTY_RULES.map((rule) => ({ ...rule, label: getExclusivePropertyRuleLabel(rule.propertyId, language as Language) })),
        [language],
    );
    const localizedAptitudeSections = useMemo(
        () => APTITUDE_SECTIONS.map((section) => ({
            ...section,
            label: getAptitudeSectionLabel(section.id, language as Language),
            lines: section.lines.map((line) => ({
                ...line,
                label: getAptitudeLineLabel(line.id, language as Language),
            })),
        })),
        [language],
    );
    const [metadata, setMetadata] = useState<BuilderMetadataResponse | null>(null);
    const [tab, setTab] = useState<TabId>('equipment');
    const [activeSlot, setActiveSlot] = useState('');
    const [buildName, setBuildName] = useState('Build 230');
    const [selectedClassId, setSelectedClassId] = useState(1);
    const [query, setQuery] = useState('');
    const [buildLevel, setBuildLevel] = useState(230);
    const [maxItemLevel, setMaxItemLevel] = useState(0); // 0 = sin filtro de nivel
    const [rarity, setRarity] = useState(0);
    const [itemTypeId, setItemTypeId] = useState(0);
    const [statKey, setStatKey] = useState('');
    const [items, setItems] = useState<BuilderItem[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [equippedBySlot, setEquippedBySlot] = useState<Record<string, BuilderItem>>({});
    const [inspectedSlot, setInspectedSlot] = useState('');
    const [previewItemId, setPreviewItemId] = useState<number | null>(null);
    const [aptitudes, setAptitudes] = useState<Record<string, number>>({});
    const [masteryPreference, setMasteryPreference] = useState<ElementKey[]>(DEFAULT_ELEMENT_PREFERENCE);
    const [resistancePreference, setResistancePreference] = useState<ElementKey[]>(DEFAULT_ELEMENT_PREFERENCE);
    const [draggedPreference, setDraggedPreference] = useState<{ group: 'mastery' | 'resistance'; index: number } | null>(null);
    const [transferMessage, setTransferMessage] = useState('');
    const [buildFileId, setBuildFileId] = useState<number | string | null>(null);
    const [runeStats, setRuneStats] = useState<EnchantmentStatMap>(new Map());
    const [enchantmentSummary, setEnchantmentSummary] = useState<EnchantmentSummaryEntry[]>([]);
    const [enchantmentSnapshot, setEnchantmentSnapshot] = useState<EnchantmentsSnapshot | null>(null);
    const [enchantmentSnapshotResetKey, setEnchantmentSnapshotResetKey] = useState(0);
    const [guildBonusesEnabled, setGuildBonusesEnabled] = useState(false);
    const [manualStatAdjustments, setManualStatAdjustments] = useState<Record<number, number>>({});
    const [activeManualStatId, setActiveManualStatId] = useState<number | null>(null);
    const [manualInputDrafts, setManualInputDrafts] = useState<Record<number, string>>({});
    const importBuildInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        api.get<BuilderMetadataResponse>('/builder/metadata')
            .then((response) => {
                setMetadata(response.data);
                setActiveSlot(response.data.slots[0]?.id || '');
            })
            .catch(() => setMetadata({ slots: [], classes: [], equipmentTypes: [], statOptions: [], rarities: [], totalItems: 0 }));
    }, []);

    useEffect(() => {
        if (!activeSlot) return;
        setLoadingItems(true);
        const params = { slot: activeSlot, query, rarity: rarity || undefined, maxLevel: maxItemLevel > 0 ? maxItemLevel : undefined, itemTypeId: itemTypeId || undefined, statKey: statKey || undefined, limit: 80 };
        api.get<BuilderItemsResponse>('/builder/items', { params })
            .then((response) => setItems(response.data.items || []))
            .finally(() => setLoadingItems(false));
    }, [activeSlot, query, rarity, maxItemLevel, itemTypeId, statKey]);

    const slotMap = useMemo(() => new Map((metadata?.slots || []).map((slot) => [slot.id, slot])), [metadata]);
    const activeSlotDefinition = useMemo(() => activeSlot ? slotMap.get(activeSlot) || null : null, [activeSlot, slotMap]);
    const selectedClass = useMemo(() => metadata?.classes.find((entry) => entry.id === selectedClassId) || metadata?.classes[0] || null, [metadata, selectedClassId]);
    const equippedItems = useMemo(() => Object.values(equippedBySlot), [equippedBySlot]);
    const equippedConditionState = useMemo(
        () => getEquippedConditionState(equippedBySlot, exclusivePropertyRules, copy),
        [copy, equippedBySlot, exclusivePropertyRules],
    );
    const activeEquippedItems = equippedConditionState.activeItems;
    const inspectedItem = inspectedSlot ? equippedBySlot[inspectedSlot] || null : null;
    const inspectedIssues = inspectedSlot ? equippedConditionState.invalidBySlot.get(inspectedSlot) || [] : [];
    const previewItem = useMemo(() => items.find((entry) => entry.id === previewItemId) || null, [items, previewItemId]);
    const levelBracketOptions = useMemo(
        () => [{ value: '0', label: language === 'en' ? 'All levels' : language === 'fr' ? 'Tous les niveaux' : language === 'pt' ? 'Todos os niveis' : 'Todos los niveles' }, ...LEVEL_BRACKETS.map((entry) => ({ value: String(entry.max), label: String(entry.max) }))],
        [language],
    );
    const classOptions = useMemo(() => (metadata?.classes || []).map((entry) => ({ value: String(entry.id), label: getText(entry.names, language) })), [language, metadata]);
    const rarityOptions = useMemo(() => [{ value: '0', label: copy.rarityAll }, ...(metadata?.rarities || []).map((entry) => ({ value: String(entry.id), label: getText(entry.label, language) }))], [copy.rarityAll, language, metadata]);
    const itemTypeOptions = useMemo(() => {
        // Mostrar siempre todos los tipos de equipment, no filtrar por slot activo
        const allTypes = metadata?.equipmentTypes || [];
        return [{ value: '0', label: copy.itemTypeAll }, ...allTypes.map((entry) => ({ value: String(entry.id), label: getText(entry.label, language) }))];
    }, [copy.itemTypeAll, language, metadata]);

    useEffect(() => {
        if (!itemTypeId || !activeSlotDefinition) return;
        const stillValid = (metadata?.equipmentTypes || []).some((entry) => {
            if (entry.id !== itemTypeId) return false;
            if (activeSlotDefinition.typeIds?.length) return activeSlotDefinition.typeIds.includes(entry.id);
            if (activeSlotDefinition.includePosition) return entry.positions.includes(activeSlotDefinition.includePosition);
            return true;
        });
        if (!stillValid) setItemTypeId(0);
    }, [activeSlotDefinition, itemTypeId, metadata]);
    const statOptions = useMemo(() => [{ value: '', label: copy.statAll }, ...(metadata?.statOptions || []).map((entry) => ({ value: entry.key, label: getText(entry.label, language) }))], [copy.statAll, language, metadata]);
    const selectedClassNames = selectedClass?.names;
    const isIop = useMemo(() => {
        const names = [selectedClassNames?.es, selectedClassNames?.en, selectedClassNames?.fr, selectedClassNames?.pt];
        return names.some((name) => normalizeClassName(name) === 'iop' || normalizeClassName(name) === 'yopuka');
    }, [selectedClassNames]);
    const isHuppermage = useMemo(() => {
        const names = [selectedClassNames?.es, selectedClassNames?.en, selectedClassNames?.fr, selectedClassNames?.pt];
        return names.some((name) => ['hipermago', 'huppermage', 'huppermago'].includes(normalizeClassName(name)));
    }, [selectedClassNames]);

    const spentBySection = useMemo(() => {
        const totals = {} as Record<SectionId, number>;
        for (const section of APTITUDE_SECTIONS) totals[section.id] = section.lines.reduce((sum, line) => sum + (aptitudes[line.id] || 0), 0);
        return totals;
    }, [aptitudes]);

    const availableBySection = useMemo(() => {
        const totals = {} as Record<SectionId, number>;
        for (const section of APTITUDE_SECTIONS) totals[section.id] = getAptitudeAvailable(section.id, buildLevel);
        return totals;
    }, [buildLevel]);

    const aptitudeBonusMap = useMemo(() => {
        const totals = new Map<number, number>();
        for (const section of APTITUDE_SECTIONS) {
            for (const line of section.lines) {
                const spent = aptitudes[line.id] || 0;
                if (!spent) continue;
                for (const bonus of line.bonuses) totals.set(bonus.actionId, (totals.get(bonus.actionId) || 0) + bonus.value * spent);
            }
        }
        return totals;
    }, [aptitudes]);
    const guildBonusMap = useMemo(() => {
        const totals = new Map<number, number>();
        if (!guildBonusesEnabled) return totals;
        for (const entry of GUILD_BONUS_PRESET) totals.set(entry.actionId, (totals.get(entry.actionId) || 0) + entry.value);
        return totals;
    }, [guildBonusesEnabled]);
    const manualStatMap = useMemo(() => {
        const totals = new Map<number, number>();
        for (const [actionIdText, value] of Object.entries(manualStatAdjustments)) {
            const actionId = Number(actionIdText);
            if (!Number.isFinite(actionId) || actionId <= 0 || actionId === 20 || !value) continue;
            if (!VISIBLE_MANUAL_STAT_IDS.has(actionId)) continue;
            totals.set(actionId, value);
        }
        return totals;
    }, [manualStatAdjustments]);

    const baseStatsBeforeEnchantments = useMemo(() => buildFinalStatMap({
        buildLevel,
        isIop,
        isHuppermage,
        aptitudes,
        aptitudeBonusMap,
        guildBonusMap,
        manualStatMap,
        equippedItems: activeEquippedItems,
    }), [activeEquippedItems, aptitudeBonusMap, aptitudes, buildLevel, guildBonusMap, isHuppermage, isIop, manualStatMap]);

    const baseStatValues = useMemo(
        () => new Map(Array.from(baseStatsBeforeEnchantments.entries()).map(([actionId, entry]) => [actionId, entry.value])),
        [baseStatsBeforeEnchantments],
    );

    const finalStats = useMemo(() => buildFinalStatMap({
        buildLevel,
        isIop,
        isHuppermage,
        aptitudes,
        aptitudeBonusMap,
        guildBonusMap,
        manualStatMap,
        equippedItems: activeEquippedItems,
        runeStats,
    }), [activeEquippedItems, aptitudeBonusMap, aptitudes, buildLevel, guildBonusMap, isHuppermage, isIop, manualStatMap, runeStats]);

    const stat = (ids: number[]) => getBuilderStatValue(finalStats, ids);
    const preferredMastery = useMemo(() => distributePreferredElementStat(activeEquippedItems.flatMap((item) => item.stats), 1068, masteryPreference), [activeEquippedItems, masteryPreference]);
    const preferredResistance = useMemo(() => distributePreferredElementStat(activeEquippedItems.flatMap((item) => item.stats), 1069, resistancePreference), [activeEquippedItems, resistancePreference]);
    const elementalResistance = {
        fire: stat([80, 82]) + preferredResistance.fire,
        water: stat([80, 83]) + preferredResistance.water,
        earth: stat([80, 84]) + preferredResistance.earth,
        air: stat([80, 85]) + preferredResistance.air,
    };
    const elementalResistanceReduction = {
        fire: getResistanceReductionPercent(elementalResistance.fire),
        water: getResistanceReductionPercent(elementalResistance.water),
        earth: getResistanceReductionPercent(elementalResistance.earth),
        air: getResistanceReductionPercent(elementalResistance.air),
    };
    const elementalMastery = {
        fire: stat([120, 122]) + preferredMastery.fire,
        water: stat([120, 124]) + preferredMastery.water,
        earth: stat([120, 123]) + preferredMastery.earth,
        air: stat([120, 125]) + preferredMastery.air,
    };
    const highestElementalMastery = Math.max(
        elementalMastery.fire,
        elementalMastery.water,
        elementalMastery.earth,
        elementalMastery.air,
    );
    const totalSecondaryMastery = stat([...BUILDER_SECONDARY_MASTERY_ACTION_IDS]);
    const totalPw = stat([191, 192]);
    const resourceLabel = isHuppermage ? copy.resourceBreeze : copy.resourceWakfu;
    const resourceValue = isHuppermage ? stat([191191]) : totalPw;
    const primaryStats = [
        { id: 'hp', actionId: 20, label: copy.hpShort, value: stat([20]) },
        { id: 'ap', actionId: 31, label: 'PA', value: stat([31]) },
        { id: 'mp', actionId: 41, label: 'PM', value: stat([41]) },
        { id: 'resource', actionId: isHuppermage ? 191191 : 191, label: resourceLabel, value: resourceValue },
        { id: 'armor', actionId: 45897, label: copy.armor, value: stat([45897]) },
        { id: 'mastery', actionId: 120, label: copy.totalMastery, value: highestElementalMastery + totalSecondaryMastery },
    ];
    const secondaryStats = useMemo(
        () => getBuilderStatEntries(finalStats, 'secondary')
            .filter((entry) => entry.actionId !== 120)
            .filter((entry) => entry.value !== 0)
            .map((entry) => ({ id: entry.actionId, label: entry.label, value: entry.value })),
        [finalStats],
    );
    const summaryStatEntries = useMemo(
        () => getBuilderStatEntries(finalStats)
            .filter((entry) => entry.visible !== false)
            .filter((entry) => entry.value !== 0)
            .filter((entry) => entry.actionId !== 120)
            .map((entry) => ({ id: entry.actionId, label: entry.label, value: entry.value, group: entry.group })),
        [finalStats],
    );
    const summaryPrimaryStats = useMemo(
        () => summaryStatEntries.filter((entry) => entry.group === 'primary'),
        [summaryStatEntries],
    );
    const summaryElementalStats = useMemo(
        () => summaryStatEntries.filter((entry) => entry.group === 'elemental'),
        [summaryStatEntries],
    );
    const summarySecondaryStats = useMemo(
        () => summaryStatEntries.filter((entry) => entry.group === 'secondary'),
        [summaryStatEntries],
    );
    const manualStatOptions = useMemo(
        () => getVisibleBuilderStatDefinitions().map((entry) => ({
            value: String(entry.actionId),
            label: getBuilderStatLabel(entry.actionId, language as Language, entry.label),
            actionId: entry.actionId,
            order: entry.order,
        })),
        [language],
    );
    const manualVisibleStatIds = useMemo(
        () => manualStatOptions.map((entry) => entry.actionId),
        [manualStatOptions],
    );
    const manualStatOptionById = useMemo(
        () => new Map(manualStatOptions.map((entry) => [entry.actionId, entry])),
        [manualStatOptions],
    );
    const manualStatRows = useMemo(
        () => manualVisibleStatIds.map((actionId) => ({
            actionId,
            label: manualStatOptionById.get(actionId)?.label || getBuilderStatLabel(actionId, language as Language),
            value: manualStatAdjustments[actionId] || 0,
        })),
        [language, manualStatAdjustments, manualStatOptionById, manualVisibleStatIds],
    );

    const relicCount = equippedItems.filter((item) => item.rarity === 5).length;
    const epicCount = equippedItems.filter((item) => item.rarity === 7).length;
    const souvenirCount = equippedItems.filter((item) => item.rarity === 6).length;
    const activeFiltersCount = [rarity > 0, itemTypeId > 0, statKey !== '', query.trim() !== ''].filter(Boolean).length;
    const aptitudeSummary = localizedAptitudeSections.flatMap((section) => section.lines.filter((line) => (aptitudes[line.id] || 0) > 0).map((line) => ({ id: line.id, label: line.label, value: aptitudes[line.id] || 0 })));
    const equippedInActiveSlot = activeSlot ? equippedBySlot[activeSlot] || null : null;
    const comparisonFinalStats = useMemo(() => {
        if (!previewItem || !activeSlot) return null;
        const hypoItems = buildHypotheticalEquippedItems(activeEquippedItems, equippedBySlot, activeSlot, previewItem);
        return buildFinalStatMap({
            buildLevel,
            isIop,
            isHuppermage,
            aptitudes,
            aptitudeBonusMap,
            guildBonusMap,
            manualStatMap,
            equippedItems: hypoItems,
            runeStats,
        });
    }, [activeEquippedItems, activeSlot, aptitudeBonusMap, aptitudes, buildLevel, equippedBySlot, guildBonusMap, isHuppermage, isIop, manualStatMap, previewItem, runeStats]);
    const comparisonRows = useMemo(() => {
        if (!previewItem || !comparisonFinalStats) return [];
        const currentEntries = new Map(Array.from(finalStats.values()).map((entry) => [entry.actionId, entry]));
        const nextEntries = new Map(Array.from(comparisonFinalStats.values()).map((entry) => [entry.actionId, entry]));
        const actionIds = new Set([...Array.from(currentEntries.keys()), ...Array.from(nextEntries.keys())]);
        const rawRows = Array.from(actionIds)
            .map((actionId) => {
                const nextValue = nextEntries.get(actionId)?.value || 0;
                const currentValue = currentEntries.get(actionId)?.value || 0;
                const diff = nextValue - currentValue;
                const source = (nextEntries.get(actionId) || currentEntries.get(actionId)) as BuilderStatEntry | undefined;
                return { actionId, label: source?.label || `Stat ${actionId}`, diff, order: source?.order || 9999, visible: source?.visible !== false };
            })
            .filter((entry) => entry.visible)
            .filter((entry) => entry.diff !== 0)
            .sort((left, right) => Math.abs(right.diff) - Math.abs(left.diff) || left.order - right.order);

        const aggregated = new Map<string, { actionId: number; label: string; diff: number; order: number }>();
        for (const row of rawRows) {
            const current = aggregated.get(row.label);
            if (current) {
                current.diff += row.diff;
                current.order = Math.min(current.order, row.order);
                continue;
            }
            aggregated.set(row.label, { actionId: row.actionId, label: row.label, diff: row.diff, order: row.order });
        }

        return Array.from(aggregated.values())
            .filter((entry) => entry.diff !== 0)
            .sort((left, right) => Math.abs(right.diff) - Math.abs(left.diff) || left.order - right.order);
    }, [comparisonFinalStats, finalStats, previewItem]);

    function changeAptitude(section: AptitudeSection, line: AptitudeLine, nextValue: number) {
        const current = aptitudes[line.id] || 0;
        const lineMax = Number.isFinite(line.max) ? line.max : Math.max(nextValue, current);
        const clamped = Math.min(lineMax, Math.max(0, nextValue));
        const delta = clamped - current;
        if (delta > 0 && spentBySection[section.id] + delta > availableBySection[section.id]) return;
        setAptitudes((currentState) => ({ ...currentState, [line.id]: clamped }));
    }

    function setManualStatValue(actionId: number, nextValue: number) {
        if (!Number.isFinite(actionId) || actionId <= 0 || actionId === 20) return;
        if (!VISIBLE_MANUAL_STAT_IDS.has(actionId)) return;
        const rounded = Math.round(nextValue);
        setManualStatAdjustments((current) => ({ ...current, [actionId]: rounded }));
    }

    function sanitizeManualInput(value: string) {
        const onlyNumeric = value.replace(/[^\d-]/g, '');
        const sign = onlyNumeric.startsWith('-') ? '-' : '';
        const digits = onlyNumeric.replace(/-/g, '');
        return `${sign}${digits}`;
    }

    function startManualStatEdit(actionId: number) {
        if (!VISIBLE_MANUAL_STAT_IDS.has(actionId)) return;
        setActiveManualStatId(actionId);
        setManualInputDrafts((current) => ({
            ...current,
            [actionId]: String(manualStatAdjustments[actionId] || 0),
        }));
    }

    function updateManualInputDraft(actionId: number, rawValue: string) {
        setManualInputDrafts((current) => ({
            ...current,
            [actionId]: sanitizeManualInput(rawValue),
        }));
    }

    function commitManualInputDraft(actionId: number) {
        const rawValue = manualInputDrafts[actionId];
        const nextValue = rawValue === undefined || rawValue === '' || rawValue === '-' ? 0 : parseInt(rawValue, 10);
        setManualStatValue(actionId, Number.isFinite(nextValue) ? nextValue : 0);
        setManualInputDrafts((current) => ({
            ...current,
            [actionId]: String(Number.isFinite(nextValue) ? nextValue : 0),
        }));
        setActiveManualStatId((current) => (current === actionId ? null : current));
    }

    function removeManualStatRow(actionId: number) {
        setManualStatAdjustments((current) => {
            const next = { ...current };
            delete next[actionId];
            return next;
        });
        setManualInputDrafts((current) => {
            const next = { ...current };
            delete next[actionId];
            return next;
        });
        setActiveManualStatId((current) => (current === actionId ? null : current));
    }

    function resetManualStats() {
        setManualStatAdjustments({});
        setManualInputDrafts({});
        setActiveManualStatId(null);
    }

    async function importBuildFromJson(sourceText: string) {
        try {
            const parsed = JSON.parse(sourceText) as ImportedBuildPayload;
            const builderState = parsed.builder_state && typeof parsed.builder_state === 'object' ? parsed.builder_state : null;
            const importedEquipments = (parsed.equipments || []).filter((entry) => Number.isFinite(Number(entry.id_equipment)) && Number(entry.id_equipment) > 0);
            const equipmentIds = importedEquipments
                .map((entry) => Number(entry.id_equipment))
                .filter((value) => Number.isFinite(value) && value > 0);

            let importedItems: BuilderItem[] = [];
            if (equipmentIds.length > 0) {
                const response = await api.get<BuilderItemsResponse>('/builder/items-by-ids', {
                    params: { ids: equipmentIds.join(',') },
                });
                importedItems = response.data.items || [];
            }

            if (parsed.name_build) setBuildName(parsed.name_build);
            const nextBuildLevel = Number(parsed.level_build);
            if (Number.isFinite(nextBuildLevel) && nextBuildLevel > 0) setBuildLevel(nextBuildLevel);
            const nextClassId = Number(parsed.id_job);
            if (Number.isFinite(nextClassId) && nextClassId > 0) setSelectedClassId(nextClassId);
            const importedManualStats = normalizeImportedManualStats(builderState?.manual_stats);
            setAptitudes(normalizeImportedAptitudes(parsed.aptitudes, nextBuildLevel > 0 ? nextBuildLevel : buildLevel));
            setMasteryPreference(normalizeElementPreference(builderState?.mastery_preference ?? parsed.mastery_preference));
            setResistancePreference(normalizeElementPreference(builderState?.resistance_preference ?? parsed.resistance_preference));
            setBuildFileId(parsed.id_build ?? null);
            setRuneStats(new Map());
            setEnchantmentSummary([]);
            setEnchantmentSnapshot(builderState?.enchantments ?? parsed.enchantments ?? null);
            setEnchantmentSnapshotResetKey((current) => current + 1);
            setGuildBonusesEnabled(Boolean(builderState?.guild_bonus_enabled));
            setManualStatAdjustments(importedManualStats);
            setManualInputDrafts(Object.fromEntries(Object.entries(importedManualStats).map(([actionId, value]) => [actionId, String(value)])));
            setActiveManualStatId(null);

            const importedItemsById = new Map(importedItems.map((item) => [item.id, item]));
            const resolvedEntries = importedEquipments
                .map((entry) => {
                    const item = importedItemsById.get(Number(entry.id_equipment));
                    if (!item) return null;
                    return { item, side: entry.metadata?.side };
                })
                .filter((entry): entry is ImportedBuilderEntry => entry !== null);

            const nextEquipped = assignImportedItemsToSlots(resolvedEntries);
            setEquippedBySlot(nextEquipped);
            setInspectedSlot(Object.keys(nextEquipped)[0] || '');
            setTransferMessage(copy.importSuccess);
        } catch {
            setTransferMessage(copy.importError);
        }
    }

    function exportBuildToJson() {
        const payload = {
            id_build: buildFileId ?? null,
            name_build: buildName,
            date_build: new Date().toISOString().slice(0, 10),
            level_build: buildLevel,
            id_job: selectedClassId,
            link_build: '',
            private: 0,
            aptitudes,
            builder_state: {
                mastery_preference: masteryPreference,
                resistance_preference: resistancePreference,
                enchantments: enchantmentSnapshot,
                guild_bonus_enabled: guildBonusesEnabled,
                manual_stats: Object.fromEntries(
                    Object.entries(manualStatAdjustments).filter(([, value]) => value !== 0),
                ),
            },
            equipments: Object.entries(equippedBySlot).map(([slotId, item]) => ({
                id_equipment: item.id,
                gfx_id: item.gfxId ? String(item.gfxId) : '',
                level: item.level,
                id_equipment_type: item.itemTypeId,
                id_rarity: item.rarity,
                name_equipment: item.title.es || item.title.en || '',
                metadata: {
                    side: slotId,
                },
            })),
            deck: {
                passives: [],
                actives: [],
            },
        };
        const serialized = JSON.stringify(payload, null, 2);
        const blob = new Blob([serialized], { type: 'application/json;charset=utf-8' });
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        const fallbackId = buildName.trim().replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'build';
        anchor.href = objectUrl;
        anchor.download = `${String(buildFileId ?? fallbackId)}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(objectUrl);
        setTransferMessage(copy.exportSuccess);
    }

    function openImportBuildFilePicker() {
        setTransferMessage('');
        importBuildInputRef.current?.click();
    }

    async function handleImportBuildFile(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        try {
            const sourceText = await file.text();
            await importBuildFromJson(sourceText);
        } catch {
            setTransferMessage(copy.importError);
        }
    }

    function unequipSlot(slotId: string) {
        setEquippedBySlot((current) => {
            const next = { ...current };
            delete next[slotId];
            return next;
        });
        if (inspectedSlot === slotId) setInspectedSlot('');
    }

    function movePreference(group: 'mastery' | 'resistance', fromIndex: number, toIndex: number) {
        if (fromIndex === toIndex) return;
        if (group === 'mastery') setMasteryPreference((current) => reorderElementPreference(current, fromIndex, toIndex));
        else setResistancePreference((current) => reorderElementPreference(current, fromIndex, toIndex));
    }

    function handlePreferenceDragEnter(group: 'mastery' | 'resistance', targetIndex: number) {
        if (!draggedPreference || draggedPreference.group !== group || draggedPreference.index === targetIndex) return;
        movePreference(group, draggedPreference.index, targetIndex);
        setDraggedPreference({ group, index: targetIndex });
    }

    return (
        <div className={`container ${styles.pageShell}`}>
            <section className={styles.shell}>
                <header className={styles.topBuilder}>
                    {(selectedClass?.illustrations?.female || selectedClass?.illustrations?.male) ? (
                        <div className={styles.topBuilderBackdrop} aria-hidden="true">
                            {selectedClass?.illustrations?.female ? (
                                <img
                                    src={getAssetUrl(selectedClass.illustrations.female)}
                                    alt=""
                                    className={`${styles.topBuilderBackdropFigure} ${styles.topBuilderBackdropFigurePrimary}`.trim()}
                                />
                            ) : null}
                            {selectedClass?.illustrations?.male ? (
                                <img
                                    src={getAssetUrl(selectedClass.illustrations.male)}
                                    alt=""
                                    className={`${styles.topBuilderBackdropFigure} ${styles.topBuilderBackdropFigureSecondary}`.trim()}
                                />
                            ) : null}
                            <div className={styles.topBuilderBackdropWash} />
                        </div>
                    ) : null}
                    <div className={styles.identity}>
                        <div className={styles.classPortrait}>{selectedClass?.icon ? <img src={getAssetUrl(selectedClass.icon)} alt={getText(selectedClass.names, language)} className={styles.classPortraitImg} /> : null}</div>
                        <div className={styles.identityCopy}>
                            <input className={styles.buildNameInput} value={buildName} onChange={(event) => setBuildName(event.target.value)} aria-label={copy.buildName} />
                            <div className={styles.identityMeta}><span>{buildLevel}</span><span>{getText(selectedClass?.names, language)}</span><span>{copy.basePoints}</span></div>
                            <div className={styles.limitStrip}>
                                <span className={`${styles.tooltipAnchor} ${styles.guildBonusAnchor}`}>
                                    <button
                                        type="button"
                                        className={`${styles.guildBonusLimitButton} ${guildBonusesEnabled ? styles.guildBonusLimitButtonActive : ''}`.trim()}
                                        onClick={() => setGuildBonusesEnabled((current) => !current)}
                                    >
                                        {copy.guildBonusButton}
                                    </button>
                                    <span className={`${styles.hoverCard} ${styles.guildBonusTooltip}`} role="tooltip">
                                        <strong>{copy.guildBonusTitle}</strong>
                                        <div className={styles.guildBonusTooltipList}>
                                            {GUILD_BONUS_PRESET.map((entry) => {
                                                const label = getBuilderStatLabel(entry.actionId, language as Language);
                                                return (
                                                    <div key={`header-guild-${entry.actionId}`} className={styles.guildBonusTooltipRow}>
                                                        <BuilderStatLabel actionId={entry.actionId} label={label} className={styles.guildBonusTooltipLabel} />
                                                        <strong>{formatStatValue(entry.actionId, entry.value, { signed: true, label })}</strong>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </span>
                                </span>
                                <Badge label={copy.relics} value={relicCount} tone={styles.rarityRelic} />
                                <Badge label={copy.epics} value={epicCount} tone={styles.rarityEpic} />
                                <Badge label={copy.souvenirs} value={souvenirCount} tone={styles.raritySouvenir} />
                            </div>
                        </div>
                    </div>
                    <div className={styles.topControls}>
                        <label className={`${styles.topControl} ${styles.classTopControl}`.trim()}><span>{copy.class}</span><CustomSelect value={String(selectedClassId)} onChange={(value) => setSelectedClassId(Number(value))} options={classOptions} /></label>
                        <label className={`${styles.topControl} ${styles.levelTopControl}`.trim()}><span>{copy.level}</span><CustomSelect value={String(buildLevel)} onChange={(value) => setBuildLevel(Number(value))} options={levelBracketOptions} className={styles.levelHeaderSelect} menuClassName={styles.levelHeaderSelectMenu} /></label>
                    </div>
                    <div className={styles.topActions}>
                        <input
                            ref={importBuildInputRef}
                            type="file"
                            accept=".json,application/json"
                            className={styles.hiddenFileInput}
                            onChange={handleImportBuildFile}
                        />
                        <button type="button" className="btn btn-secondary" onClick={openImportBuildFilePicker}>{copy.importBuild}</button>
                        <button type="button" className="btn btn-primary" onClick={exportBuildToJson}>{copy.exportBuild}</button>
                    </div>
                    {transferMessage ? <div className={styles.topActionMessage}>{transferMessage}</div> : null}
                    <div className={styles.preferencePanel}>
                        <div className={styles.preferenceGroup}>
                            <span>{copy.masteryPrefs}</span>
                            <div className={styles.preferenceSelectors}>
                                {masteryPreference.map((value, index) => (
                                    <div
                                        key={`mastery-pref-${value}`}
                                        draggable
                                        className={`${styles.preferenceCapsule} ${draggedPreference?.group === 'mastery' && draggedPreference.index === index ? styles.preferenceCapsuleDragging : ''}`}
                                        onDragStart={() => setDraggedPreference({ group: 'mastery', index })}
                                        onDragEnd={() => setDraggedPreference(null)}
                                        onDragOver={(event) => event.preventDefault()}
                                        onDragEnter={() => handlePreferenceDragEnter('mastery', index)}
                                    >
                                        <span className={styles.preferenceCapsuleOrder}>{index + 1}</span>
                                        <img src={getAssetUrl(getElementIconAssetPath(value))} alt="" className={styles.preferenceElementIcon} aria-hidden />
                                        <span>{elementOptions.find((entry) => entry.value === value)?.label || value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className={styles.preferenceGroup}>
                            <span>{copy.resistancePrefs}</span>
                            <div className={styles.preferenceSelectors}>
                                {resistancePreference.map((value, index) => (
                                    <div
                                        key={`res-pref-${value}`}
                                        draggable
                                        className={`${styles.preferenceCapsule} ${draggedPreference?.group === 'resistance' && draggedPreference.index === index ? styles.preferenceCapsuleDragging : ''}`}
                                        onDragStart={() => setDraggedPreference({ group: 'resistance', index })}
                                        onDragEnd={() => setDraggedPreference(null)}
                                        onDragOver={(event) => event.preventDefault()}
                                        onDragEnter={() => handlePreferenceDragEnter('resistance', index)}
                                    >
                                        <span className={styles.preferenceCapsuleOrder}>{index + 1}</span>
                                        <img src={getAssetUrl(getElementIconAssetPath(value))} alt="" className={styles.preferenceElementIcon} aria-hidden />
                                        <span>{elementOptions.find((entry) => entry.value === value)?.label || value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className={styles.topEquipment}>
                        {SLOT_ORDER.map((slotId) => {
                            const slot = slotMap.get(slotId);
                            if (!slot) return null;
                            const item = equippedBySlot[slotId];
                            const slotIssues = equippedConditionState.invalidBySlot.get(slotId) || [];
                            return <button key={slotId} type="button" className={`${styles.equipSlot} ${activeSlot === slotId ? styles.equipSlotActive : ''} ${item ? '' : styles.equipSlotEmpty} ${slotIssues.length > 0 ? styles.equipSlotInvalid : ''} ${item && slotIssues.length === 0 ? RARITY_SURFACE[item.rarity] || styles.raritySurfaceCommon : ''}`.trim()} onClick={() => { setActiveSlot(slotId); setInspectedSlot(slotId); }}>{item ? <BuilderItemStatsHover language={language} item={{ id: item.id, title: item.title, description: item.description, level: item.level, stats: item.stats }}><ItemIcon item={item} alt={getText(item.title, language)} className={styles.equipSlotImg} fallback={getText(slot.label, language).slice(0, 1)} /></BuilderItemStatsHover> : <div className={styles.equipSlotPlaceholder}><span className={styles.equipSlotGlyph}><SlotPlaceholderIcon slotId={slotId} /></span><span className={styles.equipSlotHint}>{getText(slot.label, language)}</span></div>}<small>{item ? item.level : '-'}</small></button>;
                        })}
                    </div>
                </header>

                <nav className={styles.tabBar}>{TABS.map((tabId) => <button key={tabId} type="button" className={`${styles.tabButton} ${tab === tabId ? styles.tabButtonActive : ''}`} onClick={() => setTab(tabId)}>{copy[tabId]}</button>)}</nav>

                <div className={`${styles.contentGrid} ${tab === 'characteristics' || tab === 'adjustments' || tab === 'enchantments' || tab === 'summary' ? styles.contentGridCharacteristics : ''}`}>
                    <section className={`${styles.leftRail} ${tab === 'characteristics' || tab === 'adjustments' || tab === 'enchantments' || tab === 'summary' ? styles.characteristicsAuxHidden : ''}`}>
                        <div className={styles.panel}>
                            <h3>{copy.mainStats}</h3>
                            <div className={styles.mainStatsGrid}>
                                {primaryStats.map((entry) => {
                                    const iconPath = getPrimaryStatIconAssetPath(entry.id as PrimaryStatLayoutId, isHuppermage ? 'brisa' : 'pw');
                                    return (
                                        <div key={entry.id} className={styles.mainStatCard}>
                                            <div className={styles.mainStatCardHead}>
                                                {iconPath ? <img src={getAssetUrl(iconPath)} alt="" className={styles.mainStatIcon} aria-hidden /> : null}
                                                <span>{entry.label}</span>
                                            </div>
                                            <strong>{entry.value}</strong>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className={styles.panel}>
                            <h3>{copy.elementalStats}</h3>
                            <div className={styles.elementGrid}>
                                <ElementCard element="fire" label={getBuilderElementLabel('fire', language as Language)} resistance={elementalResistanceReduction.fire} mastery={elementalMastery.fire} language={language as Language} />
                                <ElementCard element="water" label={getBuilderElementLabel('water', language as Language)} resistance={elementalResistanceReduction.water} mastery={elementalMastery.water} language={language as Language} />
                                <ElementCard element="earth" label={getBuilderElementLabel('earth', language as Language)} resistance={elementalResistanceReduction.earth} mastery={elementalMastery.earth} language={language as Language} />
                                <ElementCard element="air" label={getBuilderElementLabel('air', language as Language)} resistance={elementalResistanceReduction.air} mastery={elementalMastery.air} language={language as Language} />
                            </div>
                        </div>
                        <div className={styles.panel}>
                            <h3>{copy.secondaryStats}</h3>
                            <div className={styles.secondaryStatsGrid}>
                                {secondaryStats.map((entry) => (
                                    <div key={entry.id} className={styles.secondaryStatCard}>
                                        <BuilderStatLabel actionId={entry.id} label={entry.label} labelClassName={styles.secondaryStatLabelText} />
                                        <strong>{formatStatValue(entry.id, entry.value, { label: entry.label, effectiveResistance: true })}</strong>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className={`${styles.centerStage} ${tab === 'characteristics' || tab === 'adjustments' || tab === 'enchantments' || tab === 'summary' ? styles.centerStageWide : ''}`}>
                        {tab === 'equipment' && <div className={styles.panel}>
                            <div className={styles.filterGrid}>
                                <label className={styles.filterField}><span>{copy.search}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.searchPlaceholder} /></label>
                                <label className={styles.filterField}><span>{copy.maxLevel}</span><CustomSelect value={String(maxItemLevel)} onChange={(value) => setMaxItemLevel(Number(value) || 0)} options={levelBracketOptions} /></label>
                                <label className={styles.filterField}><span>{copy.rarity}</span><CustomSelect value={String(rarity)} onChange={(value) => setRarity(Number(value) || 0)} options={rarityOptions} /></label>
                                <label className={styles.filterField}><span>{copy.itemType}</span><CustomSelect value={String(itemTypeId)} onChange={(value) => setItemTypeId(Number(value) || 0)} options={itemTypeOptions} /></label>
                                <label className={styles.filterField}><span>{copy.statFilter}</span><CustomSelect value={statKey} onChange={setStatKey} options={statOptions} /></label>
                            </div>
                            <div className={styles.catalogList}>{loadingItems ? <div className={styles.emptyState}>{copy.loading}</div> : items.length === 0 ? <div className={styles.emptyState}>{copy.noResults}</div> : items.map((item) => {
                                const rarityLabel = metadata?.rarities.find((entry) => entry.id === item.rarity);
                                const equipped = activeSlot && equippedBySlot[activeSlot]?.id === item.id;
                                const nextEquipIssues = activeSlot ? Array.from(getEquippedConditionState({ ...equippedBySlot, [activeSlot]: item }, exclusivePropertyRules, copy).invalidBySlot.values()).flat() : [];
                                const blocked = nextEquipIssues.length > 0;
                                return <article key={`${activeSlot}-${item.id}`} className={`${styles.itemCard} ${blocked ? styles.itemCardInvalid : RARITY_SURFACE[item.rarity] || styles.raritySurfaceCommon} ${previewItemId === item.id ? styles.itemCardPreview : ''}`.trim()} onClick={() => setPreviewItemId(item.id)}><div className={styles.itemIconBox}><BuilderItemStatsHover language={language} item={{ id: item.id, title: item.title, description: item.description, level: item.level, stats: item.stats }}><ItemIcon item={item} alt={getText(item.title, language)} className={styles.itemIconImg} fallback={getText(item.itemTypeName, language).slice(0, 1)} /></BuilderItemStatsHover></div><div className={styles.itemBody}><div className={styles.itemHeader}><div><h4>{getText(item.title, language)}</h4><p>{getText(item.itemTypeName, language)} - {copy.levelShort} {item.level}</p></div><span className={`${styles.rarityTag} ${RARITY_TONES[item.rarity] || ''}`}>{rarityLabel ? getText(rarityLabel.label, language) : `R${item.rarity}`}</span></div><div className={styles.statChips}>
                                                                    {item.stats.slice(0, 6).map((entry, index) => (
                                                                        <span key={`${item.id}-${entry.key}-${entry.value}-${index}`} className={styles.statChip}>
                                                                            <span className={styles.statChipValue}>{formatStatValue(entry.actionId, entry.value, { signed: true, label: entry.label })}</span>
                                                                            <BuilderStatLabel actionId={entry.actionId} label={entry.label} iconClassName={styles.statChipIcon} />
                                                                        </span>
                                                                    ))}
                                                                </div>{blocked ? <div className={styles.itemConditionWarning}>{copy.invalidCondition}: {Array.from(new Set(nextEquipIssues)).join(', ')}</div> : null}</div><button type="button" className={`btn ${equipped ? 'btn-secondary' : 'btn-primary'}`} disabled={blocked} onClick={(event) => { event.stopPropagation(); if (!activeSlot || blocked) return; setEquippedBySlot((current) => ({ ...current, [activeSlot]: item })); setInspectedSlot(activeSlot); }}>{blocked ? copy.cannotEquip : equipped ? copy.equipped : copy.equip}</button></article>;
                            })}</div>
                        </div>}

                        {tab === 'characteristics' && (
                            <div className={styles.characteristicsStack}>
                                <div className={styles.aptitudeLayout}>
                                    {localizedAptitudeSections.map((section) => (
                                        <section key={section.id} className={styles.aptitudeSection}>
                                            <header className={`${styles.aptitudeSectionHeader} ${APTITUDE_SECTION_TONES[section.id]}`}>
                                                <h3>{section.label}</h3>
                                                <strong>{spentBySection[section.id]}/{availableBySection[section.id]} {copy.points}</strong>
                                            </header>
                                            <div className={styles.aptitudeTable}>
                                                <div className={styles.aptitudeTableHead}>
                                                    <span>{copy.aptitude}</span>
                                                    <span>{copy.maxLevels}</span>
                                                    <span>{copy.currentValue}</span>
                                                </div>
                                                <div className={styles.aptitudeRows}>
                                                    {section.lines.map((line) => {
                                                        const spent = aptitudes[line.id] || 0;
                                                        const maxLabel = formatAptitudeMax(line.max, copy.noLimit);
                                                        return (
                                                            <div key={line.id} className={styles.aptitudeRow}>
                                                                <div className={styles.aptitudeName}>{line.label}</div>
                                                                <div className={styles.aptitudeLimit}>
                                                                    <span className={`${styles.aptitudePill} ${Number.isFinite(line.max) ? styles.aptitudePillLimit : styles.aptitudePillSoft}`}>
                                                                        {maxLabel}
                                                                    </span>
                                                                </div>
                                                                <div className={styles.aptitudeValueCell}>
                                                                    <span className={`${styles.aptitudePill} ${spent > 0 ? styles.aptitudePillActive : styles.aptitudePillSoft}`}>
                                                                        {spent} {spent === 1 ? copy.pointShort : copy.pointsShort}
                                                                    </span>
                                                                    <div className={styles.aptitudeControls}>
                                                                        <button type="button" className={styles.aptitudeButton} onClick={(event) => changeAptitude(section, line, spent - (event.shiftKey ? 10 : 1))}>-</button>
                                                                        <strong>{spent}</strong>
                                                                        <button type="button" className={styles.aptitudeButton} onClick={(event) => changeAptitude(section, line, spent + (event.shiftKey ? 10 : 1))}>+</button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </section>
                                    ))}

                                    <section className={`${styles.aptitudeSection} ${styles.aptitudeSummarySection}`}>
                                        <header className={`${styles.aptitudeSectionHeader} ${styles.aptitudeToneSummary}`}>
                                            <h3>{copy.aptitudeSummary}</h3>
                                            <strong>{Object.values(spentBySection).reduce((sum, value) => sum + value, 0)} {copy.points}</strong>
                                        </header>
                                        <div className={styles.aptitudeSummaryBody}>
                                            {aptitudeSummary.length === 0 ? (
                                                <div className={styles.emptyState}>{copy.basePoints}</div>
                                            ) : aptitudeSummary.map((entry) => (
                                                <div key={entry.id} className={styles.statRow}>
                                                    <span>{entry.label}</span>
                                                    <strong>{entry.value} {copy.points}</strong>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                            </div>
                            </div>
                        )}

                        {tab === 'adjustments' && (
                                <section className={`${styles.panel} ${styles.manualAdjustmentsPanel}`}>
                                    <div className={styles.manualAdjustmentsHeader}>
                                        <div className={styles.supportSectionHeaderCopy}>
                                            <h3>{copy.manualStatsTitle}</h3>
                                            <p className={styles.supportSectionHelp}>{copy.manualStatsEditHint}</p>
                                        </div>
                                        <button type="button" className={`btn btn-secondary ${styles.manualToolbarAction}`} onClick={resetManualStats} disabled={manualStatRows.length === 0}>
                                            {copy.manualStatsReset}
                                        </button>
                                    </div>
                                    <div className={styles.manualAdjustmentsBody}>
                                        <p className={styles.supportSectionMeta}>{copy.manualStatsHelp}</p>
                                    {manualStatRows.length === 0 ? (
                                        <p className={styles.supportSectionMeta}>{copy.manualStatsEmpty}</p>
                                    ) : (
                                            <div className={styles.manualStatGrid}>
                                                {manualStatRows.map((entry) => (
                                                    <div key={`manual-${entry.actionId}`} className={`${styles.manualStatCard} ${activeManualStatId === entry.actionId ? styles.manualStatCardEditing : ''}`.trim()}>
                                                        <button type="button" className={styles.manualStatButton} onClick={() => startManualStatEdit(entry.actionId)}>
                                                            <BuilderStatLabel actionId={entry.actionId} label={entry.label} className={styles.manualStatLabel} />
                                                            {activeManualStatId === entry.actionId ? (
                                                                <input
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    pattern="-?[0-9]*"
                                                                    className={styles.manualInlineInput}
                                                                    value={manualInputDrafts[entry.actionId] ?? String(entry.value)}
                                                                    onChange={(event) => updateManualInputDraft(entry.actionId, event.target.value)}
                                                                    onBlur={() => commitManualInputDraft(entry.actionId)}
                                                                    onKeyDown={(event) => {
                                                                        if (event.key === 'Enter') {
                                                                            event.preventDefault();
                                                                            commitManualInputDraft(entry.actionId);
                                                                        }
                                                                        if (event.key === 'Escape') {
                                                                            event.preventDefault();
                                                                            setManualInputDrafts((current) => ({ ...current, [entry.actionId]: String(entry.value) }));
                                                                            setActiveManualStatId(null);
                                                                        }
                                                                    }}
                                                                    onClick={(event) => event.stopPropagation()}
                                                                    autoFocus
                                                                />
                                                            ) : (
                                                                <strong className={styles.manualInlineValue}>{entry.value}</strong>
                                                            )}
                                                        </button>
                                                        <button type="button" className={styles.manualInlineRemove} onClick={() => removeManualStatRow(entry.actionId)} aria-label={`${copy.manualStatsRemove} ${entry.label}`}>
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </section>
                        )}

                        <div className={tab === 'enchantments' ? undefined : styles.enchantmentPanelHostHidden}>
                            <EnchantmentsPanel
                                equippedBySlot={equippedBySlot}
                                slotOrder={SLOT_ORDER}
                                language={language}
                                buildLevel={buildLevel}
                                baseStats={baseStatValues}
                                initialSnapshot={enchantmentSnapshot}
                                snapshotResetKey={enchantmentSnapshotResetKey}
                                onRuneStatsChange={setRuneStats}
                                onSnapshotChange={setEnchantmentSnapshot}
                                onEnchantmentSummaryChange={setEnchantmentSummary}
                            />
                        </div>

                        {tab === 'summary' && <div className={styles.summaryLayout}>
                            <div className={`${styles.panel} ${styles.summaryPanel} ${styles.summaryHero}`}>
                                <div className={styles.summaryHeroHead}>
                                    <div className={styles.summaryHeroIdentity}>
                                        <div className={styles.summaryHeroPortrait}>
                                            {selectedClass?.icon ? (
                                                <img
                                                    src={getAssetUrl(selectedClass.icon)}
                                                    alt={getText(selectedClass.names, language)}
                                                    className={styles.summaryHeroPortraitImg}
                                                />
                                            ) : null}
                                        </div>
                                        <div className={styles.summaryHeroCopy}>
                                            <h3>{buildName || copy.summary}</h3>
                                            <p>{getText(selectedClass?.names, language) || '-'} · {copy.levelShort} {buildLevel}</p>
                                        </div>
                                    </div>
                                    <div className={styles.summaryHeroMeta}>
                                        <span className={styles.summaryMetaChip}>{equippedItems.length} {copy.summaryEquippedShort}</span>
                                        <span className={styles.summaryMetaChip}>{relicCount} {copy.summaryRelicsShort}</span>
                                        <span className={styles.summaryMetaChip}>{epicCount} {copy.summaryEpicsShort}</span>
                                        <span className={styles.summaryMetaChip}>{souvenirCount} {copy.summarySouvenirsShort}</span>
                                    </div>
                                </div>
                                <div className={styles.summaryPrimaryStrip}>
                                    {primaryStats.map((entry) => (
                                        <div key={`summary-primary-${entry.id}`} className={styles.summaryPrimaryCard}>
                                            <div className={styles.summaryPrimaryHead}>
                                                {getPrimaryStatIconAssetPath(entry.id as PrimaryStatLayoutId, isHuppermage ? 'brisa' : 'pw') ? (
                                                    <img
                                                        src={getAssetUrl(getPrimaryStatIconAssetPath(entry.id as PrimaryStatLayoutId, isHuppermage ? 'brisa' : 'pw')!)}
                                                        alt=""
                                                        className={styles.summaryPrimaryIcon}
                                                        aria-hidden
                                                    />
                                                ) : null}
                                                <div className={styles.summaryInfoHeader}>
                                                    <span>{entry.label}</span>
                                                    <InfoBadge label={entry.label} description={getBuilderStatInfo(entry.actionId, entry.label, language as Language)} />
                                                </div>
                                            </div>
                                            <strong>{formatStatValue(entry.actionId, entry.value, { label: entry.label, effectiveResistance: true })}</strong>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className={styles.summarySectionsGrid}>
                                <div className={`${styles.panel} ${styles.summaryPanel} ${styles.summarySectionPanel}`}>
                                    <h3>{copy.elementalStats}</h3>
                                    <div className={styles.summaryElementGrid}>
                                        <ElementCard element="fire" label={getBuilderElementLabel('fire', language as Language)} resistance={elementalResistanceReduction.fire} mastery={elementalMastery.fire} language={language as Language} showInfo />
                                        <ElementCard element="water" label={getBuilderElementLabel('water', language as Language)} resistance={elementalResistanceReduction.water} mastery={elementalMastery.water} language={language as Language} showInfo />
                                        <ElementCard element="earth" label={getBuilderElementLabel('earth', language as Language)} resistance={elementalResistanceReduction.earth} mastery={elementalMastery.earth} language={language as Language} showInfo />
                                        <ElementCard element="air" label={getBuilderElementLabel('air', language as Language)} resistance={elementalResistanceReduction.air} mastery={elementalMastery.air} language={language as Language} showInfo />
                                    </div>
                                </div>
                                <div className={`${styles.panel} ${styles.summaryPanel} ${styles.summarySectionPanel}`}>
                                    <h3>{copy.enchantments}</h3>
                                    {enchantmentSummary.length === 0 ? (
                                        <div className={styles.emptyState}>{copy.summaryPlaceholder}</div>
                                    ) : (
                                        <div className={styles.summaryEnchantmentsGrid}>
                                            {enchantmentSummary.map((entry) => (
                                                <div key={`summary-enchant-${entry.itemId}-${entry.slotId}`} className={styles.summaryEnchantmentCard}>
                                                    <div className={styles.summaryEnchantmentHead}>
                                                        <strong>{entry.itemName}</strong>
                                                        <small>{entry.sublimations.length + entry.runes.length} {copy.summaryEffects}</small>
                                                    </div>
                                                    <div className={styles.summaryTagList}>
                                                        {entry.sublimations.length > 0
                                                            ? entry.sublimations.map((label) => <span key={`${entry.itemId}-s-${label}`} className={styles.summaryTag}>{label}</span>)
                                                            : <span className={styles.summaryTagMuted}>{copy.summaryNoSublimations}</span>}
                                                    </div>
                                                    <div className={styles.summaryTagList}>
                                                        {entry.runes.length > 0
                                                            ? entry.runes.map((label) => <span key={`${entry.itemId}-r-${label}`} className={styles.summaryTag}>{label}</span>)
                                                            : <span className={styles.summaryTagMuted}>{copy.summaryNoRunes}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className={`${styles.panel} ${styles.summaryPanel} ${styles.summarySectionPanel}`}>
                                <h3>{copy.secondaryStats}</h3>
                                <div className={styles.summarySecondaryGrid}>
                                    {summarySecondaryStats.map((entry) => (
                                        <div key={`summary-secondary-${entry.id}`} className={styles.summarySecondaryCard}>
                                            <div className={styles.summaryInfoHeader}><BuilderStatLabel actionId={entry.id} label={entry.id === 20 ? copy.hpShort : entry.label} labelClassName={styles.summaryStatLabel} /><InfoBadge label={entry.label} description={getBuilderStatInfo(entry.id, entry.label, language as Language)} /></div>
                                            <strong>{formatStatValue(entry.id, entry.value, { label: entry.label, effectiveResistance: true })}</strong>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>}
                    </section>

                    <aside className={`${styles.rightRail} ${tab === 'characteristics' || tab === 'adjustments' || tab === 'enchantments' || tab === 'summary' ? `${styles.rightRailSecondary} ${styles.characteristicsAuxHidden}` : ''}`}>
                        <div className={styles.panel}>{inspectedItem ? <div className={`${styles.inspectCard} ${inspectedIssues.length === 0 ? RARITY_SURFACE[inspectedItem.rarity] || styles.raritySurfaceCommon : ''} ${inspectedIssues.length > 0 ? styles.inspectCardInvalid : ''}`.trim()}><div className={styles.inspectHead}><div className={styles.inspectIconBox}><ItemIcon item={inspectedItem} alt={getText(inspectedItem.title, language)} className={styles.inspectIconImg} fallback={getText(inspectedItem.itemTypeName, language).slice(0, 1)} /></div><div><h3>{getText(inspectedItem.title, language)}</h3><p>{getText(inspectedItem.itemTypeName, language)} - {copy.levelShort} {inspectedItem.level}</p></div></div><div className={styles.inspectActions}><button type="button" className="btn btn-secondary" onClick={() => inspectedSlot && unequipSlot(inspectedSlot)}>{copy.unequip}</button></div>{inspectedIssues.length > 0 ? <div className={styles.itemConditionWarning}>{copy.invalidCondition}: {Array.from(new Set(inspectedIssues)).join(', ')}</div> : null}<p className={styles.inspectDescription}>{getText(inspectedItem.description, language)}</p><div className={styles.inspectStats}>
                                                {inspectedItem.stats.map((entry, index) => (
                                                    <div key={`inspect-${inspectedItem.id}-${entry.key}-${entry.value}-${index}`} className={styles.statRow}>
                                                        <BuilderStatLabel actionId={entry.actionId} label={entry.label} />
                                                        <strong>{formatStatValue(entry.actionId, entry.value, { signed: true, label: entry.label })}</strong>
                                                    </div>
                                                ))}
                                            </div></div> : <div className={styles.emptyState}>{copy.noItem}</div>}</div>
                        {tab === 'equipment' ? (
                            <div className={styles.panel}>
                                <h3>{copy.compare}</h3>
                                {previewItem ? (
                                    <div className={`${styles.compareCard} ${RARITY_SURFACE[previewItem.rarity] || styles.raritySurfaceCommon}`}>
                                        <div className={styles.compareHead}>
                                            <div className={styles.compareTitles}>
                                                <strong>{getText(previewItem.title, language)}</strong>
                                                <span>
                                                    {equippedInActiveSlot
                                                        ? `${copy.compareVsEquipped}: ${getText(equippedInActiveSlot.title, language)}`
                                                        : copy.compareNoEquipped}
                                                </span>
                                            </div>
                                        </div>
                                        {equippedInActiveSlot?.id === previewItem.id ? (
                                            <div className={styles.emptyState}>{copy.compareSame}</div>
                                        ) : (
                                            <>
                                                <p className={styles.compareSectionLabel}>{copy.compareBuildDelta}</p>
                                                {comparisonRows.length === 0 ? (
                                                    <div className={styles.emptyState}>{copy.compareNoStatChange}</div>
                                                ) : (
                                                    <div className={styles.compareList}>
                                                        {comparisonRows.map((row) => (
                                                            <div
                                                                key={row.actionId}
                                                                className={`${styles.compareRow} ${row.diff > 0 ? styles.comparePositive : styles.compareNegative}`.trim()}
                                                            >
                                                                <BuilderStatLabel
                                                                    actionId={row.actionId}
                                                                    label={row.label}
                                                                    className={styles.compareStatLabel}
                                                                    iconClassName={styles.compareStatIcon}
                                                                />
                                                                <strong>{formatStatValue(row.actionId, row.diff, { signed: true, label: row.label })}</strong>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className={styles.emptyState}>{copy.compareEmpty}</div>
                                )}
                            </div>
                        ) : null}
                    </aside>
                </div>
            </section>
        </div>
    );
}

function Badge({ label, value, tone }: { label: string; value: number; tone: string }) { return <span className={`${styles.rarityTag} ${tone}`}>{label}: {value}</span>; }
function InfoBadge({ label, description }: { label: string; description: string }) {
    return (
        <span className={`${styles.tooltipAnchor} ${styles.infoBadgeAnchor}`}>
            <span className={styles.infoBadgeIcon} aria-hidden="true">i</span>
            <span className={`${styles.hoverCard} ${styles.infoBadgeTooltip}`} role="tooltip">
                <strong>{label}</strong>
                <p>{description}</p>
            </span>
        </span>
    );
}

function ElementCard({
    element,
    label,
    resistance,
    mastery,
    language,
    showInfo = false,
}: {
    element: ElementKey;
    label: string;
    resistance: number;
    mastery: number;
    language: Language;
    showInfo?: boolean;
}) {
    return (
        <div className={styles.elementCard}>
            <div className={styles.elementCardHead}>
                <img src={getAssetUrl(getElementIconAssetPath(element))} alt="" className={styles.elementCardIcon} aria-hidden />
                <strong>{label}</strong>
            </div>
            <div className={styles.elementValues}>
                <div className={styles.elementMetric}>
                    <div className={styles.elementMetricLabel}>
                        <span>{getBuilderCopy(language).resShort}</span>
                        {showInfo ? <InfoBadge label={`${label} ${getBuilderCopy(language).resShort}`} description={getElementMetricInfo(element, 'resistance', language)} /> : null}
                    </div>
                    <strong>{resistance}%</strong>
                </div>
                <div className={styles.elementMetric}>
                    <div className={styles.elementMetricLabel}>
                        <span>{getBuilderCopy(language).masteryShort}</span>
                        {showInfo ? <InfoBadge label={`${label} ${getBuilderCopy(language).masteryShort}`} description={getElementMetricInfo(element, 'mastery', language)} /> : null}
                    </div>
                    <strong>{mastery}</strong>
                </div>
            </div>
        </div>
    );
}
