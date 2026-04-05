import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type LocaleText = Record<string, string | undefined>;
type EffectSummary = {
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
    /** Entero de datos: p. ej. 10 = 10% del nivel del personaje; valor plano aplicado = nivel × (esto/100), p. ej. 245×10% = 24,5. */
    percentOfBuildLevel?: number;
    /** Si true, el cliente aplica el valor calculado a todas las vías de dominio del builder. */
    applyToAllMasteries?: boolean;
};

export interface EnchantmentShardEntry {
    id: number;
    /** 1 = roja, 2 = verde, 3 = azul (no hay blanca en datos: la blanca es comodín solo en UI). */
    color: number;
    title: LocaleText;
    actionId: number;
    statPerLevel: number;
    shardLevelingCurve: number[];
    shardLevelRequirement: number[];
    /** Índices de posición de equipo (hoja de personaje) donde la runa cuenta doble. */
    doubleBonusPositionIndices: number[];
}

export interface EnchantmentSublimationEntry {
    id: number;
    title: LocaleText;
    description: LocaleText;
    slotColorPattern: number[];
    isEpic: boolean;
    isRelic: boolean;
    gfxId: number | null;
    effects: EffectSummary[];
}

export interface EnchantmentCatalogResponse {
    /** Orden de índices 0..13 usado por `doubleBonusPositionIndices` y el cliente. */
    equipmentPositionIndexLabels: string[];
    shards: EnchantmentShardEntry[];
    sublimations: EnchantmentSublimationEntry[];
}

let cached: EnchantmentCatalogResponse | null = null;
let shardsTxtCache: ShardsTxtRoot | null = null;
type LangCode = 'es' | 'en' | 'fr' | 'pt';
let sublimationI18nCache: Record<LangCode, { titles: Map<number, string>; descs: Map<number, string> }> | null = null;

function decodeI18nLine(value: string) {
    return value.replace(/\\n/g, '\n').trim();
}

function loadSublimationI18n(): Record<LangCode, { titles: Map<number, string>; descs: Map<number, string> }> {
    if (sublimationI18nCache) return sublimationI18nCache;
    const base = path.join(__dirname, '../../data/i18n');
    const files: Record<LangCode, string> = {
        es: path.join(base, 'es/texts_es.properties'),
        en: path.join(base, 'en/texts_en.properties'),
        fr: path.join(base, 'fr/texts_fr.properties'),
        pt: path.join(base, 'pt/texts_pt.properties'),
    };
    const empty = () => ({ titles: new Map<number, string>(), descs: new Map<number, string>() });
    const result = {
        es: empty(),
        en: empty(),
        fr: empty(),
        pt: empty(),
    };
    for (const lang of Object.keys(files) as LangCode[]) {
        const filePath = files[lang];
        if (!fs.existsSync(filePath)) continue;
        const text = fs.readFileSync(filePath, 'utf-8');
        for (const line of text.split(/\r?\n/)) {
            if (!line || line.startsWith('#')) continue;
            const eq = line.indexOf('=');
            if (eq <= 0) continue;
            const key = line.slice(0, eq);
            const raw = line.slice(eq + 1);
            const titleM = key.match(/^content\.15\.(\d+)$/);
            const descM = key.match(/^content\.16\.(\d+)$/);
            if (titleM) result[lang].titles.set(Number(titleM[1]), decodeI18nLine(raw));
            if (descM) result[lang].descs.set(Number(descM[1]), decodeI18nLine(raw));
        }
    }
    sublimationI18nCache = result;
    return result;
}

function localeSublimationTitle(shardId: number, fallbackTitle: string): LocaleText {
    const i18n = loadSublimationI18n();
    return {
        es: i18n.es.titles.get(shardId) || fallbackTitle,
        en: i18n.en.titles.get(shardId) || fallbackTitle,
        fr: i18n.fr.titles.get(shardId) || fallbackTitle,
        pt: i18n.pt.titles.get(shardId) || fallbackTitle,
    };
}

const EMPTY_SUBLIMATION_DESCRIPTION: LocaleText = { es: '', en: '', fr: '', pt: '' };

/** id_stats Ankama 986 en shards: % de PdV máx., no puntos de vida planos. */
const SUBLIMATION_MAX_HP_PERCENT_STAT_ID = 986;
/** En shards.txt, placeholder genérico para filas cuyo stat real se deduce del texto (p. ej. «todos los dominios: % del nivel»). */
const SHARD_EFFECT_PLACEHOLDER_ID_STATS = 999;
/**
 * Dominio elemental global (120): el resumen «Dominio» del builder suma 120+122–125, no 126.
 * Bonos «todos los dominios / toutes les maîtrises» en % del nivel deben ir aquí.
 */
const SUBLIMATION_ALL_ELEMENTAL_MASTERY_PERCENT_ACTION = 120;

function maxHpPercentSublimationLabel(totalPercent: number): LocaleText {
    const v = Math.round(totalPercent);
    const sign = v >= 0 ? '+' : '';
    return {
        es: `${sign}${v}% PdV máx.`,
        en: `${sign}${v}% max HP`,
        fr: `${sign}${v}% PV max.`,
        pt: `${sign}${v}% PV máx.`,
    };
}

const ACTION_LABELS = new Map<number, LocaleText>([
    [20, { es: 'PdV', en: 'HP', fr: 'PV', pt: 'PV' }],
    [26, { es: 'Dominio cura', en: 'Healing Mastery', fr: 'Maitrise soin', pt: 'Dominio cura' }],
    [31, { es: 'PA', en: 'AP', fr: 'PA', pt: 'PA' }],
    [41, { es: 'PM', en: 'MP', fr: 'PM', pt: 'PM' }],
    [80, { es: 'Resistencia elemental', en: 'Elemental Resistance', fr: 'Resistance elementaire', pt: 'Resistencia elemental' }],
    [82, { es: 'Resistencia fuego', en: 'Fire Resistance', fr: 'Resistance feu', pt: 'Resistencia fogo' }],
    [83, { es: 'Resistencia agua', en: 'Water Resistance', fr: 'Resistance eau', pt: 'Resistencia agua' }],
    [84, { es: 'Resistencia tierra', en: 'Earth Resistance', fr: 'Resistance terre', pt: 'Resistencia terra' }],
    [85, { es: 'Resistencia aire', en: 'Air Resistance', fr: 'Resistance air', pt: 'Resistencia ar' }],
    [120, { es: 'Dominio elemental', en: 'Elemental Mastery', fr: 'Maitrise elementaire', pt: 'Dominio elemental' }],
    [149, { es: 'Dominio critico', en: 'Critical Mastery', fr: 'Maitrise critique', pt: 'Dominio critico' }],
    [150, { es: 'Golpe critico', en: 'Critical Hit', fr: 'Coup critique', pt: 'Golpe critico' }],
    [171, { es: 'Iniciativa', en: 'Initiative', fr: 'Initiative', pt: 'Iniciativa' }],
    [173, { es: 'Placaje', en: 'Lock', fr: 'Tacle', pt: 'Bloqueio' }],
    [175, { es: 'Esquiva', en: 'Dodge', fr: 'Esquive', pt: 'Esquiva' }],
    [180, { es: 'Dominio espalda', en: 'Rear Mastery', fr: 'Maitrise dos', pt: 'Dominio de costas' }],
    [191, { es: 'PW', en: 'WP', fr: 'PW', pt: 'PW' }],
    [304, { es: 'Control', en: 'Control', fr: 'Controle', pt: 'Controle' }],
    [875, { es: 'Anticipacion', en: 'Block', fr: 'Parade', pt: 'Parada' }],
    [988, { es: 'Resistencia critica', en: 'Critical Resistance', fr: 'Resistance critique', pt: 'Resistencia critica' }],
    [1052, { es: 'Dominio melee', en: 'Melee Mastery', fr: 'Maitrise melee', pt: 'Dominio corpo a corpo' }],
    [1053, { es: 'Dominio distancia', en: 'Distance Mastery', fr: 'Maitrise distance', pt: 'Dominio distancia' }],
    [1055, { es: 'Dominio berserker', en: 'Berserk Mastery', fr: 'Maitrise berserk', pt: 'Dominio berserker' }],
    [126, { es: 'Daños infligidos', en: 'Damage Inflicted', fr: 'Degats infliges', pt: 'Danos infligidos' }],
]);

const SYNTHETIC_ACTION_IDS = {
    indirectDamage: 900001,
} as const;

ACTION_LABELS.set(SYNTHETIC_ACTION_IDS.indirectDamage, {
    es: 'Daños indirectos',
    en: 'Indirect Damage',
    fr: 'Degats indirects',
    pt: 'Danos indiretos',
});

const STATE_EFFECT_OVERRIDES = new Map<number, {
    actionId?: number;
    label: LocaleText;
    valuePerStackLevel?: number;
    unit?: '%' | '';
    buildText?: (stackLevel: number, maxStackLevel?: number) => LocaleText;
}>([
    [
        5980,
        {
            actionId: SYNTHETIC_ACTION_IDS.indirectDamage,
            label: {
                es: 'Daños indirectos',
                en: 'Indirect Damage',
                fr: 'Degats indirects',
                pt: 'Danos indiretos',
            },
            valuePerStackLevel: 3,
            unit: '%',
        },
    ],
    [
        8386,
        {
            label: {
                es: 'Voluntad directa',
                en: 'Direct Force of Will',
                fr: 'Volonte directe',
                pt: 'Vontade direta',
            },
            buildText: (stackLevel, maxStackLevel) => ({
                es: `Fuera de tu turno: -${stackLevel * 4} Voluntad. Durante tu turno: +${stackLevel * 3} Voluntad${maxStackLevel ? ` (max. niv. ${maxStackLevel})` : ''}`,
                en: `Outside your turn: -${stackLevel * 4} Force of Will. During your turn: +${stackLevel * 3} Force of Will${maxStackLevel ? ` (max. lvl. ${maxStackLevel})` : ''}`,
                fr: `Hors de votre tour : -${stackLevel * 4} Volonte. Pendant votre tour : +${stackLevel * 3} Volonte${maxStackLevel ? ` (max. niv. ${maxStackLevel})` : ''}`,
                pt: `Fora do seu turno: -${stackLevel * 4} Vontade. Durante seu turno: +${stackLevel * 3} Vontade${maxStackLevel ? ` (max. niv. ${maxStackLevel})` : ''}`,
            }),
        },
    ],
    [
        8387,
        {
            label: {
                es: 'Voluntad indirecta',
                en: 'Indirect Force of Will',
                fr: 'Volonte indirecte',
                pt: 'Vontade indireta',
            },
            buildText: (stackLevel, maxStackLevel) => ({
                es: `Fuera de tu turno: +${stackLevel * 3} Voluntad. Durante tu turno: -${stackLevel * 4} Voluntad${maxStackLevel ? ` (max. niv. ${maxStackLevel})` : ''}`,
                en: `Outside your turn: +${stackLevel * 3} Force of Will. During your turn: -${stackLevel * 4} Force of Will${maxStackLevel ? ` (max. lvl. ${maxStackLevel})` : ''}`,
                fr: `Hors de votre tour : +${stackLevel * 3} Volonte. Pendant votre tour : -${stackLevel * 4} Volonte${maxStackLevel ? ` (max. niv. ${maxStackLevel})` : ''}`,
                pt: `Fora do seu turno: +${stackLevel * 3} Vontade. Durante seu turno: -${stackLevel * 4} Vontade${maxStackLevel ? ` (max. niv. ${maxStackLevel})` : ''}`,
            }),
        },
    ],
    [
        8388,
        {
            label: {
                es: 'Acribia',
                en: 'Scrupulosity',
                fr: 'Acribie',
                pt: 'Acribia',
            },
            buildText: (stackLevel, maxStackLevel) => ({
                es: `${stackLevel * 2}% daños infligidos a objetivos a 5 casillas o mas${maxStackLevel ? ` (max. niv. ${maxStackLevel})` : ''}`,
                en: `${stackLevel * 2}% damage inflicted on targets 5 cells or farther${maxStackLevel ? ` (max. lvl. ${maxStackLevel})` : ''}`,
                fr: `${stackLevel * 2}% degats infliges sur des cibles a 5 cases ou plus${maxStackLevel ? ` (max. niv. ${maxStackLevel})` : ''}`,
                pt: `${stackLevel * 2}% danos infligidos em alvos a 5 celulas ou mais${maxStackLevel ? ` (max. niv. ${maxStackLevel})` : ''}`,
            }),
        },
    ],
    [
        8132,
        {
            label: {
                es: 'Adrezo',
                en: 'Embellishment',
                fr: 'Appret',
                pt: 'Preparo',
            },
            buildText: (stackLevel, maxStackLevel) => ({
                es: `Al final del turno, por cada enemigo en melé: +${stackLevel}% daños infligidos en el siguiente turno${maxStackLevel ? ` (max. niv. ${maxStackLevel})` : ''}`,
                en: `At end of turn, per enemy in close combat: +${stackLevel}% damage inflicted for the following turn${maxStackLevel ? ` (max. lvl. ${maxStackLevel})` : ''}`,
                fr: `En fin de tour, par ennemi au corps a corps : +${stackLevel}% degats infliges au tour suivant${maxStackLevel ? ` (max. niv. ${maxStackLevel})` : ''}`,
                pt: `No fim do turno, por inimigo em corpo a corpo: +${stackLevel}% danos infligidos no turno seguinte${maxStackLevel ? ` (max. niv. ${maxStackLevel})` : ''}`,
            }),
        },
    ],
    [
        9060,
        {
            label: {
                es: 'Adrezo secundario',
                en: 'Secondary Embellishment',
                fr: 'Appret secondaire',
                pt: 'Preparo secundario',
            },
            buildText: (stackLevel, maxStackLevel) => ({
                es: `Al final del turno, si hay un enemigo adyacente: +${stackLevel * 2}% daños infligidos en el siguiente turno${maxStackLevel ? ` (max. niv. ${maxStackLevel})` : ''}`,
                en: `At end of turn, if an enemy is adjacent: +${stackLevel * 2}% damage inflicted for the following turn${maxStackLevel ? ` (max. lvl. ${maxStackLevel})` : ''}`,
                fr: `En fin de tour, si un ennemi est adjacent : +${stackLevel * 2}% degats infliges au tour suivant${maxStackLevel ? ` (max. niv. ${maxStackLevel})` : ''}`,
                pt: `No fim do turno, se houver inimigo adjacente: +${stackLevel * 2}% danos infligidos no turno seguinte${maxStackLevel ? ` (max. niv. ${maxStackLevel})` : ''}`,
            }),
        },
    ],
]);

let statesLabelMap: Map<number, LocaleText> | null = null;

interface ShardsTxtRoot {
    shards?: ShardsTxtEntry[];
    sublimations?: ShardsTxtEntry[];
    special_sublimations?: ShardsTxtEntry[];
}

interface ShardsTxtEntry {
    id_shard: number;
    is_epic: number | null;
    is_relic: number | null;
    gfx_id?: string | null;
    id_color?: number | null;
    name_shard: string;
    max_usage?: number | null;
    level?: number | null;
    parent_id?: number | null;
    effects?: ShardsTxtEffect[];
    children?: ShardsTxtEntry[];
    colors_needed?: Array<{ id_color: number }>;
}

interface ShardsTxtEffect {
    name_effect: string;
    values?: ShardsTxtValue[];
    inner_states?: Array<{ id_state?: number; name_state?: string }>;
}

interface ShardsTxtValue {
    damage?: number | null;
    ratio?: number | null;
    id_stats?: number | null;
    statistics?: {
        id_stats?: number | null;
        name_stats?: string | null;
        is_negative?: number | null;
        parent_statistic_id?: number | null;
    } | null;
}

function sanitizeLocaleText(text: LocaleText | undefined): LocaleText {
    const strip = (v?: string) =>
        (v || '')
            .replace(/\{[^{}]*:([^{}]*)\}/g, '$1')
            .replace(/\{[^{}]*\}/g, '')
            .replace(/\[[^\]]+\]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    return {
        es: strip(text?.es),
        en: strip(text?.en),
        fr: strip(text?.fr),
        pt: strip(text?.pt),
    };
}

function hasLocaleText(text: LocaleText | undefined) {
    return Boolean(text?.es || text?.en || text?.fr || text?.pt);
}

function loadItemsPath(): string {
    const itemsPathGamedata = path.join(__dirname, '../../data/wakfu-gamedata/items.json');
    const itemsPathLegacy = path.join(__dirname, '../../data/items.json');
    return fs.existsSync(itemsPathGamedata) ? itemsPathGamedata : itemsPathLegacy;
}

function loadShardsTxt() {
    if (shardsTxtCache) return shardsTxtCache;
    const shardsPath = path.join(__dirname, '../../data/wakfu-gamedata/shards.txt');
    if (!fs.existsSync(shardsPath)) return null;
    shardsTxtCache = JSON.parse(fs.readFileSync(shardsPath, 'utf-8')) as ShardsTxtRoot;
    return shardsTxtCache;
}

function loadStatesMap() {
    if (statesLabelMap) return statesLabelMap;
    const statesPath = path.join(__dirname, '../../data/wakfu-gamedata/states.json');
    const raw = JSON.parse(fs.readFileSync(statesPath, 'utf-8')) as Array<{ definition?: { id?: number }; title?: LocaleText }>;
    statesLabelMap = new Map(
        raw
            .map((entry) => [Number(entry.definition?.id || 0), sanitizeLocaleText(entry.title)] as const)
            .filter(([id]) => id > 0),
    );
    return statesLabelMap;
}

function extractEffectValue(params: number[] | undefined): number {
    if (!Array.isArray(params) || params.length === 0) return 0;
    const direct = Number(params[0]);
    if (Number.isFinite(direct) && direct !== 0) return direct;
    const scaled = Number(params[1]);
    return Number.isFinite(scaled) ? scaled : 0;
}

function extractMaxStackLevel(description: LocaleText | undefined) {
    const text = [
        description?.es,
        description?.en,
        description?.fr,
        description?.pt,
    ].find(Boolean) || '';
    const match = text.match(/\b(?:nivel|level|niveau)\D{0,12}(\d+)\b/i);
    return match ? Number(match[1]) : undefined;
}

function buildStateStackText(stateLabel: LocaleText, stackLevel: number, maxStackLevel?: number): LocaleText {
    const nameEs = stateLabel.es || stateLabel.en || 'Estado';
    const nameEn = stateLabel.en || stateLabel.es || 'State';
    const nameFr = stateLabel.fr || stateLabel.en || 'Etat';
    const namePt = stateLabel.pt || stateLabel.en || 'Estado';
    const maxSuffixEs = maxStackLevel ? ` (max. niv. ${maxStackLevel})` : '';
    const maxSuffixEn = maxStackLevel ? ` (max. lvl. ${maxStackLevel})` : '';
    const maxSuffixFr = maxStackLevel ? ` (max. niv. ${maxStackLevel})` : '';
    const maxSuffixPt = maxStackLevel ? ` (max. niv. ${maxStackLevel})` : '';
    return {
        es: `${nameEs} +${stackLevel} niv.${maxSuffixEs}`,
        en: `${nameEn} +${stackLevel} lvl.${maxSuffixEn}`,
        fr: `${nameFr} +${stackLevel} niv.${maxSuffixFr}`,
        pt: `${namePt} +${stackLevel} niv.${maxSuffixPt}`,
    };
}

function stripHtmlTags(value: string) {
    return value.replace(/<[^>]+>/g, '');
}

function normalizeEffectText(
    template: string,
    values: ShardsTxtValue[],
    innerStates: Array<{ id_state?: number; name_state?: string }> = [],
    /** Nivel de la variante de sublimación (I=1, II=2, III=3) para escalar [#1] en la plantilla. */
    templateLevel: number = 1,
) {
    const level = Math.max(1, templateLevel);
    let text = stripHtmlTags(template)
        .replace(/\\n/g, ' · ')
        .replace(/\r?\n/g, ' · ')
        .replace(/\[pl\]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    values.forEach((value, index) => {
        const amount = Number(value.ratio || value.damage || 0);
        const scaled = amount * level * (value.statistics?.is_negative ? -1 : 1);
        const token = new RegExp(`\\[#${index + 1}\\]`, 'g');
        text = text.replace(token, `${Number.isFinite(scaled) ? scaled : 0}`);
    });

    text = text.replace(/\[#charac [^\]]+\]\s*/g, '');
    text = text.replace(/\[st(\d+)\]/g, (_, stateIdText) => {
        const stateId = Number(stateIdText);
        const inner = innerStates.find((entry) => Number(entry.id_state) === stateId);
        return inner?.name_state || `Estado ${stateId}`;
    });

    return text
        .replace(/\s*·\s*·+\s*/g, ' · ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Antes se usaba para no contar bonus con condiciones en el builder; ahora los stats
 * con un solo valor numérico siempre se suman (se asume condición cumplida para planificar).
 * Se conserva la función solo por si hace falta distinguir etiquetas cortas en el futuro.
 */
function isDirectStatEffect(text: string, values: ShardsTxtValue[]) {
    if (values.length !== 1) return false;
    const normalized = text.toLowerCase();
    const conditionalHints = [
        'al ',
        'si ',
        'cuando ',
        'despues',
        'después',
        'durante ',
        'fuera del turno',
        'cada ',
        'convierte',
        'reduce',
        'aplica',
        'en el inicio',
        'en el lanzamiento',
        'más del ',
        'mas del ',
        'superior al ',
        'inferior al ',
        'porcentaje de vida',
        'points de vie',
        'life points',
        'at the start',
        'beginning of combat',
        'if ',
        'when ',
    ];
    return !conditionalHints.some((hint) => normalized.includes(hint));
}

function buildDirectLabel(text: string) {
    return text
        .replace(/^[+-]?\d+(?:\.\d+)?%?\s*(de\s+)?/i, '')
        .replace(/^[+-]?\d+(?:\.\d+)?\s+/i, '')
        .trim()
        .replace(/^\p{Ll}/u, (match) => match.toUpperCase());
}

function buildLocaleTextFromEs(es: string): LocaleText {
    return { es, en: es, fr: es, pt: es };
}

function getScaledNumericValue(value: ShardsTxtValue, level: number) {
    const amount = Number(value.ratio ?? value.damage ?? 0);
    const scaled = amount * level;
    const isNegative = Boolean(value.statistics?.is_negative);
    if (isNegative) return -Math.abs(scaled);
    return scaled;
}

/**
 * Ankama usa id_stats=999 en filas donde el valor es real pero el stat se infiere de la plantilla.
 */
function inferBuilderActionIdFromShardPlaceholder(nameEffectRaw: string, value: ShardsTxtValue): number | null {
    if (Number(value.id_stats) !== SHARD_EFFECT_PLACEHOLDER_ID_STATS) return null;
    const raw = stripHtmlTags(nameEffectRaw).replace(/\\n/g, ' ');
    const t = raw.toLowerCase().replace(/\s+/g, ' ');

    const levelPercentContext =
        /%.*\b(nivel|niveau|level)\b/i.test(t) || /\bdel nivel\b/i.test(t) || /\bdu niveau\b/i.test(t);

    // Estragos, etc.: «Todos los dominios: X% del nivel» → cliente reparte el valor plano (nivel×%) en elementales + dominios secundarios.
    // Excluir plantillas solo de maestría elemental / «elemental mastery».
    const elementalMasteryOnly =
        /\bma[iî]tris(es)?\s+[eé]l[eé]mentaires?\b/i.test(t) ||
        /\bdominio elemental\b/i.test(t) ||
        /\belemental mastery\b/i.test(t);
    const wideAllDominiosPhrase =
        /\btodos los dominios\b/i.test(t) ||
        /\ball masteries\b/i.test(t) ||
        /\btous les domaines\b/i.test(t) ||
        (/\btoutes les ma[iî]tris(es)?\b/i.test(t) && !/\bma[iî]tris(es)?\s+[eé]l[eé]mentaires?\b/i.test(t));
    if (!elementalMasteryOnly && wideAllDominiosPhrase && levelPercentContext) {
        return SUBLIMATION_ALL_ELEMENTAL_MASTERY_PERCENT_ACTION;
    }

    // Plantilla explícita de daño final infligido (p. ej. ciertas sublis con #charac FINAL_DMG).
    if (
        /#charac\s+final_dmg|#charac\s+dmg_in_percent/i.test(nameEffectRaw.toLowerCase()) &&
        levelPercentContext
    ) {
        return 126;
    }

    // Ruina: «X% de daños indirectos» (sin «recibidos»)
    if (/daños indirectos|degats indirects|indirect damage/i.test(t) && !/recibidos|subis|reçus|received/i.test(t)) {
        return SYNTHETIC_ACTION_IDS.indirectDamage;
    }

    // Determinación: daños indirectos recibidos (típicamente negativo por ratio)
    if (/daños indirectos|degats indirects|indirect damage/i.test(t) && /recibidos|subis|reçus|received/i.test(t)) {
        return SYNTHETIC_ACTION_IDS.indirectDamage;
    }

    // Escapatoria lenta, etc.: % anticipación por turno
    if (/%?\s*anticipaci|parada por turno|%?\s*block|parade.*tour/i.test(t)) {
        return 875;
    }

    return null;
}

function resolveOneShardEffectRow(params: {
    value: ShardsTxtValue;
    nameEffectRaw: string;
    textEs: string;
    variantLevel: number;
    rootEntry: ShardsTxtEntry;
    effectIndex: number;
    valueIndex: number;
}): EffectSummary | null {
    const { value, nameEffectRaw, textEs, variantLevel, rootEntry, effectIndex, valueIndex } = params;

    let statActionId = Number(
        value.statistics?.parent_statistic_id
        || value.statistics?.id_stats
        || value.id_stats
        || 0,
    );

    if (statActionId === SHARD_EFFECT_PLACEHOLDER_ID_STATS) {
        const inferred = inferBuilderActionIdFromShardPlaceholder(nameEffectRaw, value);
        if (!inferred) return null;
        if (inferred === SUBLIMATION_ALL_ELEMENTAL_MASTERY_PERCENT_ACTION) {
            const tierPercent = Number(value.ratio ?? 0) * variantLevel;
            if (!Number.isFinite(tierPercent) || tierPercent === 0) return null;
            const label: LocaleText = {
                es: 'Todos los dominios',
                en: 'All masteries',
                fr: 'Toutes les maitrises',
                pt: 'Todos os dominios',
            };
            return {
                actionId: SUBLIMATION_ALL_ELEMENTAL_MASTERY_PERCENT_ACTION,
                value: 0,
                percentOfBuildLevel: tierPercent,
                applyToAllMasteries: true,
                label,
                text: buildLocaleTextFromEs(textEs),
                unit: '%',
            };
        }
        statActionId = inferred;
    }

    if (!statActionId) return null;

    const totalValue = getScaledNumericValue(value, variantLevel);
    if (!Number.isFinite(totalValue) || (totalValue === 0 && statActionId !== SUBLIMATION_MAX_HP_PERCENT_STAT_ID)) {
        return null;
    }

    const label =
        statActionId === SUBLIMATION_MAX_HP_PERCENT_STAT_ID
            ? maxHpPercentSublimationLabel(totalValue)
            : (ACTION_LABELS.get(statActionId) || buildLocaleTextFromEs(buildDirectLabel(textEs)));

    return {
        actionId: statActionId || (9700000 + rootEntry.id_shard * 10 + effectIndex + valueIndex),
        value: totalValue,
        label,
        text: buildLocaleTextFromEs(textEs),
        unit: textEs.includes('%') ? '%' : '',
    };
}

function buildShardsTxtEffects(entry: ShardsTxtEntry, rootEntry: ShardsTxtEntry): EffectSummary[] {
    const variantLevel = Math.max(1, Number(entry.level || rootEntry.level || 1));

    return (entry.effects || rootEntry.effects || []).flatMap((effect, effectIndex) => {
        const values = effect.values || [];
        const textEs = normalizeEffectText(effect.name_effect, values, effect.inner_states || [], variantLevel);
        const direct = isDirectStatEffect(textEs, values);

        const summaries: EffectSummary[] = [];
        for (let valueIndex = 0; valueIndex < values.length; valueIndex += 1) {
            const row = resolveOneShardEffectRow({
                value: values[valueIndex],
                nameEffectRaw: effect.name_effect,
                textEs,
                variantLevel,
                rootEntry,
                effectIndex,
                valueIndex,
            });
            if (row) summaries.push(row);
        }

        if (summaries.length > 0) return summaries;

        return [
            {
                actionId: 0,
                value: 0,
                label: buildLocaleTextFromEs(direct ? buildDirectLabel(textEs) : textEs),
                text: buildLocaleTextFromEs(textEs),
            },
        ];
    });
}

function buildSublimationsFromShardsTxt(): EnchantmentSublimationEntry[] {
    const shardsTxt = loadShardsTxt();
    if (!shardsTxt) return [];

    const baseEntries = [...(shardsTxt.sublimations || []), ...(shardsTxt.special_sublimations || [])];
    const entries: EnchantmentSublimationEntry[] = [];

    for (const rootEntry of baseEntries) {
        const variants = [rootEntry, ...(rootEntry.children || []).map((child) => ({ ...child, effects: rootEntry.effects || child.effects }))];
        for (const variant of variants) {
            const rawEffects = buildShardsTxtEffects(variant, rootEntry).filter(
                (effect) => effect.text || effect.value || (effect.percentOfBuildLevel != null && effect.percentOfBuildLevel !== 0),
            );
            const title = localeSublimationTitle(variant.id_shard, variant.name_shard);
            entries.push({
                id: variant.id_shard,
                title,
                description: EMPTY_SUBLIMATION_DESCRIPTION,
                slotColorPattern: (rootEntry.colors_needed || variant.colors_needed || []).map((color) => Number(color.id_color || 0)).filter((color) => color > 0),
                isEpic: Boolean(variant.is_epic),
                isRelic: Boolean(variant.is_relic),
                gfxId: Number(variant.gfx_id || 0) || null,
                effects: rawEffects,
            });
        }
    }

    return entries;
}

function buildEffectSummaries(
    effects: Array<{ effect?: { definition?: { actionId?: number; params?: number[] } } }> | undefined,
    itemDescription?: LocaleText,
): EffectSummary[] {
    if (!Array.isArray(effects)) return [];
    const statesMap = loadStatesMap();
    const maxStackLevel = extractMaxStackLevel(itemDescription);
    const summaries: Array<EffectSummary | null> = effects
        .map((entry) => {
            const actionId = Number(entry.effect?.definition?.actionId || 0);
            const params = entry.effect?.definition?.params;

            if (actionId === 304 && Array.isArray(params) && Number(params[0]) > 999) {
                const stateId = Number(params[0]);
                const stateLabel = statesMap.get(stateId);
                const stackLevel = Number(params[2] || 0);
                const override = STATE_EFFECT_OVERRIDES.get(stateId);

                if (override && stackLevel > 0) {
                    const value = override.valuePerStackLevel ? override.valuePerStackLevel * stackLevel : 0;
                    const totalMaxValue = maxStackLevel && override.valuePerStackLevel ? override.valuePerStackLevel * maxStackLevel : undefined;
                    const overrideText = override.buildText?.(stackLevel, maxStackLevel);
                    const valueText = `+${value}${override.unit || ''} ${override.label.es || override.label.en || 'Efecto'}`;
                    const maxText = totalMaxValue ? ` (max. ${totalMaxValue}${override.unit || ''})` : '';
                    return {
                        actionId: override.actionId || 304,
                        value,
                        label: override.label,
                        text: overrideText || {
                            es: `${valueText}${maxText}`,
                            en: `+${value}${override.unit || ''} ${override.label.en || override.label.es || 'Effect'}${totalMaxValue ? ` (max. ${totalMaxValue}${override.unit || ''})` : ''}`,
                            fr: `+${value}${override.unit || ''} ${override.label.fr || override.label.en || 'Effet'}${totalMaxValue ? ` (max. ${totalMaxValue}${override.unit || ''})` : ''}`,
                            pt: `+${value}${override.unit || ''} ${override.label.pt || override.label.en || 'Efeito'}${totalMaxValue ? ` (max. ${totalMaxValue}${override.unit || ''})` : ''}`,
                        },
                        stateId,
                        stackLevel,
                        maxStackLevel,
                        valuePerStackLevel: override.valuePerStackLevel,
                        maxValue: totalMaxValue,
                        unit: override.unit,
                    };
                }

                const stateText = stateLabel
                    ? buildStateStackText(stateLabel, stackLevel || 0, maxStackLevel)
                    : undefined;
                return {
                    actionId,
                    value: 0,
                    label: stateLabel || { es: `Estado ${stateId}`, en: `State ${stateId}`, fr: `Etat ${stateId}`, pt: `Estado ${stateId}` },
                    text: stateText,
                    stateId,
                    stackLevel: stackLevel || undefined,
                    maxStackLevel,
                };
            }

            const value = extractEffectValue(entry.effect?.definition?.params);
            if (!actionId || !value) return null;
            return {
                actionId,
                value,
                label: ACTION_LABELS.get(actionId) || { es: `Stat ${actionId}`, en: `Stat ${actionId}`, fr: `Stat ${actionId}`, pt: `Stat ${actionId}` },
            };
        });
    return summaries.filter((entry): entry is EffectSummary => entry !== null);
}

/** Misma convención que el cliente: índice en hoja de equipo Ankama. */
export const EQUIPMENT_POSITION_INDEX_LABELS = [
    'HEAD',
    'NECK',
    'BACK',
    'CHEST',
    'SHOULDERS',
    'BELT',
    'LEGS',
    'LEFT_HAND',
    'RIGHT_HAND',
    'FIRST_WEAPON',
    'SECOND_WEAPON',
    'ACCESSORY',
    'PET',
    'COSTUME',
] as const;

export function getEnchantmentCatalog(): EnchantmentCatalogResponse {
    if (cached) {
        return cached;
    }

    const itemsRaw = JSON.parse(fs.readFileSync(loadItemsPath(), 'utf-8')) as Array<{
        definition?: {
            item?: {
                id?: number;
                baseParameters?: { itemTypeId?: number };
                shardsParameters?: {
                    color?: number;
                    doubleBonusPosition?: number[];
                    shardLevelingCurve?: number[];
                    shardLevelRequirement?: number[];
                };
                sublimationParameters?: {
                    slotColorPattern?: number[];
                    isEpic?: boolean;
                    isRelic?: boolean;
                };
                graphicParameters?: {
                    gfxId?: number;
                };
            };
            equipEffects?: Array<{
                effect?: {
                    definition?: {
                        actionId?: number;
                        params?: number[];
                    };
                };
            }>;
        };
        title?: LocaleText;
        description?: LocaleText;
    }>;

    const shards: EnchantmentShardEntry[] = [];
    const fallbackSublimations: EnchantmentSublimationEntry[] = [];
    const sublimationDescriptionsById = new Map<number, LocaleText>();

    for (const row of itemsRaw) {
        const item = row.definition?.item;
        if (!item?.id) continue;

        const sp = item.shardsParameters;
        if (sp && typeof sp.color === 'number') {
            const primaryEffect = row.definition?.equipEffects?.find((effectRow) => {
                const actionId = Number(effectRow.effect?.definition?.actionId);
                const baseValue = Number(effectRow.effect?.definition?.params?.[0]);
                return Number.isFinite(actionId) && Number.isFinite(baseValue) && baseValue > 0;
            });
            const actionId = Number(primaryEffect?.effect?.definition?.actionId || 0);
            const statPerLevel = Number(primaryEffect?.effect?.definition?.params?.[0] || 0);

            shards.push({
                id: item.id,
                color: sp.color,
                title: sanitizeLocaleText(row.title),
                actionId,
                statPerLevel,
                shardLevelingCurve: Array.isArray(sp.shardLevelingCurve) ? sp.shardLevelingCurve : [],
                shardLevelRequirement: Array.isArray(sp.shardLevelRequirement) ? sp.shardLevelRequirement : [],
                doubleBonusPositionIndices: Array.isArray(sp.doubleBonusPosition) ? sp.doubleBonusPosition : [],
            });
        }

        const sub = item.sublimationParameters;
        if (sub && ((Array.isArray(sub.slotColorPattern) && sub.slotColorPattern.length > 0) || sub.isEpic || sub.isRelic)) {
            const description = sanitizeLocaleText(row.description);
            if (hasLocaleText(description)) {
                sublimationDescriptionsById.set(item.id, description);
            }
            fallbackSublimations.push({
                id: item.id,
                title: sanitizeLocaleText(row.title),
                description,
                slotColorPattern: Array.isArray(sub.slotColorPattern) ? sub.slotColorPattern : [],
                isEpic: Boolean(sub.isEpic),
                isRelic: Boolean(sub.isRelic),
                gfxId: Number(item.graphicParameters?.gfxId || 0) || null,
                effects: buildEffectSummaries(row.definition?.equipEffects, row.description),
            });
        }
    }

    const sublimations = buildSublimationsFromShardsTxt();
    shards.sort((a, b) => a.id - b.id);
    const finalSublimations = (sublimations.length > 0 ? sublimations : fallbackSublimations)
        .map((entry) => ({
            ...entry,
            description: hasLocaleText(entry.description)
                ? entry.description
                : (sublimationDescriptionsById.get(entry.id) || entry.description),
        }))
        .sort((a, b) => a.id - b.id);

    cached = {
        equipmentPositionIndexLabels: [...EQUIPMENT_POSITION_INDEX_LABELS],
        shards,
        sublimations: finalSublimations,
    };
    return cached;
}

export function reloadEnchantmentCatalog() {
    cached = null;
    shardsTxtCache = null;
    statesLabelMap = null;
    sublimationI18nCache = null;
}
