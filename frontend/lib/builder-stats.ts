export interface BuilderStatEntry {
    actionId: number;
    label: string;
    value: number;
    order: number;
    group: 'primary' | 'secondary' | 'elemental';
    visible?: boolean;
}

interface BuilderStatMeta {
    label: string;
    order: number;
    group: BuilderStatEntry['group'];
    visible?: boolean;
}

export interface BuilderVisibleStatDefinition {
    actionId: number;
    label: string;
    order: number;
    group: BuilderStatEntry['group'];
}

interface BuilderRelatedStat {
    sourceActionId: number;
    targetActionId: number;
    multiplier: number;
}

interface BuilderBaseContext {
    buildLevel: number;
    isIop: boolean;
    isHuppermage: boolean;
}

const STAT_META: Record<number, BuilderStatMeta> = {
    20: { label: 'PdV', order: 6, group: 'primary', visible: true },
    26: { label: 'Dominio cura', order: 22, group: 'secondary', visible: true },
    31: { label: 'PA', order: 1, group: 'primary', visible: true },
    39: { label: 'Armadura recibida', order: 30, group: 'secondary', visible: true },
    40: { label: 'Armadura dada', order: 31, group: 'secondary', visible: true },
    41: { label: 'PM', order: 2, group: 'primary', visible: true },
    71: { label: 'Resistencia espalda', order: 39, group: 'secondary', visible: true },
    80: { label: 'Resistencia elemental', order: 33, group: 'elemental', visible: true },
    82: { label: 'Resistencia fuego', order: 35, group: 'elemental', visible: true },
    83: { label: 'Resistencia agua', order: 34, group: 'elemental', visible: true },
    84: { label: 'Resistencia tierra', order: 36, group: 'elemental', visible: true },
    85: { label: 'Resistencia aire', order: 37, group: 'elemental', visible: true },
    120: { label: 'Dominio elemental', order: 25, group: 'secondary', visible: true },
    122: { label: 'Dominio fuego', order: 26, group: 'elemental', visible: true },
    123: { label: 'Dominio tierra', order: 28, group: 'elemental', visible: true },
    124: { label: 'Dominio agua', order: 27, group: 'elemental', visible: true },
    125: { label: 'Dominio aire', order: 29, group: 'elemental', visible: true },
    126: { label: 'Daños infligidos', order: 43, group: 'secondary', visible: true },
    900001: { label: 'Daños indirectos', order: 42, group: 'secondary', visible: true },
    900002: { label: 'Daños directos', order: 41, group: 'secondary', visible: true },
    900003: { label: 'Acribia', order: 45, group: 'secondary', visible: false },
    900004: { label: 'Adrezo', order: 46, group: 'secondary', visible: false },
    900005: { label: 'Adrezo secundario', order: 47, group: 'secondary', visible: false },
    149: { label: 'Dominio critico', order: 17, group: 'secondary', visible: true },
    150: { label: '% Golpe critico', order: 12, group: 'secondary', visible: true },
    160: { label: 'Alcance', order: 4, group: 'secondary', visible: true },
    161: { label: 'Alcance', order: 4, group: 'secondary', visible: false },
    162: { label: 'Prospeccion', order: 10, group: 'secondary', visible: true },
    166: { label: 'Sabiduria', order: 11, group: 'secondary', visible: true },
    171: { label: 'Iniciativa', order: 9, group: 'secondary', visible: true },
    173: { label: 'Placaje', order: 7, group: 'secondary', visible: true },
    175: { label: 'Esquiva', order: 8, group: 'secondary', visible: true },
    177: { label: 'Voluntad', order: 41, group: 'secondary', visible: true },
    180: { label: 'Dominio espalda', order: 18, group: 'secondary', visible: true },
    184: { label: 'Control', order: 5, group: 'secondary', visible: false },
    191: { label: 'PW', order: 3, group: 'primary', visible: true },
    304: { label: 'Control', order: 5, group: 'secondary', visible: true },
    875: { label: 'Parada', order: 13, group: 'secondary', visible: true },
    988: { label: 'Resistencia critica', order: 38, group: 'secondary', visible: true },
    1052: { label: 'Dominio melee', order: 21, group: 'secondary', visible: true },
    1053: { label: 'Dominio distancia', order: 24, group: 'secondary', visible: true },
    1055: { label: 'Dominio berserker', order: 19, group: 'secondary', visible: true },
    1068: { label: 'Dominio elemental (2 elem.)', order: 25, group: 'secondary', visible: false },
    1095: { label: 'Curas realizadas', order: 44, group: 'secondary', visible: true },
    191191: { label: 'Brisa', order: 3, group: 'primary', visible: false },
    45897: { label: 'Armadura', order: 5, group: 'primary', visible: true },
    986: { label: '% PdV (sublimación)', order: 9998, group: 'secondary', visible: false },
};

const RELATED_STATS: BuilderRelatedStat[] = [
    { sourceActionId: 191, targetActionId: 191191, multiplier: 75 },
];

/** En datos de sublimación (shards.txt): % de PdV máx. — se aplica sobre PdV ya acumulado, no como stat secundario plano. */
export const SUBLIMATION_MAX_HP_PERCENT_ACTION_IDS = new Set<number>([986]);

export const BUILDER_ELEMENTAL_MASTERY_ACTION_IDS: readonly number[] = [
    120, 122, 123, 124, 125, 1068,
];

export const BUILDER_SECONDARY_MASTERY_ACTION_IDS: readonly number[] = [
    26, 149, 180, 1052, 1053, 1055,
];

/**
 * Sublis «% del nivel» a **todos los dominios** (valor plano nivel×%): elementales por elemento + dominios secundarios.
 * No incluye 120 (dominio elemental global) ni 1068 (meta 2 elem.), alineado con el reparto en juego.
 */
export const BUILDER_SUBLIMATION_WIDE_DOMINIO_ACTION_IDS: readonly number[] = [
    122, 123, 124, 125, ...BUILDER_SECONDARY_MASTERY_ACTION_IDS,
];

function getBaseStats(context: BuilderBaseContext) {
    // Hipermago usa Brisa en lugar de PW base:
    // Brisa base = 500 y la conversión 1 PW = 75 Brisa
    // se aplica solo sobre PW aportado por equipo/características.
    const baseWp = context.isHuppermage ? 0 : 6;
    return new Map<number, number>([
        [20, 50 + context.buildLevel * 10],
        [31, 6],
        [41, context.isIop ? 4 : 3],
        [191, baseWp],
        [150, 3],
    ]);
}

function getMeta(actionId: number): BuilderStatMeta {
    return STAT_META[actionId] || {
        label: `Stat ${actionId}`,
        order: 9999,
        group: 'secondary',
        visible: true,
    };
}

export function getVisibleBuilderStatDefinitions() {
    return Object.entries(STAT_META)
        .map(([actionIdText, meta]) => ({
            actionId: Number(actionIdText),
            label: meta.label,
            order: meta.order,
            group: meta.group,
            visible: meta.visible !== false,
        }))
        .filter((entry) => entry.visible)
        .filter((entry) => entry.actionId !== 20)
        .sort((left, right) => left.order - right.order || left.label.localeCompare(right.label))
        .map(({ actionId, label, order, group }) => ({ actionId, label, order, group })) satisfies BuilderVisibleStatDefinition[];
}

export function createBuilderStatMap(context: BuilderBaseContext) {
    const map = new Map<number, BuilderStatEntry>();
    for (const [actionIdText, meta] of Object.entries(STAT_META)) {
        const actionId = Number(actionIdText);
        if (!meta.visible) continue;
        map.set(actionId, { actionId, label: meta.label, value: 0, order: meta.order, group: meta.group, visible: meta.visible });
    }
    for (const [actionId, value] of getBaseStats(context)) {
        const meta = getMeta(actionId);
        map.set(actionId, { actionId, label: meta.label, value, order: meta.order, group: meta.group, visible: meta.visible });
    }
    return map;
}

export function addBuilderStatValue(
    map: Map<number, BuilderStatEntry>,
    actionId: number,
    value: number,
    label?: string,
) {
    const current = map.get(actionId);
    if (current) {
        current.value += value;
        if (label) current.label = label;
        return;
    }
    const meta = getMeta(actionId);
    map.set(actionId, {
        actionId,
        label: label || meta.label,
        value,
        order: meta.order,
        group: meta.group,
        visible: meta.visible,
    });
}

export function applyRelatedStats(
    map: Map<number, BuilderStatEntry>,
    context: BuilderBaseContext,
) {
    if (!context.isHuppermage) return;
    const baseBreeze = 500;
    addBuilderStatValue(map, 191191, baseBreeze);
    for (const relation of RELATED_STATS) {
        const source = map.get(relation.sourceActionId)?.value || 0;
        addBuilderStatValue(map, relation.targetActionId, source * relation.multiplier);
    }
}

export function getBuilderStatValue(map: Map<number, BuilderStatEntry>, actionIds: number[]) {
    return actionIds.reduce((sum, actionId) => sum + (map.get(actionId)?.value || 0), 0);
}

export function getBuilderStatEntries(
    map: Map<number, BuilderStatEntry>,
    group?: BuilderStatEntry['group'],
) {
    const entries = Array.from(map.values())
        .filter((entry) => entry.visible !== false)
        .filter((entry) => !group || entry.group === group)
        .sort((left, right) => left.order - right.order || left.label.localeCompare(right.label));

    const aggregated = new Map<string, BuilderStatEntry>();
    for (const entry of entries) {
        const key = `${entry.group}|${entry.label}`;
        const current = aggregated.get(key);
        if (current) {
            current.value += entry.value;
            current.order = Math.min(current.order, entry.order);
            continue;
        }
        aggregated.set(key, { ...entry });
    }

    return Array.from(aggregated.values())
        .sort((left, right) => left.order - right.order || left.label.localeCompare(right.label));
}

const RUNE_SLOTS_NO_RUNE = ['off_hand', 'mount', 'pet', 'accessory'];
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

interface RuneState {
    colors: number[];
    shardIds: (number | null)[];
    levels: number[];
}

interface ShardData {
    id: number;
    actionId: number;
    statPerLevel: number;
    doubleBonusPositionIndices: number[];
}

export function equipmentHasRuneSlots(slotId: string): boolean {
    return !RUNE_SLOTS_NO_RUNE.includes(slotId);
}

export function calculateRuneStats(
    slotId: string,
    itemLevel: number,
    runeState: RuneState,
    shardsCatalog: ShardData[],
): Map<number, number> {
    const stats = new Map<number, number>();
    const maxRuneLevel = Math.min(11, Math.floor(itemLevel / 20) + 1);

    for (let i = 0; i < 4; i++) {
        const color = runeState.colors[i];
        const shardId = runeState.shardIds[i];
        const level = Math.min(runeState.levels[i], maxRuneLevel);

        if (color === 0 || !shardId || level < 1) continue;

        const shard = shardsCatalog.find(s => s.id === shardId);
        if (!shard || !shard.actionId || !shard.statPerLevel) continue;

        const multiplier = DOUBLE_BONUS_BY_SLOT[slotId]?.includes(shard.actionId) ? 2 : 1;
        const value = shard.statPerLevel * level * multiplier;
        stats.set(shard.actionId, (stats.get(shard.actionId) || 0) + value);
    }

    return stats;
}
