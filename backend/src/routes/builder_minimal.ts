import { Request, Response, Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();

console.log('[builder-minimal] Module loaded');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type LocaleText = Record<string, string | undefined>;

interface ClassData {
    id: number;
    names: LocaleText;
    assets?: {
        icon?: string;
    };
}

interface RarityData {
    id: number;
    label: LocaleText;
}

interface EquipmentTypeData {
    id: number;
    label: LocaleText;
    positions: string[];
}

let classesData: ClassData[] = [];
let raritiesData: RarityData[] = [];
let equipmentTypesData: EquipmentTypeData[] = [];
let builderItems: any[] = [];

function getLocalizedText(text: LocaleText | undefined): string {
    return text?.es || text?.en || text?.fr || text?.pt || '';
}

function cleanText(text: string): string {
    return text
        // Reemplazar marcadores de Wakfu con las formas correctas
        .replace(/\{\[~\d+\]\?([^:]+):([^}]+)\}/g, '$2') // Usar la segunda opción (singular)
        .replace(/\{[^}]*\}/g, '') // Eliminar cualquier marcador restante
        .replace(/\s+/g, ' ') // Limpiar espacios múltiples
        .trim();
}

function loadBuilderData() {
    try {
        const classesPath = path.join(__dirname, '../../data/clases.json');
        const itemsPath = path.join(__dirname, '../../data/items.json');
        const equipmentTypesPath = path.join(__dirname, '../../data/wakfu-gamedata/equipmentItemTypes.json');
        
        classesData = JSON.parse(fs.readFileSync(classesPath, 'utf8')) as ClassData[];
        
        // Load items
        const itemsRaw = JSON.parse(fs.readFileSync(itemsPath, 'utf8')) as any[];
        builderItems = itemsRaw
            .filter(item => item.definition?.item?.id && item.definition?.item?.baseParameters?.itemTypeId)
            .map(item => ({
                id: item.definition.item.id,
                level: item.definition.item.level || 0,
                rarity: item.definition.item.baseParameters?.rarity || 0,
                itemTypeId: item.definition.item.baseParameters?.itemTypeId || 0,
                properties: item.definition.item.properties || [],
                title: {
                    es: item.title?.es ? cleanText(item.title.es) : '',
                    en: item.title?.en ? cleanText(item.title.en) : '',
                    fr: item.title?.fr ? cleanText(item.title.fr) : '',
                    pt: item.title?.pt ? cleanText(item.title.pt) : ''
                },
                description: {
                    es: item.description?.es ? cleanText(item.description.es) : '',
                    en: item.description?.en ? cleanText(item.description.en) : '',
                    fr: item.description?.fr ? cleanText(item.description.fr) : '',
                    pt: item.description?.pt ? cleanText(item.description.pt) : ''
                },
                gfxId: item.definition.item.graphicParameters?.gfxId || null,
                minShardSlots: item.definition.item.baseParameters?.minimumShardSlotNumber || 0,
                maxShardSlots: item.definition.item.baseParameters?.maximumShardSlotNumber || 0,
                positions: item.definition.item.equipmentPositions || [],
                stats: []
            }));
        
        const equipmentTypesRaw = JSON.parse(fs.readFileSync(equipmentTypesPath, 'utf8')) as any[];
        equipmentTypesData = equipmentTypesRaw
            .filter(entry => entry.definition?.id) // Solo filtrar que tenga ID
            .map(entry => ({
                id: Number(entry.definition.id),
                label: {
                    es: entry.title?.es ? cleanText(entry.title.es) : '',
                    en: entry.title?.en ? cleanText(entry.title.en) : '',
                    fr: entry.title?.fr ? cleanText(entry.title.fr) : '',
                    pt: entry.title?.pt ? cleanText(entry.title.pt) : ''
                },
                positions: entry.definition.equipmentPositions || []
            }));

        // Create basic rarity data
        raritiesData = [
            { id: 0, label: { es: 'Comun', en: 'Common', fr: 'Commun', pt: 'Comum' } },
            { id: 1, label: { es: 'Comun', en: 'Common', fr: 'Commun', pt: 'Comum' } },
            { id: 2, label: { es: 'Poco comun', en: 'Uncommon', fr: 'Peu commun', pt: 'Incomum' } },
            { id: 3, label: { es: 'Mitico', en: 'Mythic', fr: 'Mythique', pt: 'Mitico' } },
            { id: 4, label: { es: 'Legendario', en: 'Legendary', fr: 'Legendaire', pt: 'Lendario' } },
            { id: 5, label: { es: 'Reliquia', en: 'Relic', fr: 'Relique', pt: 'Reliquia' } },
            { id: 6, label: { es: 'Recuerdo', en: 'Souvenir', fr: 'Souvenir', pt: 'Recuerdo' } },
            { id: 7, label: { es: 'Epico', en: 'Epic', fr: 'Epique', pt: 'Epico' } }
        ];

        console.log(`[builder-minimal] Loaded ${classesData.length} classes, ${equipmentTypesData.length} equipment types, ${builderItems.length} items`);
    } catch (error) {
        console.error('[builder-minimal] Error loading data:', error);
    }
}

loadBuilderData();

// Basic slot definitions
const SLOT_DEFINITIONS = [
    { id: 'amulet', label: { es: 'Amuleto', en: 'Amulet', fr: 'Amulette', pt: 'Amuleto' }, typeIds: [120] },
    { id: 'helmet', label: { es: 'Casco', en: 'Helmet', fr: 'Casque', pt: 'Casque' }, typeIds: [134] },
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
    { id: 'pet', label: { es: 'Mascota', en: 'Pet', fr: 'Familier', pt: 'Mascote' }, includePosition: 'PET' },
    { id: 'costume', label: { es: 'Traje', en: 'Costume', fr: 'Costume', pt: 'Fantasia' }, includePosition: 'COSTUME' },
];

// Level brackets for filtering
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
];

// Basic stat options
const statOptions = [
    { key: 'action:100', actionId: 100, label: { es: 'PA', en: 'AP', fr: 'PA', pt: 'PA' } },
    { key: 'action:101', actionId: 101, label: { es: 'PW', en: 'MP', fr: 'PW', pt: 'PW' } },
    { key: 'action:102', actionId: 102, label: { es: 'Vida', en: 'HP', fr: 'PV', pt: 'Vida' } },
    { key: 'action:103', actionId: 103, label: { es: 'Iniciativa', en: 'Initiative', fr: 'Initiative', pt: 'Iniciativa' } },
    { key: 'action:104', actionId: 104, label: { es: 'Esquiva', en: 'Dodge', fr: 'Esquive', pt: 'Esquiva' } },
    { key: 'action:105', actionId: 105, label: { es: 'Bloqueo', en: 'Lock', fr: 'Blocage', pt: 'Bloqueo' } },
    { key: 'action:106', actionId: 106, label: { es: 'Placaje', en: 'Armor', fr: 'Armure', pt: 'Placaje' } },
    { key: 'action:107', actionId: 107, label: { es: 'Resistencia', en: 'Resistance', fr: 'Résistance', pt: 'Resistencia' } },
];

// Test route
router.get('/test', (_req: Request, res: Response) => {
    console.log('[builder-minimal] GET /test called');
    res.json({ message: 'Builder routes are working!' });
});

router.get('/metadata', (_req: Request, res: Response) => {
    console.log('[builder-minimal] GET /metadata called');
    res.json({
        slots: SLOT_DEFINITIONS,
        classes: classesData.map((entry) => ({
            id: entry.id,
            names: entry.names,
            icon: entry.assets?.icon || '',
        })),
        equipmentTypes: equipmentTypesData,
        statOptions,
        rarities: raritiesData,
        totalItems: builderItems.length,
    });
});

router.get('/items', (req: Request, res: Response) => {
    const { slot, query, rarity, maxLevel, itemTypeId, statKey, limit = 80 } = req.query;
    
    let filteredItems = [...builderItems];
    
    // Filter by slot
    if (slot) {
        const slotDef = SLOT_DEFINITIONS.find(s => s.id === slot);
        if (slotDef) {
            if (slotDef.typeIds?.length) {
                filteredItems = filteredItems.filter(item => slotDef.typeIds.includes(item.itemTypeId));
            } else if (slotDef.includePosition) {
                filteredItems = filteredItems.filter(item => item.positions.includes(slotDef.includePosition));
            }
        }
    }
    
    // Filter by rarity
    if (rarity && Number(rarity) > 0) {
        filteredItems = filteredItems.filter(item => item.rarity === Number(rarity));
    }
    
    // Filter by item type
    if (itemTypeId && Number(itemTypeId) > 0) {
        filteredItems = filteredItems.filter(item => item.itemTypeId === Number(itemTypeId));
    }
    
    // Filter by level
    if (maxLevel && Number(maxLevel) > 0) {
        const maxLevelNum = Number(maxLevel);
        
        // Find the corresponding level bracket
        const levelBracket = LEVEL_BRACKETS.find(bracket => bracket.max === maxLevelNum);
        if (levelBracket) {
            filteredItems = filteredItems.filter(item => item.level >= levelBracket.min && item.level <= levelBracket.max);
        } else {
            // Fallback: use max level only
            filteredItems = filteredItems.filter(item => item.level <= maxLevelNum);
        }
    }
    
    // Filter by search query
    if (query && typeof query === 'string') {
        const searchLower = query.toLowerCase();
        filteredItems = filteredItems.filter(item => {
            const title = getLocalizedText(item.title).toLowerCase();
            const description = getLocalizedText(item.description).toLowerCase();
            return title.includes(searchLower) || description.includes(searchLower);
        });
    }
    
    // Limit results
    const limitedItems = filteredItems.slice(0, Number(limit));
    
    res.json({
        total: filteredItems.length,
        items: limitedItems,
    });
});

export default router;
