import { Request, Response, Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEnchantmentCatalog, reloadEnchantmentCatalog } from '../lib/builder-enchantment-catalog.js';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type LocaleText = Record<string, string | undefined>;

interface ActionData {
    definition?: {
        id?: number;
        effect?: string;
    };
    description?: LocaleText;
}

interface EquipmentTypeData {
    definition?: {
        id?: number;
        equipmentPositions?: string[];
        equipmentDisabledPositions?: string[];
    };
    title?: LocaleText;
}

interface ItemEffectData {
    effect?: {
        definition?: {
            id?: number;
            actionId?: number;
            params?: number[];
        };
    };
    /** Texto específico del efecto en el ítem (API Wakfu); prioridad sobre la descripción genérica de la acción. */
    description?: LocaleText;
}

interface ItemData {
    definition?: {
        item?: {
            id?: number;
            level?: number;
            properties?: number[];
            baseParameters?: {
                itemTypeId?: number;
                rarity?: number;
                minimumShardSlotNumber?: number;
                maximumShardSlotNumber?: number;
            };
            graphicParameters?: {
                gfxId?: number;
            };
        };
        equipEffects?: ItemEffectData[];
    };
    title?: LocaleText;
    description?: LocaleText;
}

interface NormalizedBuilderStat {
    key: string;
    actionId: number;
    label: string;
    value: number;
    elementCount?: number;
}

interface NormalizedBuilderItem {
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
    stats: NormalizedBuilderStat[];
    searchText: string;
    isTwoHanded: boolean;
    equipmentRequirements?: EquipmentRequirement[];
}

interface EquipmentRequirement {
    type: 'PA' | 'PW' | 'Placaje' | 'Fuerza' | 'Inteligencia' | 'Agilidad' | 'Suerte' | 'Carisma' | 'Vida' | 'Nivel';
    value: number;
    description: string;
}

interface ClassData {
    id: number;
    names: LocaleText;
    assets?: {
        icon?: string;
        male?: {
            illustration?: string;
        };
        female?: {
            illustration?: string;
        };
    };
}

interface BuilderSlotDefinition {
    id: string;
    label: LocaleText;
    typeIds?: number[];
    includePosition?: string;
}

const SLOT_DEFINITIONS: BuilderSlotDefinition[] = [
    { id: 'amulet', label: { es: 'Amuleto', en: 'Amulet', fr: 'Amulette', pt: 'Amuleto' }, typeIds: [120] },
    { id: 'helmet', label: { es: 'Casco', en: 'Helmet', fr: 'Casque', pt: 'Capacete' }, typeIds: [134] },
    { id: 'cloak', label: { es: 'Capa', en: 'Cloak', fr: 'Cape', pt: 'Capa' }, typeIds: [132] },
    { id: 'breastplate', label: { es: 'Coraza', en: 'Breastplate', fr: 'Plastron', pt: 'Peitora' }, typeIds: [136] },
    { id: 'epaulettes', label: { es: 'Hombreras', en: 'Epaulettes', fr: 'Epaulettes', pt: 'Dragonas' }, typeIds: [138] },
    { id: 'belt', label: { es: 'Cinturon', en: 'Belt', fr: 'Ceinture', pt: 'Cinto' }, typeIds: [133] },
    { id: 'boots', label: { es: 'Botas', en: 'Boots', fr: 'Bottes', pt: 'Botas' }, typeIds: [119] },
    { id: 'ring_left', label: { es: 'Anillo I', en: 'Ring I', fr: 'Anneau I', pt: 'Anel I' }, typeIds: [103] },
    { id: 'ring_right', label: { es: 'Anillo II', en: 'Ring II', fr: 'Anneau II', pt: 'Anel II' }, typeIds: [103] },
    { id: 'main_hand', label: { es: 'Mano principal', en: 'Main hand', fr: 'Main principale', pt: 'Mao principal' }, includePosition: 'FIRST_WEAPON' },
    { id: 'off_hand', label: { es: 'Mano secundaria', en: 'Off hand', fr: 'Main secondaire', pt: 'Mao secundaria' }, includePosition: 'SECOND_WEAPON' },
    { id: 'accessory', label: { es: 'Accesorio', en: 'Accessory', fr: 'Accessoire', pt: 'Acessorio' }, includePosition: 'ACCESSORY' },
    { id: 'mount', label: { es: 'Montura', en: 'Mount', fr: 'Monture', pt: 'Montaria' }, typeIds: [611] },
    { id: 'pet', label: { es: 'Mascota', en: 'Pet', fr: 'Familier', pt: 'Mascote' }, includePosition: 'PET' },
    { id: 'costume', label: { es: 'Traje', en: 'Costume', fr: 'Costume', pt: 'Traje' }, includePosition: 'COSTUME' },
];

const NEGATIVE_ACTION_IDS = new Set([21, 40, 56, 57, 90, 96, 97, 98, 100, 130, 132, 161, 168, 172, 174, 176, 181, 192, 876, 1056, 1059, 1060, 1061, 1062, 1063]);
const NEGATIVE_ACTION_TARGETS = new Map<number, number>([
    [21, 20],
    [56, 31],
    [57, 41],
    [90, 80],
    [96, 84],
    [97, 82],
    [98, 83],
    [100, 80],
    [130, 120],
    [132, 122],
    [161, 160],
    [168, 150],
    [172, 171],
    [174, 173],
    [176, 175],
    [181, 180],
    [192, 191],
    [876, 875],
    [1056, 149],
    [1059, 1052],
    [1060, 1053],
    [1061, 1055],
    [1062, 988],
    [1063, 71],
]);

const ACTION_LABELS = new Map<number, LocaleText>([
    [20, { es: 'PdV', en: 'HP', fr: 'PV', pt: 'PV' }],
    [26, { es: 'Dominio cura', en: 'Healing Mastery', fr: 'Maitrise soin', pt: 'Dominio cura' }],
    [31, { es: 'PA', en: 'AP', fr: 'PA', pt: 'PA' }],
    [39, { es: 'Armadura recibida', en: 'Armor received', fr: 'Armure recue', pt: 'Armadura recebida' }],
    [40, { es: 'Armadura dada', en: 'Armor given', fr: 'Armure donnee', pt: 'Armadura concedida' }],
    [41, { es: 'PM', en: 'MP', fr: 'PM', pt: 'PM' }],
    [71, { es: 'Resistencia espalda', en: 'Rear Resistance', fr: 'Resistance dos', pt: 'Resistencia costas' }],
    [80, { es: 'Resistencia elemental', en: 'Elemental Resistance', fr: 'Resistance elementaire', pt: 'Resistencia elemental' }],
    [82, { es: 'Resistencia fuego', en: 'Fire Resistance', fr: 'Resistance feu', pt: 'Resistencia fogo' }],
    [83, { es: 'Resistencia agua', en: 'Water Resistance', fr: 'Resistance eau', pt: 'Resistencia agua' }],
    [84, { es: 'Resistencia tierra', en: 'Earth Resistance', fr: 'Resistance terre', pt: 'Resistencia terra' }],
    [85, { es: 'Resistencia aire', en: 'Air Resistance', fr: 'Resistance air', pt: 'Resistencia ar' }],
    [120, { es: 'Dominio elemental', en: 'Elemental Mastery', fr: 'Maitrise elementaire', pt: 'Dominio elemental' }],
    [122, { es: 'Dominio fuego', en: 'Fire Mastery', fr: 'Maitrise feu', pt: 'Dominio fogo' }],
    [123, { es: 'Dominio tierra', en: 'Earth Mastery', fr: 'Maitrise terre', pt: 'Dominio terra' }],
    [124, { es: 'Dominio agua', en: 'Water Mastery', fr: 'Maitrise eau', pt: 'Dominio agua' }],
    [125, { es: 'Dominio aire', en: 'Air Mastery', fr: 'Maitrise air', pt: 'Dominio ar' }],
    [149, { es: 'Dominio critico', en: 'Critical Mastery', fr: 'Maitrise critique', pt: 'Dominio critico' }],
    [150, { es: '% Golpe critico', en: 'Critical Hit %', fr: '% Coup critique', pt: '% Golpe critico' }],
    [160, { es: 'Alcance', en: 'Range', fr: 'Portee', pt: 'Alcance' }],
    [161, { es: 'Alcance', en: 'Range', fr: 'Portee', pt: 'Alcance' }],
    [162, { es: 'Prospeccion', en: 'Prospecting', fr: 'Prospection', pt: 'Prospeccao' }],
    [166, { es: 'Sabiduria', en: 'Wisdom', fr: 'Sagesse', pt: 'Sabedoria' }],
    [168, { es: '% Golpe critico', en: 'Critical Hit %', fr: '% Coup critique', pt: '% Golpe critico' }],
    [171, { es: 'Iniciativa', en: 'Initiative', fr: 'Initiative', pt: 'Iniciativa' }],
    [172, { es: 'Iniciativa', en: 'Initiative', fr: 'Initiative', pt: 'Iniciativa' }],
    [173, { es: 'Placaje', en: 'Lock', fr: 'Tacle', pt: 'Bloqueio' }],
    [174, { es: 'Placaje', en: 'Lock', fr: 'Tacle', pt: 'Bloqueio' }],
    [175, { es: 'Esquiva', en: 'Dodge', fr: 'Esquive', pt: 'Esquiva' }],
    [176, { es: 'Esquiva', en: 'Dodge', fr: 'Esquive', pt: 'Esquiva' }],
    [177, { es: 'Voluntad', en: 'Force of Will', fr: 'Volonte', pt: 'Vontade' }],
    [180, { es: 'Dominio espalda', en: 'Rear Mastery', fr: 'Maitrise dos', pt: 'Dominio de costas' }],
    [181, { es: 'Dominio espalda', en: 'Rear Mastery', fr: 'Maitrise dos', pt: 'Dominio de costas' }],
    [191, { es: 'PW', en: 'WP', fr: 'PW', pt: 'PW' }],
    [304, { es: 'Control', en: 'Control', fr: 'Controle', pt: 'Controle' }],
    [875, { es: 'Anticipacion', en: 'Block', fr: 'Parade', pt: 'Parada' }],
    [988, { es: 'Resistencia critica', en: 'Critical Resistance', fr: 'Resistance critique', pt: 'Resistencia critica' }],
    [1052, { es: 'Dominio melee', en: 'Melee Mastery', fr: 'Maitrise melee', pt: 'Dominio corpo a corpo' }],
    [1053, { es: 'Dominio distancia', en: 'Distance Mastery', fr: 'Maitrise distance', pt: 'Dominio distancia' }],
    [1055, { es: 'Dominio berserker', en: 'Berserk Mastery', fr: 'Maitrise berserk', pt: 'Dominio berserker' }],
    [1095, { es: 'Curas realizadas', en: 'Healing Performed', fr: 'Soins realises', pt: 'Curas realizadas' }],
    [45897, { es: 'Armadura', en: 'Armor', fr: 'Armure', pt: 'Armadura' }],
]);

const HIDDEN_STAT_FILTER_ACTION_IDS = new Set([82, 83, 84, 85, 122, 123, 124, 125]);

let builderItems: NormalizedBuilderItem[] = [];
let equipmentTypeMap = new Map<number, EquipmentTypeData>();
let actionMap = new Map<number, ActionData>();
let classesData: ClassData[] = [];
const TYPE_IDS_WITH_DIRECT_SLOTS = new Set(
    SLOT_DEFINITIONS.flatMap((entry) => entry.typeIds || []),
);

function sanitizeGrammarMarkers(value?: string) {
    if (!value) {
        return '';
    }

    return value
        .replace(/\{[^{}]*:([^{}]*)\}/g, '$1')
        .replace(/\{[^{}]*\}/g, '')
        .replace(/\[[^\]]+\]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function getLocalizedText(text: LocaleText | undefined): string {
    return sanitizeGrammarMarkers(text?.es || text?.en || text?.fr || text?.pt || '');
}

function sanitizeLocaleText(text: LocaleText | undefined): LocaleText {
    return {
        es: sanitizeGrammarMarkers(text?.es),
        en: sanitizeGrammarMarkers(text?.en),
        fr: sanitizeGrammarMarkers(text?.fr),
        pt: sanitizeGrammarMarkers(text?.pt),
    };
}

function mirrorLocaleText(value: string): LocaleText {
    return {
        es: value,
        en: value,
        fr: value,
        pt: value,
    };
}

function getBuilderStatKey(actionId: number, elementCount?: number) {
    if ((actionId === 1068 || actionId === 1069) && Number.isFinite(elementCount) && Number(elementCount) > 0) {
        return `action:${actionId}:${Number(elementCount)}`;
    }

    return `action:${actionId}`;
}

function buildElementCountLabel(actionId: number, elementCount: number): LocaleText {
    const plural = elementCount > 1;
    if (actionId === 1068) {
        return {
            es: `Dominio en ${elementCount} elemento${plural ? 's' : ''}`,
            en: `${elementCount}-element mastery`,
            fr: `Maitrise sur ${elementCount} element${plural ? 's' : ''}`,
            pt: `Dominio em ${elementCount} elemento${plural ? 's' : ''}`,
        };
    }

    return {
        es: `Resistencia en ${elementCount} elemento${plural ? 's' : ''}`,
        en: `${elementCount}-element resistance`,
        fr: `Resistance sur ${elementCount} element${plural ? 's' : ''}`,
        pt: `Resistencia em ${elementCount} elemento${plural ? 's' : ''}`,
    };
}

function buildStatOptionLabel(stat: NormalizedBuilderStat): LocaleText {
    if ((stat.actionId === 1068 || stat.actionId === 1069) && (stat.elementCount || 0) > 0) {
        return buildElementCountLabel(stat.actionId, stat.elementCount || 0);
    }

    const knownLabel = ACTION_LABELS.get(stat.actionId);
    if (knownLabel) {
        return sanitizeLocaleText(knownLabel);
    }

    const actionDescription = sanitizeLocaleText(actionMap.get(stat.actionId)?.description);
    if (Object.values(actionDescription).some(Boolean)) {
        return actionDescription;
    }

    return mirrorLocaleText(stat.label || `Action ${stat.actionId}`);
}

function parseEquipmentRequirements(description: LocaleText): EquipmentRequirement[] {
    const text = getLocalizedText(description);
    const requirements: EquipmentRequirement[] = [];
    
    // Patrones para requisitos numéricos
    const patterns = [
        // PA requirements
        { type: 'PA' as const, regex: /(?:requiere|necesita|exige|precisa)\s+(\d+)\s*(?:pa|puntos?\s*de\s*acci[oó]n?)/gi },
        { type: 'PA' as const, regex: /(\d+)\s*(?:pa|puntos?\s*de\s*acci[oó]n?)\s*(?:requiere|necesita|exige|precisa)/gi },
        { type: 'PA' as const, regex: /(?:pa|puntos?\s*de\s*acci[oó]n?)\s*(?:m[íi]nimo|minimo)?\s*:?\s*(\d+)/gi },
        
        // PW requirements
        { type: 'PW' as const, regex: /(?:requiere|necesita|exige|precisa)\s+(\d+)\s*(?:pw|puntos?\s*de\s*voluntad)/gi },
        { type: 'PW' as const, regex: /(\d+)\s*(?:pw|puntos?\s*de\s*voluntad)\s*(?:requiere|necesita|exige|precisa)/gi },
        { type: 'PW' as const, regex: /(?:pw|puntos?\s*de\s*voluntad)\s*(?:m[íi]nimo|minimo)?\s*:?\s*(\d+)/gi },
        
        // Placaje requirements
        { type: 'Placaje' as const, regex: /(?:requiere|necesita|exige|precisa)\s+(\d+)\s*(?:placaje|armadura)/gi },
        { type: 'Placaje' as const, regex: /(\d+)\s*(?:placaje|armadura)\s*(?:requiere|necesita|exige|precisa)/gi },
        { type: 'Placaje' as const, regex: /(?:placaje|armadura)\s*(?:m[íi]nimo|minimo)?\s*:?\s*(\d+)/gi },
        
        // Stat requirements
        { type: 'Fuerza' as const, regex: /(?:requiere|necesita|exige|precisa)\s+(\d+)\s*fuerza/gi },
        { type: 'Inteligencia' as const, regex: /(?:requiere|necesita|exige|precisa)\s+(\d+)\s*inteligencia/gi },
        { type: 'Agilidad' as const, regex: /(?:requiere|necesita|exige|precisa)\s+(\d+)\s*agilidad/gi },
        { type: 'Suerte' as const, regex: /(?:requiere|necesita|exige|precisa)\s+(\d+)\s*suerte/gi },
        { type: 'Carisma' as const, regex: /(?:requiere|necesita|exige|precisa)\s+(\d+)\s*carisma/gi },
        
        // HP/Vida requirements
        { type: 'Vida' as const, regex: /(?:requiere|necesita|exige|precisa)\s+(\d+)\s*(?:puntos?\s*de\s*vida|hp|vida)/gi },
        { type: 'Vida' as const, regex: /(\d+)\s*(?:puntos?\s*de\s*vida|hp|vida)\s*(?:requiere|necesita|exige|precisa)/gi },
        { type: 'Vida' as const, regex: /(?:puntos?\s*de\s*vida|hp|vida)\s*(?:m[íi]nimo|minimo)?\s*:?\s*(\d+)/gi },
        
        // Level requirements
        { type: 'Nivel' as const, regex: /(?:requiere|necesita|exige|precisa)\s+(?:nivel|level)\s+(\d+)/gi },
        { type: 'Nivel' as const, regex: /(?:nivel|level)\s+(?:m[íi]nimo|minimo)?\s*:?\s*(\d+)/gi }
    ];
    
    patterns.forEach(pattern => {
        const matches = text.match(pattern.regex);
        if (matches) {
            matches.forEach(match => {
                const numberMatch = match.match(/\d+/);
                if (numberMatch) {
                    requirements.push({
                        type: pattern.type,
                        value: parseInt(numberMatch[0]),
                        description: match.trim()
                    });
                }
            });
        }
    });
    
    return requirements;
}

function buildStatLabel(actionId: number) {
    const knownLabel = ACTION_LABELS.get(actionId);
    if (knownLabel) {
        return knownLabel;
    }

    const action = actionMap.get(actionId);
    return getLocalizedText(action?.description) || action?.definition?.effect || `Action ${actionId}`;
}

/**
 * Valor numérico del efecto de equipamiento.
 * Muchos ítems (p. ej. recuerdos) guardan 0 en params[0] y el coeficiente en params[1], escalado por el nivel del ítem.
 */
function extractEquipEffectValue(
    params: number[],
    itemLevel: number,
    options?: { scaleWithLevel?: boolean },
): number | null {
    const p0 = params.length > 0 ? Number(params[0]) : NaN;
    const p1 = params.length > 1 ? Number(params[1]) : NaN;
    const lvl = Number.isFinite(itemLevel) && itemLevel > 0 ? itemLevel : 0;

    if (options?.scaleWithLevel) {
        const hasBaseValue = Number.isFinite(p0);
        const hasGrowthValue = Number.isFinite(p1);
        if (hasBaseValue || hasGrowthValue) {
            const baseValue = hasBaseValue ? p0 : 0;
            const growthValue = hasGrowthValue ? p1 : 0;
            return baseValue + growthValue * lvl;
        }
    }

    if (Number.isFinite(p0) && Math.abs(p0) > 1e-9) {
        return p0;
    }
    if (Number.isFinite(p1) && Math.abs(p1) > 1e-9) {
        return lvl > 0 ? p1 * lvl : p1;
    }
    return null;
}

function getBuilderEffectiveItemLevel(item: ItemData) {
    const baseLevel = Number(item.definition?.item?.level || 0);
    const itemTypeId = Number(item.definition?.item?.baseParameters?.itemTypeId || 0);

    // En builder, mascotas y monturas se comparan al nivel maximo de crianza.
    if (itemTypeId === 582 || itemTypeId === 611) {
        return 50;
    }

    return baseLevel;
}

function cleanStatLabel(value: string) {
    return value
        .replace(/^[+\-−]\s*/, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeStat(
    effect: ItemEffectData,
    itemLevel: number,
    options?: { scaleWithLevel?: boolean },
): NormalizedBuilderStat | null {
    const def = effect.effect?.definition;
    const originalActionId = Number(def?.actionId);
    const params = def?.params || [];
    const actionId = NEGATIVE_ACTION_TARGETS.get(originalActionId) || originalActionId;

    if (!Number.isFinite(actionId) || params.length === 0) {
        return null;
    }

    const rawValue = extractEquipEffectValue(params, itemLevel, options);
    if (rawValue === null) {
        return null;
    }

    let elementCount = 0;
    if (actionId === 1068 || actionId === 1069) {
        elementCount = Number(params[2] || 0);
    }

    const customLabel = effect.description ? cleanStatLabel(sanitizeGrammarMarkers(getLocalizedText(effect.description))) : '';
    const rawLabel = buildStatLabel(actionId);
    let label = typeof rawLabel === 'string' ? cleanStatLabel(rawLabel) : cleanStatLabel(getLocalizedText(rawLabel) || `Action ${actionId}`);
    if (actionId === 1068 && elementCount > 0) {
        label = `Dominio en ${elementCount} elemento${elementCount > 1 ? 's' : ''}`;
    } else if (actionId === 1069 && elementCount > 0) {
        label = `Resistencia en ${elementCount} elemento${elementCount > 1 ? 's' : ''}`;
    } else if (!label) {
        label = customLabel || `Action ${actionId}`;
    }

    return {
        key: getBuilderStatKey(actionId, elementCount),
        actionId,
        label,
        value: rawValue * (NEGATIVE_ACTION_IDS.has(originalActionId) ? -1 : 1),
        elementCount: elementCount > 0 ? elementCount : undefined,
    };
}

function buildSearchText(item: {
    title: LocaleText;
    description: LocaleText;
    itemTypeName: LocaleText;
}) {
    return [
        item.title.es,
        item.title.en,
        item.title.fr,
        item.title.pt,
        item.description.es,
        item.itemTypeName.es,
        item.itemTypeName.en,
    ].join(' ').toLowerCase();
}

function loadBuilderData() {
    try {
        const itemsPathGamedata = path.join(__dirname, '../../data/wakfu-gamedata/items.json');
        const itemsPathLegacy = path.join(__dirname, '../../data/items.json');
        const actionsPath = path.join(__dirname, '../../data/wakfu-gamedata/actions.json');
        const equipmentTypesPath = path.join(__dirname, '../../data/wakfu-gamedata/equipmentItemTypes.json');
        const classesPath = path.join(__dirname, '../../data/clases.json');

        const itemsPath = fs.existsSync(itemsPathGamedata) ? itemsPathGamedata : itemsPathLegacy;
        const itemsRaw = JSON.parse(fs.readFileSync(itemsPath, 'utf-8')) as ItemData[];
        const actionsRaw = JSON.parse(fs.readFileSync(actionsPath, 'utf-8')) as ActionData[];
        const equipmentTypesRaw = JSON.parse(fs.readFileSync(equipmentTypesPath, 'utf-8')) as EquipmentTypeData[];
        classesData = JSON.parse(fs.readFileSync(classesPath, 'utf-8')) as ClassData[];

        actionMap = new Map(actionsRaw.map((entry) => [Number(entry.definition?.id), entry]));
        equipmentTypeMap = new Map(equipmentTypesRaw.map((entry) => [Number(entry.definition?.id), entry]));

        builderItems = itemsRaw
            .map((item): NormalizedBuilderItem | null => {
                const itemId = Number(item.definition?.item?.id);
                const level = Number(item.definition?.item?.level);
                const itemTypeId = Number(item.definition?.item?.baseParameters?.itemTypeId);
                const rarity = Number(item.definition?.item?.baseParameters?.rarity || 0);
                const equipmentType = equipmentTypeMap.get(itemTypeId);
                const positions = equipmentType?.definition?.equipmentPositions || [];
                const supportsDirectSlot = TYPE_IDS_WITH_DIRECT_SLOTS.has(itemTypeId);

                if (!itemId || !itemTypeId || (positions.length === 0 && !supportsDirectSlot)) {
                    return null;
                }

                const title = getLocalizedText(item.title);
                const description = getLocalizedText(item.description);
                const resolvedLevel = getBuilderEffectiveItemLevel(item);
                const itemTypeName = getLocalizedText(equipmentType?.title);
                const usesCompanionLevelScaling = itemTypeId === 582 || itemTypeId === 611;
                const stats = (item.definition?.equipEffects || [])
                    .map((entry) => normalizeStat(entry, resolvedLevel, { scaleWithLevel: usesCompanionLevelScaling }))
                    .filter((entry): entry is NormalizedBuilderStat => Boolean(entry));

                // Determinar si es un arma de dos manos
                const disabledPositions = equipmentType?.definition?.equipmentDisabledPositions || [];
                const isTwoHanded = positions.includes('FIRST_WEAPON') && 
                    disabledPositions.includes('SECOND_WEAPON');

                return {
                    id: itemId,
                    level: resolvedLevel,
                    rarity,
                    itemTypeId,
                    properties: Array.isArray(item.definition?.item?.properties) ? item.definition.item.properties.filter((value: number) => Number.isFinite(value)).map((value: number) => Number(value)) : [],
                    itemTypeName: sanitizeLocaleText(equipmentType?.title) || { es: itemTypeName, en: itemTypeName, fr: itemTypeName, pt: itemTypeName },
                    positions,
                    disabledPositions: equipmentType?.definition?.equipmentDisabledPositions || [],
                    title: sanitizeLocaleText(item.title) || { es: title, en: title, fr: title, pt: title },
                    description: sanitizeLocaleText(item.description) || { es: description, en: description, fr: description, pt: description },
                    gfxId: item.definition?.item?.graphicParameters?.gfxId || null,
                    minShardSlots: Number(item.definition?.item?.baseParameters?.minimumShardSlotNumber || 0),
                    maxShardSlots: Number(item.definition?.item?.baseParameters?.maximumShardSlotNumber || 0),
                    stats,
                    // searchText: buildSearchText({ title, description, itemTypeName }), // Temporarily disabled
                    searchText: (title || '') + ' ' + (description || ''), // Simple fallback
                    isTwoHanded,
                    // equipmentRequirements: parseEquipmentRequirements(description), // Temporarily disabled
                };
            })
            .filter((entry): entry is NormalizedBuilderItem => Boolean(entry))
            .sort((left, right) => {
                if (left.level !== right.level) {
                    return right.level - left.level;
                }

                return (left.title.es || '').localeCompare(right.title.es || '');
            });

        console.log(`[builder] Loaded ${builderItems.length} equippable items`);
    } catch (error) {
        console.error('[builder] Error loading builder data:', error);
    }
}

loadBuilderData();

export function reloadBuilderRouteData() {
    loadBuilderData();
    reloadEnchantmentCatalog();
}

router.get('/enchantment-catalog', (_req: Request, res: Response) => {
    try {
        res.json(getEnchantmentCatalog());
    } catch (error) {
        console.error('[builder] enchantment-catalog', error);
        res.status(500).json({ error: 'No se pudo cargar el catalogo de encantamientos.' });
    }
});

function matchesSlot(item: NormalizedBuilderItem, slotId?: string) {
    if (!slotId) {
        return true;
    }

    const slot = SLOT_DEFINITIONS.find((entry) => entry.id === slotId);
    if (!slot) {
        return true;
    }

    if (slot.typeIds?.length) {
        return slot.typeIds.includes(item.itemTypeId);
    }

    if (slot.includePosition) {
        return item.positions.includes(slot.includePosition);
    }

    return true;
}

router.get('/metadata', (_req: Request, res: Response) => {
    const availableTypeIds = new Set(builderItems.map((item) => item.itemTypeId));
    const equipmentTypes = Array.from(equipmentTypeMap.values())
        .map((entry) => ({
            id: Number(entry.definition?.id || 0),
            label: sanitizeLocaleText(entry.title),
            positions: entry.definition?.equipmentPositions || [],
        }))
        .filter((entry) => entry.id > 0 && availableTypeIds.has(entry.id))
        .sort((left, right) => getLocalizedText(left.label).localeCompare(getLocalizedText(right.label)));

    const statOptions = Array.from(
        new Map(
            builderItems
                .flatMap((item) => item.stats)
                .filter((stat) => !HIDDEN_STAT_FILTER_ACTION_IDS.has(stat.actionId))
                .map((stat) => [stat.key, { key: stat.key, actionId: stat.actionId, label: buildStatOptionLabel(stat) }])
        ).values()
    ).sort((left, right) => {
        const leftText = typeof left.label === 'string' ? left.label : getLocalizedText(left.label);
        const rightText = typeof right.label === 'string' ? right.label : getLocalizedText(right.label);
        return leftText.localeCompare(rightText);
    });

    res.json({
        slots: SLOT_DEFINITIONS,
        classes: classesData.map((entry) => ({
            id: entry.id,
            names: entry.names,
            icon: entry.assets?.icon || '',
            illustrations: {
                male: entry.assets?.male?.illustration || '',
                female: entry.assets?.female?.illustration || '',
            },
        })),
        equipmentTypes,
        statOptions,
        rarities: [
            { id: 0, label: { es: 'Comun', en: 'Common', fr: 'Commun', pt: 'Comum' } },
            { id: 1, label: { es: 'Comun', en: 'Common', fr: 'Commun', pt: 'Comum' } },
            { id: 2, label: { es: 'Poco comun', en: 'Uncommon', fr: 'Peu commun', pt: 'Incomum' } },
            { id: 3, label: { es: 'Mitico', en: 'Mythic', fr: 'Mythique', pt: 'Mitico' } },
            { id: 4, label: { es: 'Legendario', en: 'Legendary', fr: 'Legendaire', pt: 'Lendario' } },
            { id: 5, label: { es: 'Reliquia', en: 'Relic', fr: 'Relique', pt: 'Reliquia' } },
            { id: 6, label: { es: 'Recuerdo', en: 'Souvenir', fr: 'Souvenir', pt: 'Lembranca' } },
            { id: 7, label: { es: 'Epico', en: 'Epic', fr: 'Epique', pt: 'Epico' } },
        ],
        totalItems: builderItems.length,
    });
});

router.get('/items', (req: Request, res: Response) => {
    const query = String(req.query.query || '').trim().toLowerCase();
    const slot = String(req.query.slot || '').trim();
    const rarity = Number(req.query.rarity || 0);
    const itemTypeId = Number(req.query.itemTypeId || 0);
    const statKey = String(req.query.statKey || '').trim();
    const sortBy = String(req.query.sortBy || '').trim();
    const sortDirection = String(req.query.sortDirection || 'desc').trim().toLowerCase() === 'asc' ? 'asc' : 'desc';
    const maxLevel = Number(req.query.maxLevel || 0);
    const minLevel = Number(req.query.minLevel || 0);
    const limit = Math.min(120, Math.max(1, Number(req.query.limit || 48)));

    const getStatTotalByKey = (item: NormalizedBuilderItem, key: string) =>
        item.stats.reduce((sum, stat) => sum + (stat.key === key ? stat.value : 0), 0);

    const items = builderItems
        .filter((item) => matchesSlot(item, slot))
        .filter((item) => !rarity || item.rarity === rarity)
        .filter((item) => !itemTypeId || item.itemTypeId === itemTypeId)
        .filter((item) => !statKey || item.stats.some((stat) => stat.key === statKey))
        .filter((item) => !maxLevel || item.level <= maxLevel)
        .filter((item) => !minLevel || item.level >= minLevel)
        .filter((item) => !query || item.searchText.includes(query))
        .sort((left, right) => {
            if (sortBy === 'stat' && statKey) {
                const leftTotal = getStatTotalByKey(left, statKey);
                const rightTotal = getStatTotalByKey(right, statKey);
                const statDiff = sortDirection === 'asc' ? leftTotal - rightTotal : rightTotal - leftTotal;
                if (statDiff !== 0) return statDiff;
            }

            if (right.level !== left.level) return right.level - left.level;
            return left.id - right.id;
        })
        .slice(0, limit);

    res.json({
        total: items.length,
        items,
    });
});

router.get('/items-by-ids', (req: Request, res: Response) => {
    const ids = String(req.query.ids || '')
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value) && value > 0);

    const idSet = new Set(ids);
    const items = builderItems.filter((item) => idSet.has(item.id));

    res.json({
        total: items.length,
        items,
    });
});

export default router;
