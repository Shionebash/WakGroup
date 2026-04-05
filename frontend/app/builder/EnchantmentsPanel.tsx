'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './page.module.css';
import { api, getAssetUrl } from '@/lib/api';
import CustomSelect from '@/components/CustomSelect';
import { BuilderStatLabel } from '@/components/BuilderStatLabel';
import { BuilderItemStatsHover } from '@/components/BuilderItemStatsHover';
import { getSublimationControls, getSublimationStackInfo, resolveSublimationStats } from '@/lib/builder-sublimations';

type LocaleText = Record<string, string | undefined>;
type RuneColorUi = 0 | 1 | 2 | 3;
type EnchantmentStatMap = Map<number, { value: number; label: string }>;
type SublimationSlotKind = 'normal' | 'rarity';

export interface EnchantmentsSnapshotRuneState {
    colors: [number, number, number, number];
    shardIds: [number | null, number | null, number | null, number | null];
    levels: [number, number, number, number];
}

export interface EnchantmentsSnapshotSublimationPick {
    normal: number | null;
    rarity: number | null;
}

export interface EnchantmentsSnapshot {
    runeState?: Record<number, EnchantmentsSnapshotRuneState>;
    sublimationPick?: Record<number, EnchantmentsSnapshotSublimationPick>;
    sublimationControlState?: Record<number, Partial<Record<SublimationSlotKind, Record<string, number>>>>;
}

export interface EnchantmentSummaryEntry {
    itemId: number;
    itemName: string;
    slotId: string;
    runes: string[];
    sublimations: string[];
}

interface EnchantmentItem {
    id: number;
    level: number;
    rarity: number;
    title: LocaleText;
    description?: LocaleText;
    maxShardSlots: number;
    gfxId?: number | null;
    itemTypeId?: number;
    isTwoHanded?: boolean;
    positions?: string[];
    stats?: Array<{ key?: string; label: string; value: number; actionId?: number }>;
}

interface EnchantmentShardEntry {
    id: number;
    color: number;
    title: LocaleText;
    actionId: number;
    statPerLevel: number;
    shardLevelRequirement: number[];
    doubleBonusPositionIndices: number[];
}

interface EnchantmentSublimationEntry {
    id: number;
    title: LocaleText;
    description: LocaleText;
    slotColorPattern: number[];
    isEpic: boolean;
    isRelic: boolean;
    gfxId: number | null;
    effects: Array<{
        actionId: number;
        label: LocaleText;
        value: number;
        text?: LocaleText;
        stateId?: number;
        stackLevel?: number;
        maxStackLevel?: number;
        valuePerStackLevel?: number;
        maxValue?: number;
        unit?: '%' | '';
        percentOfBuildLevel?: number;
        applyToAllMasteries?: boolean;
    }>;
}

interface EnchantmentCatalogResponse {
    equipmentPositionIndexLabels: string[];
    shards: EnchantmentShardEntry[];
    sublimations: EnchantmentSublimationEntry[];
}

interface PerItemRuneState {
    colors: [RuneColorUi, RuneColorUi, RuneColorUi, RuneColorUi];
    shardIds: [number | null, number | null, number | null, number | null];
    levels: [number, number, number, number];
}

interface PerItemSublimationPick {
    normal: number | null;
    rarity: number | null;
}

const DOUBLE_BONUS_BY_SLOT: Record<string, number[]> = {
    helmet: [1052, 20],
    breastplate: [120, 83, 84, 85],
    epaulettes: [26, 83],
    belt: [180, 82],
    boots: [1052, 84],
    cloak: [1055, 120, 171],
    amulet: [1055, 26],
    ring_left: [173, 175],
    ring_right: [173, 175],
    main_hand: [149, 1053, 20],
};

const COLOR_OPTIONS: Array<{ value: RuneColorUi; label: string; tone: string }> = [
    { value: 0, label: 'Blanco', tone: styles.runeColor0 },
    { value: 1, label: 'Rojo', tone: styles.runeColor1 },
    { value: 2, label: 'Verde', tone: styles.runeColor2 },
    { value: 3, label: 'Azul', tone: styles.runeColor3 },
];

const RUNE_COLOR_LABELS: Record<number, string> = {
    0: 'Blanco',
    1: 'Rojo',
    2: 'Verde',
    3: 'Azul',
};

const RUNE_ICON_BY_COLOR: Record<RuneColorUi, { empty: string; full: string }> = {
    0: {
        empty: 'assets/runas/shardWhiteEmpty.png',
        full: 'assets/runas/shardWhiteFull.png',
    },
    1: {
        empty: 'assets/runas/shardRedEmpty.png',
        full: 'assets/runas/shardRedFull.png',
    },
    2: {
        empty: 'assets/runas/shardGreenEmpty.png',
        full: 'assets/runas/shardGreenFull.png',
    },
    3: {
        empty: 'assets/runas/shardBlueEmpty.png',
        full: 'assets/runas/shardBlueFull.png',
    },
};

const SLOTS_NO_RUNE = ['off_hand', 'mount', 'pet', 'accessory'];

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

function getText(text: LocaleText | undefined, language: string) {
    return text?.[language] || text?.es || text?.en || '';
}

function getMaxRuneLevel(itemLevel: number) {
    return Math.max(1, Math.min(11, Math.floor(itemLevel / 20) + 1));
}

function createDefaultState(itemLevel: number): PerItemRuneState {
    const level = getMaxRuneLevel(itemLevel);
    return {
        colors: [0, 0, 0, 0],
        shardIds: [null, null, null, null],
        levels: [level, level, level, level],
    };
}

function getAllowedShards(shards: EnchantmentShardEntry[], color: RuneColorUi) {
    if (color === 0) return shards;
    return shards.filter((entry) => entry.color === color);
}

function patternMatchesFirstThree(slotColors: RuneColorUi[], pattern: number[]) {
    if (pattern.length === 0) return true;
    if (pattern.length !== 3 || slotColors.length < 3) return false;
    return pattern.every((entry, index) => slotColors[index] === 0 || slotColors[index] === entry);
}

function getSublimationTierLabel(entry: EnchantmentSublimationEntry) {
    if (entry.isRelic) return 'Reliquia';
    if (entry.isEpic) return 'Epica';
    return 'Normal';
}

function getSublimationPatternLabel(entry: EnchantmentSublimationEntry) {
    if (entry.slotColorPattern.length > 0) return entry.slotColorPattern.map((color) => RUNE_COLOR_LABELS[color]).join(' / ');
    if (entry.isEpic) return 'Solo equipo epico';
    if (entry.isRelic) return 'Solo reliquia';
    return 'Sin patron';
}

function getShardValue(shard: EnchantmentShardEntry, level: number, slotId: string) {
    const multiplier = DOUBLE_BONUS_BY_SLOT[slotId]?.includes(shard.actionId) ? 2 : 1;
    return shard.statPerLevel * level * multiplier;
}

function getRuneIconPath(color: RuneColorUi, isFilled: boolean) {
    const iconSet = RUNE_ICON_BY_COLOR[color] || RUNE_ICON_BY_COLOR[0];
    return getAssetUrl(isFilled ? iconSet.full : iconSet.empty);
}

function resolveSublimationNumericBonus(
    effect: EnchantmentSublimationEntry['effects'][number],
    buildLevel: number,
): number | null {
    if (effect.percentOfBuildLevel != null) {
        const raw = (Number(buildLevel) * Number(effect.percentOfBuildLevel)) / 100;
        const v = Number.isFinite(raw) ? Math.round(raw) : Number.NaN;
        return Number.isFinite(v) && v !== 0 ? v : null;
    }
    const flat = Number(effect.value);
    if (!Number.isFinite(flat) || flat === 0) return null;
    return Math.round(flat);
}

function getSublimationSharedDescription(effects: EnchantmentSublimationEntry['effects'], language: string): string | null {
    if (effects.length === 0) return null;
    const texts = effects.map((e) => (e.text ? getText(e.text, language).trim() : ''));
    const first = texts[0];
    if (!first) return null;
    return texts.every((t) => t === first) ? first : null;
}

function formatSublimationResolvedValue(resolved: number, unitSuffix: string): string {
    const n = Math.round(resolved);
    const signed = n > 0 ? `+${n}` : `${n}`;
    return `${signed}${unitSuffix}`;
}

function getDefaultSublimationPick(): PerItemSublimationPick {
    return { normal: null, rarity: null };
}

function itemHasRaritySublimationSlot(item: EnchantmentItem) {
    return item.rarity === 5 || item.rarity === 7;
}

function getRaritySublimationKind(item: EnchantmentItem): SublimationSlotKind {
    return itemHasRaritySublimationSlot(item) ? 'rarity' : 'normal';
}

function normalizeRuneColor(value: unknown): RuneColorUi {
    const numeric = Number(value);
    if (numeric === 1 || numeric === 2 || numeric === 3) return numeric;
    return 0;
}

function normalizeFiniteLevel(value: unknown, fallback: number) {
    const numeric = Math.round(Number(value));
    return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function normalizeOptionalId(value: unknown) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function normalizeSnapshot(snapshot: EnchantmentsSnapshot | null | undefined) {
    const runeState: Record<number, PerItemRuneState> = {};
    const sublimationPick: Record<number, PerItemSublimationPick> = {};
    const sublimationControlState: Record<number, Record<SublimationSlotKind, Record<string, number>>> = {};

    if (snapshot?.runeState && typeof snapshot.runeState === 'object') {
        for (const [itemIdKey, rawState] of Object.entries(snapshot.runeState)) {
            const itemId = Number(itemIdKey);
            if (!Number.isFinite(itemId) || itemId <= 0 || !rawState || typeof rawState !== 'object') continue;
            const colors = Array.isArray(rawState.colors) ? rawState.colors : [];
            const shardIds = Array.isArray(rawState.shardIds) ? rawState.shardIds : [];
            const levels = Array.isArray(rawState.levels) ? rawState.levels : [];
            runeState[itemId] = {
                colors: [
                    normalizeRuneColor(colors[0]),
                    normalizeRuneColor(colors[1]),
                    normalizeRuneColor(colors[2]),
                    normalizeRuneColor(colors[3]),
                ],
                shardIds: [
                    normalizeOptionalId(shardIds[0]),
                    normalizeOptionalId(shardIds[1]),
                    normalizeOptionalId(shardIds[2]),
                    normalizeOptionalId(shardIds[3]),
                ],
                levels: [
                    normalizeFiniteLevel(levels[0], 1),
                    normalizeFiniteLevel(levels[1], 1),
                    normalizeFiniteLevel(levels[2], 1),
                    normalizeFiniteLevel(levels[3], 1),
                ],
            };
        }
    }

    if (snapshot?.sublimationPick && typeof snapshot.sublimationPick === 'object') {
        for (const [itemIdKey, rawPick] of Object.entries(snapshot.sublimationPick)) {
            const itemId = Number(itemIdKey);
            if (!Number.isFinite(itemId) || itemId <= 0 || !rawPick || typeof rawPick !== 'object') continue;
            sublimationPick[itemId] = {
                normal: normalizeOptionalId(rawPick.normal),
                rarity: normalizeOptionalId(rawPick.rarity),
            };
        }
    }

    if (snapshot?.sublimationControlState && typeof snapshot.sublimationControlState === 'object') {
        for (const [itemIdKey, rawState] of Object.entries(snapshot.sublimationControlState)) {
            const itemId = Number(itemIdKey);
            if (!Number.isFinite(itemId) || itemId <= 0 || !rawState || typeof rawState !== 'object') continue;
            const slots: Record<SublimationSlotKind, Record<string, number>> = {
                normal: {},
                rarity: {},
            };
            for (const slot of ['normal', 'rarity'] as const) {
                const rawSlotState = rawState[slot];
                if (!rawSlotState || typeof rawSlotState !== 'object') continue;
                for (const [controlId, rawValue] of Object.entries(rawSlotState)) {
                    const numeric = Math.round(Number(rawValue));
                    if (!Number.isFinite(numeric)) continue;
                    slots[slot][controlId] = numeric;
                }
            }
            sublimationControlState[itemId] = slots;
        }
    }

    return { runeState, sublimationPick, sublimationControlState };
}

export function EnchantmentsPanel({
    equippedBySlot,
    slotOrder,
    language,
    buildLevel,
    baseStats,
    initialSnapshot,
    snapshotResetKey,
    onRuneStatsChange,
    onSnapshotChange,
    onEnchantmentSummaryChange,
}: {
    equippedBySlot: Record<string, EnchantmentItem>;
    slotOrder: string[];
    language: string;
    /** Nivel máximo del tramo elegido (p. ej. 245); usado para «X% del nivel» en sublimaciones. */
    buildLevel: number;
    baseStats: Map<number, number>;
    initialSnapshot?: EnchantmentsSnapshot | null;
    snapshotResetKey?: number | string;
    onRuneStatsChange?: (stats: EnchantmentStatMap) => void;
    onSnapshotChange?: (snapshot: EnchantmentsSnapshot) => void;
    onEnchantmentSummaryChange?: (summary: EnchantmentSummaryEntry[]) => void;
}) {
    const [catalog, setCatalog] = useState<EnchantmentCatalogResponse | null>(null);
    const [loadError, setLoadError] = useState('');
    const [runeState, setRuneState] = useState<Record<number, PerItemRuneState>>({});
    const [sublimationPick, setSublimationPick] = useState<Record<number, PerItemSublimationPick>>({});
    const [sublimationQuery, setSublimationQuery] = useState('');
    const [activeEditor, setActiveEditor] = useState<{ itemId: number; slotIndex: number } | null>(null);
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
    const [selectedSublimationSlot, setSelectedSublimationSlot] = useState<SublimationSlotKind>('normal');
    const [sublimationFilter, setSublimationFilter] = useState<'all' | 'normal' | 'epic' | 'relic'>('all');
    const [sublimationTip, setSublimationTip] = useState<{ entry: EnchantmentSublimationEntry; left: number; top: number } | null>(null);
    const [sublimationControlState, setSublimationControlState] = useState<Record<number, Record<SublimationSlotKind, Record<string, number>>>>({});
    const sublimationTipCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        api.get<EnchantmentCatalogResponse>('/builder/enchantment-catalog')
            .then((res) => setCatalog(res.data))
            .catch(() => setLoadError('No se pudo cargar el catalogo de encantamientos.'));
    }, []);

    useEffect(() => () => {
        if (sublimationTipCloseTimer.current) clearTimeout(sublimationTipCloseTimer.current);
    }, []);

    useEffect(() => {
        if (!sublimationTip) return;
        const close = () => setSublimationTip(null);
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [sublimationTip]);

    function openSublimationTip(entry: EnchantmentSublimationEntry, anchor: DOMRect) {
        if (sublimationTipCloseTimer.current) {
            clearTimeout(sublimationTipCloseTimer.current);
            sublimationTipCloseTimer.current = null;
        }
        const width = Math.min(320, window.innerWidth - 16);
        const left = Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8));
        const top = anchor.bottom + 8;
        setSublimationTip({ entry, left, top });
    }

    function scheduleCloseSublimationTip() {
        if (sublimationTipCloseTimer.current) clearTimeout(sublimationTipCloseTimer.current);
        sublimationTipCloseTimer.current = setTimeout(() => {
            setSublimationTip(null);
            sublimationTipCloseTimer.current = null;
        }, 180);
    }

    function cancelCloseSublimationTip() {
        if (sublimationTipCloseTimer.current) {
            clearTimeout(sublimationTipCloseTimer.current);
            sublimationTipCloseTimer.current = null;
        }
    }

    const equippedRows = useMemo(() => (
        slotOrder
            .map((slotId) => {
                const item = equippedBySlot[slotId];
                if (!item) return null;
                return { slotId, item };
            })
            .filter((row): row is { slotId: string; item: EnchantmentItem } => Boolean(row))
    ), [equippedBySlot, slotOrder]);

    useEffect(() => {
        const ids = new Set(equippedRows.map((row) => row.item.id));
        setRuneState((prev) => {
            let changed = false;
            const next = { ...prev };
            for (const key of Object.keys(next)) {
                if (!ids.has(Number(key))) {
                    delete next[Number(key)];
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
        setSublimationPick((prev) => {
            let changed = false;
            const next = { ...prev };
            for (const key of Object.keys(next)) {
                if (!ids.has(Number(key))) {
                    delete next[Number(key)];
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
        setSublimationControlState((prev) => {
            let changed = false;
            const next = { ...prev };
            for (const key of Object.keys(next)) {
                if (!ids.has(Number(key))) {
                    delete next[Number(key)];
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [equippedRows]);

    const shardById = useMemo(() => {
        const map = new Map<number, EnchantmentShardEntry>();
        if (!catalog) return map;
        for (const shard of catalog.shards) map.set(shard.id, shard);
        return map;
    }, [catalog]);

    useEffect(() => {
        if (equippedRows.length === 0) {
            setSelectedItemId(null);
            return;
        }
        if (selectedItemId && equippedRows.some((row) => row.item.id === selectedItemId)) return;
        setSelectedItemId(equippedRows[0].item.id);
    }, [equippedRows, selectedItemId]);

    useEffect(() => {
        const selectedItem = equippedRows.find((row) => row.item.id === selectedItemId)?.item;
        if (!selectedItem || !itemHasRaritySublimationSlot(selectedItem)) {
            setSelectedSublimationSlot('normal');
        }
    }, [equippedRows, selectedItemId]);

    useEffect(() => {
        setSublimationFilter('all');
    }, [selectedSublimationSlot]);

    useEffect(() => {
        const normalized = normalizeSnapshot(initialSnapshot);
        setRuneState(normalized.runeState);
        setSublimationPick(normalized.sublimationPick);
        setSublimationControlState(normalized.sublimationControlState);
    }, [snapshotResetKey]);

    function ensureState(item: EnchantmentItem) {
        return runeState[item.id] || createDefaultState(item.level);
    }

    function ensureSublimationPick(item: EnchantmentItem) {
        return sublimationPick[item.id] || getDefaultSublimationPick();
    }

    function updateItemState(item: EnchantmentItem, updater: (current: PerItemRuneState) => PerItemRuneState) {
        setRuneState((prev) => {
            const next = updater(prev[item.id] || createDefaultState(item.level));
            return { ...prev, [item.id]: next };
        });
    }

    const enchantmentStats = useMemo(() => {
        const totals: EnchantmentStatMap = new Map();
        if (!catalog) return totals;
        const currentStats = new Map(baseStats);
        const selectedSublimationScaleBySlot = new Map<string, number>();

        const addStat = (actionId: number, value: number, label: string) => {
            const current = totals.get(actionId);
            if (current) {
                current.value += value;
                return;
            }
            totals.set(actionId, { value, label });
        };

        const selectedSublimations = equippedRows.flatMap(({ item }) => {
            const itemPicks = ensureSublimationPick(item);
            return [itemPicks.normal, itemPicks.rarity]
                .map((pickId, index) => {
                    const slot = index === 0 ? 'normal' as const : 'rarity' as const;
                    const sublimation = pickId ? catalog.sublimations.find((entry) => entry.id === pickId) || null : null;
                    return sublimation ? { itemId: item.id, slot, sublimation } : null;
                })
                .filter((entry): entry is { itemId: number; slot: SublimationSlotKind; sublimation: EnchantmentSublimationEntry } => entry !== null);
        });
        const accumulatedLevelsByFamily = new Map<string, number>();

        for (const selected of selectedSublimations) {
            const stackInfo = getSublimationStackInfo(selected.sublimation);
            let effectScale = 1;

            if (stackInfo.maxLevel != null) {
                const unitLevel = stackInfo.level ?? 1;
                const usedLevel = accumulatedLevelsByFamily.get(stackInfo.familyKey) || 0;
                const remainingLevel = Math.max(0, stackInfo.maxLevel - usedLevel);
                const effectiveLevel = Math.min(unitLevel, remainingLevel);
                effectScale = unitLevel > 0 ? (effectiveLevel / unitLevel) : 1;
                accumulatedLevelsByFamily.set(stackInfo.familyKey, usedLevel + effectiveLevel);
            }

            selectedSublimationScaleBySlot.set(`${selected.itemId}:${selected.slot}`, effectScale);
        }

        for (const { slotId, item } of equippedRows) {
            const state = ensureState(item);
            if (!SLOTS_NO_RUNE.includes(slotId)) {
                const maxSlots = Math.min(4, Math.max(0, item.maxShardSlots));
                const maxRuneLevel = getMaxRuneLevel(item.level);

                for (let index = 0; index < maxSlots; index += 1) {
                    const shardId = state.shardIds[index];
                    const shard = shardId ? shardById.get(shardId) : null;
                    if (!shard) continue;
                    const value = getShardValue(shard, Math.min(state.levels[index], maxRuneLevel), slotId);
                    addStat(shard.actionId, value, getText(shard.title, language));
                    currentStats.set(shard.actionId, (currentStats.get(shard.actionId) || 0) + value);
                }
            }

            const itemPicks = ensureSublimationPick(item);
            const selectedEntries = [itemPicks.normal, itemPicks.rarity]
                .map((pickId, index) => ({ pickId, slot: index === 0 ? 'normal' as const : 'rarity' as const }))
                .filter((entry) => Boolean(entry.pickId));

            for (const selectedEntry of selectedEntries) {
                const sublimation = catalog.sublimations.find((entry) => entry.id === selectedEntry.pickId);
                if (!sublimation) continue;
                const resolvedStats = resolveSublimationStats({
                    entry: sublimation,
                    context: {
                        buildLevel,
                        baseStats,
                    },
                    controls: sublimationControlState[item.id]?.[selectedEntry.slot] || {},
                    currentStats,
                    effectScale: selectedSublimationScaleBySlot.get(`${item.id}:${selectedEntry.slot}`) ?? 1,
                });
                for (const resolved of resolvedStats) {
                    addStat(resolved.actionId, resolved.value, resolved.label);
                }
            }
        }

        return totals;
    }, [baseStats, buildLevel, catalog, equippedRows, runeState, shardById, sublimationControlState, sublimationPick]);

    const previousRuneStatsRef = useRef<EnchantmentStatMap>(new Map());

    useEffect(() => {
        if (!onRuneStatsChange) return;
        const previous = previousRuneStatsRef.current;
        let changed = previous.size !== enchantmentStats.size;
        if (!changed) {
            for (const [actionId, entry] of enchantmentStats) {
                const previousEntry = previous.get(actionId);
                if (previousEntry?.value !== entry.value || previousEntry?.label !== entry.label) {
                    changed = true;
                    break;
                }
            }
        }
        if (!changed) return;
        previousRuneStatsRef.current = enchantmentStats;
        onRuneStatsChange(enchantmentStats);
    }, [enchantmentStats, onRuneStatsChange]);

    const enchantmentSummary = useMemo<EnchantmentSummaryEntry[]>(() => {
        if (!catalog) return [];

        return equippedRows.map(({ slotId, item }) => {
            const state = ensureState(item);
            const maxSlots = Math.min(4, Math.max(0, item.maxShardSlots));
            const maxRuneLevel = getMaxRuneLevel(item.level);
            const itemPicks = ensureSublimationPick(item);
            const runes: string[] = [];

            for (let index = 0; index < maxSlots; index += 1) {
                const shardId = state.shardIds[index];
                const shard = shardId ? shardById.get(shardId) : null;
                if (!shard) continue;
                runes.push(`${getText(shard.title, language)} Lv. ${Math.min(state.levels[index], maxRuneLevel)}`);
            }

            const sublimations = [itemPicks.normal, itemPicks.rarity]
                .map((pickId) => pickId ? catalog.sublimations.find((entry) => entry.id === pickId) || null : null)
                .filter((entry): entry is EnchantmentSublimationEntry => entry !== null)
                .map((entry) => getText(entry.title, language));

            return {
                itemId: item.id,
                itemName: getText(item.title, language),
                slotId,
                runes,
                sublimations,
            };
        });
    }, [catalog, equippedRows, language, runeState, shardById, sublimationPick]);

    useEffect(() => {
        onEnchantmentSummaryChange?.(enchantmentSummary);
    }, [enchantmentSummary, onEnchantmentSummaryChange]);

    useEffect(() => {
        onSnapshotChange?.({
            runeState,
            sublimationPick,
            sublimationControlState,
        });
    }, [onSnapshotChange, runeState, sublimationControlState, sublimationPick]);

    const filteredSublimations = useMemo(() => {
        if (!catalog) return [];
        const query = sublimationQuery.trim().toLowerCase();
        return catalog.sublimations.filter((entry) => !query || getText(entry.title, language).toLowerCase().includes(query));
    }, [catalog, language, sublimationQuery]);

    const selectedRow = equippedRows.find((row) => row.item.id === selectedItemId) || null;
    const selectedState = selectedRow ? ensureState(selectedRow.item) : null;
    const selectedItemPicks = selectedRow ? ensureSublimationPick(selectedRow.item) : getDefaultSublimationPick();
    const selectedSublimation = useMemo(() => {
        if (!selectedRow || !catalog) return null;
        const selectedId = selectedSublimationSlot === 'normal'
            ? selectedItemPicks.normal
            : selectedItemPicks.rarity;
        return selectedId ? catalog.sublimations.find((entry) => entry.id === selectedId) || null : null;
    }, [catalog, selectedItemPicks.normal, selectedItemPicks.rarity, selectedRow, selectedSublimationSlot]);
    const selectedSublimationControls = useMemo(
        () => (selectedSublimation ? getSublimationControls(selectedSublimation) : []),
        [selectedSublimation],
    );
    const selectedCompatibleSublimations = useMemo(() => {
        if (!selectedRow || !selectedState || !catalog) return [];
        return catalog.sublimations
            .filter((entry) => {
                if (selectedSublimationSlot === 'normal') {
                    if (entry.isEpic || entry.isRelic) return false;
                    return patternMatchesFirstThree(selectedState.colors, entry.slotColorPattern);
                }
                if (selectedRow.item.rarity === 7) {
                    if (!entry.isEpic) return false;
                } else if (selectedRow.item.rarity === 5) {
                    if (!entry.isRelic) return false;
                } else {
                    return false;
                }
                return patternMatchesFirstThree(selectedState.colors, entry.slotColorPattern);
            })
            .filter((entry) => {
                if (selectedSublimationSlot === 'normal') {
                    if (sublimationFilter === 'epic' || sublimationFilter === 'relic') return false;
                    if (sublimationFilter === 'normal') return !entry.isEpic && !entry.isRelic;
                } else {
                    if (selectedRow.item.rarity === 7) return sublimationFilter === 'all' || sublimationFilter === 'epic';
                    if (selectedRow.item.rarity === 5) return sublimationFilter === 'all' || sublimationFilter === 'relic';
                }
                return true;
            })
            .filter((entry) => filteredSublimations.some((candidate) => candidate.id === entry.id));
    }, [catalog, filteredSublimations, selectedRow, selectedState, selectedSublimationSlot, sublimationFilter]);

    if (loadError) {
        return <div className={styles.panel}><div className={styles.emptyState}>{loadError}</div></div>;
    }

    if (!catalog) {
        return <div className={styles.panel}><div className={styles.emptyState}>Cargando encantamientos...</div></div>;
    }

    return (
        <div className={styles.enchantmentLayout}>
            <div className={styles.enchantmentSidebar}>
                <section className={`${styles.panel} ${styles.enchantmentColumn} ${styles.enchantmentSublimationPanel}`}>
                    <div className={styles.enchantmentHeaderRow}>
                        <div>
                            <h3 className={styles.enchantmentColumnTitle}>Sublimaciones</h3>
                            <p className={styles.enchantmentHelp}>
                                {selectedRow
                                    ? `Pieza: ${getText(selectedRow.item.title, language)}`
                                    : 'Selecciona una pieza en Mis runas (columna derecha).'}
                            </p>
                        </div>
                    </div>
                    {selectedRow ? (
                        <>
                            <div className={styles.selectedEquipmentSummary}>
                                <div className={styles.enchantmentItemIconBox}>
                                    {selectedRow.item.gfxId ? (
                                        <img
                                            src={getAssetUrl(`assets/items/${selectedRow.item.gfxId}.png`)}
                                            alt={getText(selectedRow.item.title, language)}
                                            className={styles.enchantmentItemIcon}
                                        />
                                    ) : (
                                        <span className={styles.enchantmentItemIconFallback}>{getText(selectedRow.item.title, language).slice(0, 1)}</span>
                                    )}
                                </div>
                                <div className={styles.selectedEquipmentCopy}>
                                    <strong>{getText(selectedRow.item.title, language)}</strong>
                                    <span>
                                        {selectedState?.colors.slice(0, 3).map((entry) => RUNE_COLOR_LABELS[entry]).join(' / ')} ·{' '}
                                        {selectedRow.item.rarity === 7 ? 'Epico' : selectedRow.item.rarity === 5 ? 'Reliquia' : 'Normal'}
                                    </span>
                                    <small className={styles.selectedSublimationHint}>
                                        {selectedSublimation
                                            ? `${selectedSublimationSlot === 'normal' ? 'Slot normal' : (selectedRow.item.rarity === 7 ? 'Slot epico' : 'Slot reliquia')}: ${getText(selectedSublimation.title, language)}`
                                            : `${selectedSublimationSlot === 'normal' ? 'Slot normal' : (selectedRow.item.rarity === 7 ? 'Slot epico' : 'Slot reliquia')}: vacio`}
                                    </small>
                                </div>
                            </div>
                            {itemHasRaritySublimationSlot(selectedRow.item) ? (
                                <div className={styles.sublimationSlotTabs}>
                                    <button
                                        type="button"
                                        className={`${styles.filterChip} ${selectedSublimationSlot === 'normal' ? styles.filterChipActive : ''}`.trim()}
                                        onClick={() => setSelectedSublimationSlot('normal')}
                                    >
                                        Normal
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.filterChip} ${selectedSublimationSlot === 'rarity' ? styles.filterChipActive : ''}`.trim()}
                                        onClick={() => setSelectedSublimationSlot('rarity')}
                                    >
                                        {selectedRow.item.rarity === 7 ? 'Epica' : 'Reliquia'}
                                    </button>
                                </div>
                            ) : null}
                            {selectedSublimation && selectedSublimationControls.length > 0 ? (
                                <div className={styles.sublimationConditionsCard}>
                                    <div className={styles.sublimationConditionsHeader}>
                                        <strong>Condiciones</strong>
                                        <span>Activa la situacion que quieras simular</span>
                                    </div>
                                    <div className={styles.sublimationConditionsList}>
                                        {selectedSublimationControls.map((control) => {
                                            const currentValue = sublimationControlState[selectedRow.item.id]?.[selectedSublimationSlot]?.[control.key] ?? control.defaultValue;
                                            return (
                                                <div key={control.key} className={styles.sublimationConditionRow}>
                                                    <div className={styles.sublimationConditionCopy}>
                                                        <strong>{control.label}</strong>
                                                        <small>{control.kind === 'count' ? 'Acumulaciones o intensidad' : 'Interruptor de simulacion'}</small>
                                                    </div>
                                                    {control.kind === 'toggle' ? (
                                                        <button
                                                            type="button"
                                                            className={`${styles.filterChip} ${currentValue > 0 ? styles.filterChipActive : ''}`.trim()}
                                                            onClick={() => {
                                                                setSublimationControlState((current) => ({
                                                                    ...current,
                                                                    [selectedRow.item.id]: {
                                                                        normal: { ...(current[selectedRow.item.id]?.normal || {}) },
                                                                        rarity: { ...(current[selectedRow.item.id]?.rarity || {}) },
                                                                        [selectedSublimationSlot]: {
                                                                            ...(current[selectedRow.item.id]?.[selectedSublimationSlot] || {}),
                                                                            [control.key]: currentValue > 0 ? 0 : 1,
                                                                        },
                                                                    },
                                                                }));
                                                            }}
                                                        >
                                                            {currentValue > 0 ? 'Activo' : 'Inactivo'}
                                                        </button>
                                                    ) : (
                                                        <div className={styles.levelStepper}>
                                                            <button
                                                                type="button"
                                                                className={styles.levelStepperButton}
                                                                onClick={() => {
                                                                    setSublimationControlState((current) => ({
                                                                        ...current,
                                                                        [selectedRow.item.id]: {
                                                                            normal: { ...(current[selectedRow.item.id]?.normal || {}) },
                                                                            rarity: { ...(current[selectedRow.item.id]?.rarity || {}) },
                                                                            [selectedSublimationSlot]: {
                                                                                ...(current[selectedRow.item.id]?.[selectedSublimationSlot] || {}),
                                                                                [control.key]: Math.max(control.min ?? 0, currentValue - (control.step ?? 1)),
                                                                            },
                                                                        },
                                                                    }));
                                                                }}
                                                            >
                                                                -
                                                            </button>
                                                            <strong>{currentValue}</strong>
                                                            <button
                                                                type="button"
                                                                className={styles.levelStepperButton}
                                                                onClick={() => {
                                                                    setSublimationControlState((current) => ({
                                                                        ...current,
                                                                        [selectedRow.item.id]: {
                                                                            normal: { ...(current[selectedRow.item.id]?.normal || {}) },
                                                                            rarity: { ...(current[selectedRow.item.id]?.rarity || {}) },
                                                                            [selectedSublimationSlot]: {
                                                                                ...(current[selectedRow.item.id]?.[selectedSublimationSlot] || {}),
                                                                                [control.key]: Math.min(control.max ?? 99, currentValue + (control.step ?? 1)),
                                                                            },
                                                                        },
                                                                    }));
                                                                }}
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : null}
                            <div className={styles.sublimationToolbar}>
                                <input
                                    className={styles.sublimationSearch}
                                    value={sublimationQuery}
                                    onChange={(event) => setSublimationQuery(event.target.value)}
                                    placeholder="Buscar..."
                                />
                                <div className={styles.sublimationFilters}>
                                    {[
                                        { id: 'all', label: 'Todas' },
                                        { id: 'normal', label: 'Norm.' },
                                        { id: 'epic', label: 'Epic.' },
                                        { id: 'relic', label: 'Rel.' },
                                    ].map((filter) => (
                                        <button
                                            key={filter.id}
                                            type="button"
                                            className={`${styles.filterChip} ${sublimationFilter === filter.id ? styles.filterChipActive : ''}`.trim()}
                                            onClick={() => setSublimationFilter(filter.id as 'all' | 'normal' | 'epic' | 'relic')}
                                        >
                                            {filter.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className={styles.sublimationCatalogList}>
                                <button
                                    type="button"
                                    className={styles.clearSublimationButton}
                                    onClick={() => setSublimationPick((current) => ({
                                        ...current,
                                        [selectedRow.item.id]: {
                                            ...(current[selectedRow.item.id] || getDefaultSublimationPick()),
                                            [selectedSublimationSlot]: null,
                                        },
                                    }))}
                                >
                                    Quitar
                                </button>
                                <div className={styles.sublimationCatalogScroll}>
                                    {selectedCompatibleSublimations.map((entry) => (
                                        <button
                                            key={entry.id}
                                            type="button"
                                            className={`${styles.sublimationCatalogRow} ${(selectedSublimationSlot === 'normal' ? selectedItemPicks.normal : selectedItemPicks.rarity) === entry.id ? styles.sublimationCatalogRowActive : ''}`.trim()}
                                            onClick={() => setSublimationPick((current) => ({
                                                ...current,
                                                [selectedRow.item.id]: {
                                                    ...(current[selectedRow.item.id] || getDefaultSublimationPick()),
                                                    [selectedSublimationSlot]: entry.id,
                                                },
                                            }))}
                                            onMouseEnter={(event) => openSublimationTip(entry, event.currentTarget.getBoundingClientRect())}
                                            onMouseLeave={scheduleCloseSublimationTip}
                                        >
                                            <div className={styles.sublimationIconBox}>
                                                {entry.gfxId ? (
                                                    <img
                                                        src={getAssetUrl(`assets/items/${entry.gfxId}.png`)}
                                                        alt={getText(entry.title, language)}
                                                        className={styles.sublimationIcon}
                                                    />
                                                ) : (
                                                    <span className={styles.sublimationIconFallback}>{getText(entry.title, language).slice(0, 1)}</span>
                                                )}
                                            </div>
                                            <div className={styles.sublimationCatalogMain}>
                                                <strong>{getText(entry.title, language)}</strong>
                                                <span>{getSublimationPatternLabel(entry)}</span>
                                            </div>
                                            <span className={styles.sublimationTier}>{getSublimationTierLabel(entry)}</span>
                                        </button>
                                    ))}
                                    {selectedCompatibleSublimations.length === 0 ? (
                                        <div className={styles.emptyState}>Ninguna compatible con los filtros.</div>
                                    ) : null}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className={styles.emptyState}>Selecciona pieza en Mis runas.</div>
                    )}
                </section>
            </div>

            <section className={`${styles.panel} ${styles.enchantmentColumn} ${styles.enchantmentRunesColumn}`}>
                <div className={styles.enchantmentHeaderRow}>
                    <div>
                        <h3 className={styles.enchantmentColumnTitle}>Mis runas</h3>
                        <p className={styles.enchantmentHelp}>Engarce · color · runa · nivel. Sublimación: panel izquierdo.</p>
                    </div>
                </div>
                {equippedRows.length === 0 ? (
                    <div className={styles.emptyState}>Equipa piezas para empezar a planificar runas y sublimaciones.</div>
                ) : (
                    <div className={styles.enchantmentMyList}>
                        {equippedRows.map(({ slotId, item }) => {
                            const hasRuneSlots = !SLOTS_NO_RUNE.includes(slotId);
                            const maxSlots = Math.min(4, Math.max(0, item.maxShardSlots));
                            const state = ensureState(item);
                            const itemPicks = ensureSublimationPick(item);
                            const normalCompatibleSublimations = catalog.sublimations.filter((entry) => (
                                !entry.isEpic
                                && !entry.isRelic
                                && patternMatchesFirstThree(state.colors, entry.slotColorPattern)
                            ));
                            const rarityCompatibleSublimations = catalog.sublimations.filter((entry) => {
                                if (item.rarity === 7 && !entry.isEpic) return false;
                                if (item.rarity === 5 && !entry.isRelic) return false;
                                if (item.rarity !== 5 && item.rarity !== 7) return false;
                                return patternMatchesFirstThree(state.colors, entry.slotColorPattern);
                            });
                            const selectedNormalSublimation = normalCompatibleSublimations.find((entry) => entry.id === itemPicks.normal) || null;
                            const selectedRaritySublimation = rarityCompatibleSublimations.find((entry) => entry.id === itemPicks.rarity) || null;
                            const activeSlotIndex = activeEditor?.itemId === item.id ? activeEditor.slotIndex : null;
                            const perItemTotals = new Map<number, { label: string; value: number }>();

                            for (let index = 0; index < maxSlots; index += 1) {
                                const shardId = state.shardIds[index];
                                const shard = shardId ? shardById.get(shardId) : null;
                                if (!shard) continue;
                                const value = getShardValue(shard, Math.min(state.levels[index], getMaxRuneLevel(item.level)), slotId);
                                const current = perItemTotals.get(shard.actionId);
                                if (current) current.value += value;
                                else perItemTotals.set(shard.actionId, { label: getText(shard.title, language), value });
                            }

                            if (!hasRuneSlots || maxSlots === 0) {
                                return (
                                    <article key={`${slotId}-${item.id}`} className={`${styles.enchantmentGearRow} ${RARITY_SURFACE[item.rarity] || styles.raritySurfaceCommon}`}>
                                        <div className={styles.enchantmentGearHeading}>
                                            <span className={styles.enchantmentGearName}>{getText(item.title, language)}</span>
                                            <span className={styles.enchantmentGearSlots}>Lv. {item.level}</span>
                                        </div>
                                        <div className={styles.enchantmentNoSlots}>Este objeto no acepta runas en el builder.</div>
                                    </article>
                                );
                            }

                            return (
                                <article
                                    key={`${slotId}-${item.id}`}
                                    className={`${styles.enchantmentGearRow} ${RARITY_SURFACE[item.rarity] || styles.raritySurfaceCommon} ${selectedItemId === item.id ? styles.enchantmentGearRowSelected : ''}`.trim()}
                                    onClick={() => setSelectedItemId(item.id)}
                                >
                                    <div className={styles.enchantmentZenithRow}>
                                        <div className={styles.compactSocketRow}>
                                            {Array.from({ length: maxSlots }, (_, index) => {
                                                const color = state.colors[index];
                                                const shardId = state.shardIds[index];
                                                const shard = shardId ? shardById.get(shardId) : null;
                                                const level = state.levels[index];
                                                const value = shard ? getShardValue(shard, Math.min(level, getMaxRuneLevel(item.level)), slotId) : 0;
                                                const isActive = activeSlotIndex === index;
                                                return (
                                                    <button
                                                        key={`${item.id}-${index}`}
                                                        type="button"
                                                        className={`${styles.compactSocketButton} ${isActive ? styles.compactSocketButtonActive : ''}`.trim()}
                                                        onClick={() => setActiveEditor((current) => current?.itemId === item.id && current.slotIndex === index ? null : { itemId: item.id, slotIndex: index })}
                                                    >
                                                        <span className={styles.compactSocketVisual}>
                                                            <img
                                                                src={getRuneIconPath(color, Boolean(shard))}
                                                                alt={`${RUNE_COLOR_LABELS[color]} ${shard ? 'activa' : 'vacia'}`}
                                                                className={styles.compactSocketGemImage}
                                                            />
                                                            <small className={styles.compactSocketLevelBadge}>{level}</small>
                                                        </span>
                                                        <span className={styles.compactSocketCopy}>
                                                            <strong>S{index + 1}</strong>
                                                            <span>{shard ? getText(shard.title, language) : RUNE_COLOR_LABELS[color]}</span>
                                                            <small>{shard ? `+${value}` : 'Sin efecto'}</small>
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className={styles.sublimationMiniStack}>
                                            <button
                                                type="button"
                                                className={`${styles.sublimationMiniCard} ${selectedItemId === item.id && selectedSublimationSlot === 'normal' ? styles.sublimationMiniCardActive : ''}`.trim()}
                                                onClick={() => {
                                                    setSelectedItemId(item.id);
                                                    setSelectedSublimationSlot('normal');
                                                }}
                                            >
                                                <div className={styles.sublimationMiniIconWrap}>
                                                    {selectedNormalSublimation?.gfxId ? (
                                                        <img
                                                            src={getAssetUrl(`assets/items/${selectedNormalSublimation.gfxId}.png`)}
                                                            alt={getText(selectedNormalSublimation.title, language)}
                                                            className={styles.sublimationMiniIcon}
                                                        />
                                                    ) : (
                                                        <span className={styles.sublimationMiniFallback}>N</span>
                                                    )}
                                                </div>
                                                <div className={styles.sublimationMiniCopy}>
                                                    <strong>{selectedNormalSublimation ? getText(selectedNormalSublimation.title, language) : 'Sin sublimacion normal'}</strong>
                                                    <span>{state.colors.slice(0, 3).map((entry) => RUNE_COLOR_LABELS[entry]).join(' / ')}</span>
                                                </div>
                                                <span className={styles.sublimationMiniTier}>
                                                    {selectedNormalSublimation ? 'Normal' : 'Elegir'}
                                                </span>
                                            </button>
                                            {itemHasRaritySublimationSlot(item) ? (
                                                <button
                                                    type="button"
                                                    className={`${styles.sublimationMiniCard} ${selectedItemId === item.id && selectedSublimationSlot === 'rarity' ? styles.sublimationMiniCardActive : ''}`.trim()}
                                                    onClick={() => {
                                                        setSelectedItemId(item.id);
                                                        setSelectedSublimationSlot('rarity');
                                                    }}
                                                >
                                                    <div className={styles.sublimationMiniIconWrap}>
                                                        {selectedRaritySublimation?.gfxId ? (
                                                            <img
                                                                src={getAssetUrl(`assets/items/${selectedRaritySublimation.gfxId}.png`)}
                                                                alt={getText(selectedRaritySublimation.title, language)}
                                                                className={styles.sublimationMiniIcon}
                                                            />
                                                        ) : (
                                                            <span className={styles.sublimationMiniFallback}>{item.rarity === 7 ? 'E' : 'R'}</span>
                                                        )}
                                                    </div>
                                                    <div className={styles.sublimationMiniCopy}>
                                                        <strong>{selectedRaritySublimation ? getText(selectedRaritySublimation.title, language) : `Sin sublimacion ${item.rarity === 7 ? 'epica' : 'reliquia'}`}</strong>
                                                        <span>{item.rarity === 7 ? 'Slot epico' : 'Slot reliquia'}</span>
                                                    </div>
                                                    <span className={styles.sublimationMiniTier}>
                                                        {selectedRaritySublimation ? getSublimationTierLabel(selectedRaritySublimation) : 'Elegir'}
                                                    </span>
                                                </button>
                                            ) : null}
                                        </div>
                                        <div className={styles.enchantmentGearHeading}>
                                            <BuilderItemStatsHover
                                                language={language}
                                                className={styles.enchantmentItemIconOnlyWrap}
                                                item={{
                                                    id: item.id,
                                                    title: item.title,
                                                    description: item.description,
                                                    level: item.level,
                                                    stats: item.stats,
                                                }}
                                            >
                                                <div className={styles.enchantmentItemIconBox}>
                                                    {item.gfxId ? (
                                                        <img
                                                            src={getAssetUrl(`assets/items/${item.gfxId}.png`)}
                                                            alt={getText(item.title, language)}
                                                            className={styles.enchantmentItemIcon}
                                                        />
                                                    ) : (
                                                        <span className={styles.enchantmentItemIconFallback}>{getText(item.title, language).slice(0, 1)}</span>
                                                    )}
                                                </div>
                                            </BuilderItemStatsHover>
                                        </div>
                                    </div>

                                    {activeSlotIndex !== null ? (() => {
                                        const color = state.colors[activeSlotIndex];
                                        const availableShards = getAllowedShards(catalog.shards, color);
                                        const shardId = state.shardIds[activeSlotIndex];
                                        const shard = shardId ? shardById.get(shardId) : null;
                                        const level = state.levels[activeSlotIndex];
                                        const maxRuneLevel = getMaxRuneLevel(item.level);
                                        const slotValue = shard ? getShardValue(shard, Math.min(level, maxRuneLevel), slotId) : 0;
                                        return (
                                            <div className={styles.socketEditorCard}>
                                                <div className={styles.socketEditorHeader}>
                                                    <strong>Engarce {activeSlotIndex + 1}</strong>
                                                    <span>{shard ? `+${slotValue} ${getText(shard.title, language)}` : 'Sin efecto'}</span>
                                                </div>
                                                <div className={styles.colorPills}>
                                                    {COLOR_OPTIONS.map((entry) => (
                                                        <button
                                                            key={`${item.id}-${activeSlotIndex}-${entry.value}`}
                                                            type="button"
                                                            className={`${styles.colorPill} ${color === entry.value ? styles.colorPillActive : ''}`.trim()}
                                                            onClick={() => {
                                                                updateItemState(item, (current) => {
                                                                    const next = {
                                                                        colors: [...current.colors] as PerItemRuneState['colors'],
                                                                        shardIds: [...current.shardIds] as PerItemRuneState['shardIds'],
                                                                        levels: [...current.levels] as PerItemRuneState['levels'],
                                                                    };
                                                                    next.colors[activeSlotIndex] = entry.value;
                                                                    const allowed = getAllowedShards(catalog.shards, entry.value);
                                                                    const currentShard = next.shardIds[activeSlotIndex];
                                                                    next.shardIds[activeSlotIndex] = currentShard && allowed.some((candidate) => candidate.id === currentShard)
                                                                        ? currentShard
                                                                        : (allowed[0]?.id ?? null);
                                                                    return next;
                                                                });
                                                            }}
                                                        >
                                                            <img
                                                                src={getRuneIconPath(entry.value, entry.value === color)}
                                                                alt={entry.label}
                                                                className={styles.colorPillGemImage}
                                                            />
                                                            <span>{entry.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className={styles.socketEditorGrid}>
                                                    <label className={styles.socketEditorField}>
                                                        <span>Efecto</span>
                                                        <CustomSelect
                                                            className={styles.compactSelect}
                                                            menuClassName={styles.compactSelectMenu}
                                                            value={shardId ? String(shardId) : ''}
                                                            onChange={(value) => {
                                                                const nextId = value ? Number(value) : null;
                                                                updateItemState(item, (current) => {
                                                                    const next = {
                                                                        colors: [...current.colors] as PerItemRuneState['colors'],
                                                                        shardIds: [...current.shardIds] as PerItemRuneState['shardIds'],
                                                                        levels: [...current.levels] as PerItemRuneState['levels'],
                                                                    };
                                                                    next.shardIds[activeSlotIndex] = nextId;
                                                                    return next;
                                                                });
                                                            }}
                                                            options={[
                                                                { value: '', label: 'Sin efecto' },
                                                                ...availableShards.map((entry) => ({ value: String(entry.id), label: getText(entry.title, language) })),
                                                            ]}
                                                        />
                                                    </label>
                                                    <label className={styles.socketEditorField}>
                                                        <span>Nivel</span>
                                                        <div className={styles.levelStepper}>
                                                            <button
                                                                type="button"
                                                                className={styles.levelStepperButton}
                                                                onClick={() => {
                                                                    updateItemState(item, (current) => {
                                                                        const next = {
                                                                            colors: [...current.colors] as PerItemRuneState['colors'],
                                                                            shardIds: [...current.shardIds] as PerItemRuneState['shardIds'],
                                                                            levels: [...current.levels] as PerItemRuneState['levels'],
                                                                        };
                                                                        next.levels[activeSlotIndex] = Math.max(1, next.levels[activeSlotIndex] - 1);
                                                                        return next;
                                                                    });
                                                                }}
                                                            >
                                                                -
                                                            </button>
                                                            <strong>{level}</strong>
                                                            <button
                                                                type="button"
                                                                className={styles.levelStepperButton}
                                                                onClick={() => {
                                                                    updateItemState(item, (current) => {
                                                                        const next = {
                                                                            colors: [...current.colors] as PerItemRuneState['colors'],
                                                                            shardIds: [...current.shardIds] as PerItemRuneState['shardIds'],
                                                                            levels: [...current.levels] as PerItemRuneState['levels'],
                                                                        };
                                                                        next.levels[activeSlotIndex] = Math.min(maxRuneLevel, next.levels[activeSlotIndex] + 1);
                                                                        return next;
                                                                    });
                                                                }}
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                        );
                                    })() : null}

                                    <div className={styles.enchantmentTotalsRow}>
                                        {Array.from(perItemTotals.entries()).length > 0 ? (
                                            Array.from(perItemTotals.entries()).map(([actionId, entry]) => (
                                                <span key={`${item.id}-${actionId}`} className={styles.enchantmentTotalChip}>+{entry.value} {entry.label}</span>
                                            ))
                                        ) : (
                                            <span className={styles.enchantmentHint}>Sin runas en esta pieza.</span>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            {typeof document !== 'undefined' && sublimationTip
                ? createPortal(
                    <div
                        role="tooltip"
                        className={styles.sublimationTooltipPortal}
                        style={{ left: sublimationTip.left, top: sublimationTip.top }}
                        onMouseEnter={cancelCloseSublimationTip}
                        onMouseLeave={scheduleCloseSublimationTip}
                    >
                        <strong>{getText(sublimationTip.entry.title, language)}</strong>
                        {sublimationTip.entry.effects.length > 0 ? (
                            <div className={styles.hoverCardStats}>
                                {(() => {
                                    const shared = getSublimationSharedDescription(sublimationTip.entry.effects, language);
                                    return (
                                        <>
                                            {shared ? <p className={styles.sublimationTooltipDescription}>{shared}</p> : null}
                                            {sublimationTip.entry.effects.map((effect, effectIndex) => {
                                                if (
                                                    effect.stateId &&
                                                    effect.stackLevel &&
                                                    effect.maxStackLevel &&
                                                    effect.valuePerStackLevel
                                                ) {
                                                    return (
                                                        <div
                                                            key={`${sublimationTip.entry.id}-${effect.actionId}-${effect.stateId}-${effectIndex}`}
                                                            className={styles.hoverCardRow}
                                                        >
                                                            {effect.text ? (
                                                                <span>{getText(effect.text, language)}</span>
                                                            ) : (
                                                                <BuilderStatLabel
                                                                    actionId={effect.actionId}
                                                                    label={getText(effect.label, language)}
                                                                />
                                                            )}
                                                            {!effect.text ? (
                                                                <strong>
                                                                    {effect.value > 0 ? `+${effect.value}` : effect.value}
                                                                </strong>
                                                            ) : null}
                                                        </div>
                                                    );
                                                }
                                                const resolved = resolveSublimationNumericBonus(effect, buildLevel);
                                                if (resolved == null) return null;
                                                const unit = effect.unit === '%' ? '%' : '';
                                                const valueStr = formatSublimationResolvedValue(resolved, unit);
                                                const showInlineDescription = !shared && effect.text;
                                                return (
                                                    <div
                                                        key={`${sublimationTip.entry.id}-${effect.actionId}-${effect.stateId || 'base'}-${effectIndex}`}
                                                        className={styles.hoverCardRow}
                                                    >
                                                        {showInlineDescription ? (
                                                            <span>{getText(effect.text, language)}</span>
                                                        ) : (
                                                            <BuilderStatLabel
                                                                actionId={effect.actionId}
                                                                label={getText(effect.label, language)}
                                                            />
                                                        )}
                                                        <strong>{valueStr}</strong>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    );
                                })()}
                            </div>
                        ) : (
                            <p className={styles.sublimationTooltipMuted}>Sin efectos detectados en gamedata.</p>
                        )}
                    </div>,
                    document.body,
                )
                : null}
        </div>
    );
}
