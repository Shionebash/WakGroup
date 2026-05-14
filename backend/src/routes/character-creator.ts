import { Request, Response, Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type LocaleText = Record<string, string | undefined>;

interface ItemData {
    definition?: {
        item?: {
            id?: number;
            level?: number;
            baseParameters?: {
                itemTypeId?: number;
                rarity?: number;
            };
            graphicParameters?: {
                gfxId?: number;
            };
        };
    };
    title?: LocaleText;
}

interface EquipmentTypeData {
    definition?: {
        id?: number;
    };
    title?: LocaleText;
}

interface VisualCatalogItem {
    id?: number;
    name?: string;
    level?: number;
    rarity?: number;
    gfxId?: number;
    femaleGfxId?: number | null;
}

interface CharacterCreatorEquipmentItem {
    id: number;
    level: number;
    rarity: number;
    gfxId: number;
    femaleGfxId: number | null;
    title: LocaleText;
    itemTypeName: LocaleText;
    iconPath: string;
    slot: string;
}

const SLOT_ORDER = ['FIRST_WEAPON', 'SECOND_WEAPON', 'HEAD', 'CHEST', 'SHOULDERS', 'LEGS', 'BACK'] as const;
const EMPTY_LOCALE: LocaleText = { es: '', en: '', fr: '', pt: '' };

let equipmentCatalog: Record<string, CharacterCreatorEquipmentItem[]> = {};

function repairMojibake(value: string): string {
    let text = value;
    for (let pass = 0; pass < 2 && /[ÃÂ]/.test(text); pass += 1) {
        try {
            const bytes = Array.from(text, (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join('');
            const decoded = decodeURIComponent(bytes);
            if (!decoded || decoded === text) break;
            text = decoded;
        } catch {
            break;
        }
    }
    return text;
}

function sanitizeLocaleText(value: unknown): LocaleText | null {
    if (!value || typeof value !== 'object') return null;
    const source = value as LocaleText;
    const fallback = source.es || source.en || source.fr || source.pt || '';
    return {
        es: repairMojibake(source.es || fallback),
        en: repairMojibake(source.en || fallback),
        fr: repairMojibake(source.fr || fallback),
        pt: repairMojibake(source.pt || fallback),
    };
}

function fallbackLocaleText(text: string): LocaleText {
    const repaired = repairMojibake(text);
    return { es: repaired, en: repaired, fr: repaired, pt: repaired };
}

function readJsonFile<T>(filePath: string): T {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function loadCharacterCreatorEquipmentData() {
    try {
        const visualCatalogPath = path.join(__dirname, '../../assets/character-creator/assets/equipment_catalog.json');
        const itemsPathGamedata = path.join(__dirname, '../../data/wakfu-gamedata/items.json');
        const itemsPathLegacy = path.join(__dirname, '../../data/items.json');
        const equipmentTypesPath = path.join(__dirname, '../../data/wakfu-gamedata/equipmentItemTypes.json');

        const visualCatalog = readJsonFile<Record<string, VisualCatalogItem[]>>(visualCatalogPath);
        const itemsPath = fs.existsSync(itemsPathGamedata) ? itemsPathGamedata : itemsPathLegacy;
        const itemsRaw = readJsonFile<ItemData[]>(itemsPath);
        const equipmentTypesRaw = readJsonFile<EquipmentTypeData[]>(equipmentTypesPath);

        const itemsById = new Map(itemsRaw.map((item) => [Number(item.definition?.item?.id), item]));
        const equipmentTypeById = new Map(equipmentTypesRaw.map((entry) => [Number(entry.definition?.id), entry]));

        equipmentCatalog = Object.fromEntries(
            SLOT_ORDER.map((slot) => {
                const items = (visualCatalog[slot] || [])
                    .map((visualItem): CharacterCreatorEquipmentItem | null => {
                        const id = Number(visualItem.id);
                        const gfxId = Number(visualItem.gfxId);
                        if (!id || !gfxId) return null;

                        const gamedataItem = itemsById.get(id);
                        const itemTypeId = Number(gamedataItem?.definition?.item?.baseParameters?.itemTypeId || 0);
                        const equipmentType = equipmentTypeById.get(itemTypeId);
                        const fallbackName = visualItem.name || `Item ${id}`;
                        const title = sanitizeLocaleText(gamedataItem?.title) || fallbackLocaleText(fallbackName);
                        const itemTypeName = sanitizeLocaleText(equipmentType?.title) || EMPTY_LOCALE;
                        const iconGfxId = Number(gamedataItem?.definition?.item?.graphicParameters?.gfxId || gfxId);

                        return {
                            id,
                            level: Number(gamedataItem?.definition?.item?.level || visualItem.level || 0),
                            rarity: Number(gamedataItem?.definition?.item?.baseParameters?.rarity || visualItem.rarity || 0),
                            gfxId,
                            femaleGfxId: visualItem.femaleGfxId == null ? null : Number(visualItem.femaleGfxId),
                            title,
                            itemTypeName,
                            iconPath: `assets/items/${iconGfxId}.png`,
                            slot,
                        };
                    })
                    .filter((item): item is CharacterCreatorEquipmentItem => Boolean(item));

                return [slot, items];
            }),
        );

        console.log('[character-creator] Loaded visual equipment catalog', {
            totalItems: Object.values(equipmentCatalog).reduce((sum, items) => sum + items.length, 0),
        });
    } catch (error) {
        equipmentCatalog = Object.fromEntries(SLOT_ORDER.map((slot) => [slot, []]));
        console.error('[character-creator] Error loading visual equipment catalog:', error);
    }
}

loadCharacterCreatorEquipmentData();

export function reloadCharacterCreatorRouteData() {
    loadCharacterCreatorEquipmentData();
}

router.get('/equipment', (_req: Request, res: Response) => {
    res.json({
        slots: SLOT_ORDER,
        itemsBySlot: equipmentCatalog,
    });
});

export default router;
