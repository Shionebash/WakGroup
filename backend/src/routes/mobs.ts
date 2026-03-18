import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MobData {
    gfxid?: string;
    nivel?: string;
    drops?: [string, string][];
}

interface ItemData {
    definition?: {
        item?: {
            id?: number;
            graphicParameters?: {
                gfxId?: number;
            };
        };
    };
    title?: {
        es?: string;
        en?: string;
        fr?: string;
        pt?: string;
    };
}

let mobsData: Record<string, MobData> = {};
let itemsData: ItemData[] = [];

function loadData() {
    try {
        const mobsPath = path.join(__dirname, '../../data/wakfu_mobs.json');
        const mobsRaw = fs.readFileSync(mobsPath, 'utf-8');
        mobsData = JSON.parse(mobsRaw);
        
        const itemsPath = path.join(__dirname, '../../data/items.json');
        const itemsRaw = fs.readFileSync(itemsPath, 'utf-8');
        itemsData = JSON.parse(itemsRaw);
        
        console.log(`Loaded ${Object.keys(mobsData).length} mobs and ${itemsData.length} items`);
    } catch (err) {
        console.error('Error loading data files:', err);
    }
}

loadData();

router.get('/mob/:id/drops', (req: Request, res: Response) => {
    const { id } = req.params;
    const mob = mobsData[id] || mobsData[String(id)];
    
    if (!mob || !mob.drops) {
        res.json([]);
        return;
    }
    
    const drops = mob.drops.map((d) => {
        const itemId = parseInt(d[0], 10);
        const dropRate = d[1];
        const item = itemsData.find((it) => it.definition?.item?.id === itemId);
        
        return {
            id: itemId,
            dropRate,
            title: item?.title || { es: `Item ${itemId}` },
            graphic_parameters: {
                gfxId: item?.definition?.item?.graphicParameters?.gfxId || null,
            },
        };
    });
    
    res.json(drops);
});

router.get('/mobs/:id/drops', (req: Request, res: Response) => {
    const { id } = req.params;
    const mob = mobsData[id] || mobsData[String(id)];
    
    if (!mob || !mob.drops) {
        res.json([]);
        return;
    }
    
    const drops = mob.drops.map((d) => {
        const itemId = parseInt(d[0], 10);
        const dropRate = d[1];
        const item = itemsData.find((it) => it.definition?.item?.id === itemId);
        
        return {
            id: itemId,
            dropRate,
            title: item?.title || { es: `Item ${itemId}` },
            graphic_parameters: {
                gfxId: item?.definition?.item?.graphicParameters?.gfxId || null,
            },
        };
    });
    
    res.json(drops);
});

router.get('/items/batch', (req: Request, res: Response) => {
    const { ids } = req.query;
    
    if (!ids || typeof ids !== 'string') {
        res.json([]);
        return;
    }
    
    const idList = ids.split(',').map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
    
    const items = idList.map((id) => {
        const item = itemsData.find((it) => it.definition?.item?.id === id);
        
        if (!item) {
            return {
                id,
                title: { es: `Item ${id}` },
                graphic_parameters: { gfxId: null },
            };
        }
        
        return {
            id,
            title: item.title || { es: `Item ${id}` },
            graphic_parameters: {
                gfxId: item.definition?.item?.graphicParameters?.gfxId || null,
            },
        };
    });
    
    res.json(items);
});

export default router;
