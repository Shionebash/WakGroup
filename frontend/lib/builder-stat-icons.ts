/** Icon filenames under `backend/assets/icons/` (served as `/assets/icons/...`). */

export type ElementKey = 'fire' | 'water' | 'earth' | 'air';

export const ELEMENT_KEY_ICONS: Record<ElementKey, string> = {
    fire: 'DMG_FIRE_PERCENT.png',
    water: 'DMG_WATER_PERCENT.png',
    earth: 'DMG_EARTH_PERCENT.png',
    air: 'DMG_AIR_PERCENT.png',
};

/** Known Wakfu actionId → icon file (dmg/res icons double as dominio/resistencia elemental por elemento). */
const ACTION_ICON: Record<number, string> = {
    20: 'HP.png',
    /** % PdV máx. (sublimación Cicatrización, etc.) — mismo icono que vida. */
    986: 'HP.png',
    26: 'HEAL_IN_PERCENT.png',
    31: 'AP.png',
    39: 'ARMOR_RECEIVED.png',
    40: 'ARMOR_GIVEN.png',
    41: 'MP.png',
    71: 'RES_BACKSTAB.png',
    80: 'RES_IN_PERCENT.png',
    82: 'RES_FIRE_PERCENT.png',
    83: 'RES_WATER_PERCENT.png',
    84: 'RES_EARTH_PERCENT.png',
    85: 'RES_AIR_PERCENT.png',
    120: 'DMG_IN_PERCENT.png',
    122: 'DMG_FIRE_PERCENT.png',
    123: 'DMG_EARTH_PERCENT.png',
    124: 'DMG_WATER_PERCENT.png',
    125: 'DMG_AIR_PERCENT.png',
    126: 'FINAL_DMG_IN_PERCENT.png',
    900001: 'INDIRECT_DMG.png',
    900002: 'SINGLE_TARGET_DMG.png',
    149: 'CRITICAL_BONUS.png',
    150: 'FEROCITY.png',
    160: 'RANGE.png',
    161: 'RANGE.png',
    162: 'PROSPECTION.png',
    166: 'WISDOM.png',
    171: 'INIT.png',
    173: 'TACKLE.png',
    175: 'DODGE.png',
    177: 'WILLPOWER.png',
    180: 'BACKSTAB_BONUS.png',
    184: 'LEADERSHIP.png',
    191: 'WP.png',
    192: 'WP.png',
    304: 'LEADERSHIP.png',
    875: 'BLOCK.png',
    988: 'CRITICAL_RES.png',
    1052: 'MELEE_DMG.png',
    1053: 'RANGED_DMG.png',
    1055: 'BERSERK_DMG.png',
    1068: 'DMG_IN_PERCENT.png',
    1095: 'HEAL_IN_PERCENT.png',
    45897: 'ARMOR.png',
    191191: 'HUPPERMAGE_RESOURCE.png',
};

function stripDiacritics(value: string) {
    return value.normalize('NFD').replace(/\p{M}/gu, '');
}

/**
 * Heurística por texto localizado cuando el actionId no está en la tabla (p. ej. stats venidas del gamedata).
 */
export function inferBuilderStatIconFromLabel(label: string): string | null {
    const t = stripDiacritics(label.toLowerCase());
    const res = t.includes('resistencia') || t.includes('resistance');
    const dom = t.includes('dominio') || t.includes('mastery') || t.includes('maitrise');

    if (res || dom) {
        if (t.includes('fuego') || t.includes('fire') || t.includes('feu')) return res ? 'RES_FIRE_PERCENT.png' : 'DMG_FIRE_PERCENT.png';
        if (t.includes('agua') || t.includes('water') || t.includes('eau')) return res ? 'RES_WATER_PERCENT.png' : 'DMG_WATER_PERCENT.png';
        if (t.includes('tierra') || t.includes('earth') || t.includes('terre')) return res ? 'RES_EARTH_PERCENT.png' : 'DMG_EARTH_PERCENT.png';
        if (t.includes('aire') || t.includes('air')) return res ? 'RES_AIR_PERCENT.png' : 'DMG_AIR_PERCENT.png';
        if (t.includes('elemental')) return res ? 'RES_IN_PERCENT.png' : 'DMG_IN_PERCENT.png';
        if (t.includes('espalda') || t.includes('backstab') || t.includes('dos')) return res ? 'RES_BACKSTAB.png' : 'BACKSTAB_BONUS.png';
        if (t.includes('critica') || t.includes('critique') || t.includes('critical')) return res ? 'CRITICAL_RES.png' : 'CRITICAL_BONUS.png';
    }

    if (t.includes('placaje') || t.includes('tackle')) return 'TACKLE.png';
    if (t.includes('esquiva') || t.includes('dodge') || t.includes('esquive')) return 'DODGE.png';
    if (t.includes('iniciativa') || t.includes('initiative')) return 'INIT.png';
    if (t.includes('prospe')) return 'PROSPECTION.png';
    if (t.includes('voluntad') || t.includes('willpower') || t.includes('volonte')) return 'WILLPOWER.png';
    if (t.includes('parada') || t.includes('block') || t.includes('parade')) return 'BLOCK.png';
    if (t.includes('melee') || t.includes('cuerpo')) return 'MELEE_DMG.png';
    if (t.includes('distancia') || t.includes('ranged') || t.includes('distance')) return 'RANGED_DMG.png';
    if (t.includes('berserk')) return 'BERSERK_DMG.png';
    if (t.includes('curación') || t.includes('curacion') || t.includes('soins') || t.includes('heal')) return 'HEAL_IN_PERCENT.png';
    if (t.includes('sabiduria') || t.includes('sagesse') || t.includes('wisdom')) return 'WISDOM.png';
    if (t.includes('alcance') || t.includes('range') || t.includes('portee')) return 'RANGE.png';
    if (t.includes('armadura recibida')) return 'ARMOR_RECEIVED.png';
    if (t.includes('armadura dada')) return 'ARMOR_GIVEN.png';
    if (t.includes('daños indirectos') || t.includes('indirect')) return 'INDIRECT_DMG.png';
    if (t.includes('daños directos') || t.includes('single')) return 'SINGLE_TARGET_DMG.png';
    if (t.includes('daños infligidos') || t.includes('dommages infliges')) return 'FINAL_DMG_IN_PERCENT.png';
    if (t.match(/\bpw\b/) || t.includes('wakfu') || t.includes('bris') || t.includes('breeze')) return t.includes('bris') || t.includes('breeze') ? 'HUPPERMAGE_RESOURCE.png' : 'WP.png';
    if (t.includes('punto de accion') || t.match(/\bpa\b/)) return 'AP.png';
    if (t.includes('punto de movimiento') || t.match(/\bpm\b/)) return 'MP.png';
    if (t.includes('vida') || t.includes('pdv') || t.includes('pv ') || t.match(/\bhp\b/)) return 'HP.png';
    if (t.includes('control') || t.includes('mando')) return 'LEADERSHIP.png';
    if (t.includes('golpe critico') || t.includes('critico') || t.includes('coups critiques')) return 'FEROCITY.png';
    if (t.includes('armadura') && !t.includes('recibida') && !t.includes('dada')) return 'ARMOR.png';

    return null;
}

export function getBuilderStatIconFilename(actionId: number | undefined, labelHint?: string): string | null {
    if (actionId !== undefined && ACTION_ICON[actionId] !== undefined) {
        return ACTION_ICON[actionId];
    }
    if (labelHint) {
        const inferred = inferBuilderStatIconFromLabel(labelHint);
        if (inferred) return inferred;
    }
    return null;
}

/** Ruta relativa al origin del API (p. ej. `http://localhost:4000/assets/icons/HP.png`). */
export function getBuilderStatIconAssetPath(actionId: number | undefined, labelHint?: string): string | null {
    const file = getBuilderStatIconFilename(actionId, labelHint);
    return file ? `assets/icons/${file}` : null;
}

export function getElementIconAssetPath(element: ElementKey): string {
    return `assets/icons/${ELEMENT_KEY_ICONS[element]}`;
}

export type PrimaryStatLayoutId = 'hp' | 'ap' | 'mp' | 'resource' | 'armor' | 'mastery';

export function getPrimaryStatIconAssetPath(id: PrimaryStatLayoutId, resource: 'pw' | 'brisa'): string | null {
    switch (id) {
        case 'hp':
            return 'assets/icons/HP.png';
        case 'ap':
            return 'assets/icons/AP.png';
        case 'mp':
            return 'assets/icons/MP.png';
        case 'resource':
            return resource === 'brisa' ? 'assets/icons/HUPPERMAGE_RESOURCE.png' : 'assets/icons/WP.png';
        case 'armor':
            return 'assets/icons/ARMOR.png';
        case 'mastery':
            return 'assets/icons/DMG_IN_PERCENT.png';
        default:
            return null;
    }
}
