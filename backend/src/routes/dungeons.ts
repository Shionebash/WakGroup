import { Router, Request, Response } from 'express';
import { getDb } from '../db/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MazmoData {
    id: number;
    name?: { es?: string; en?: string };
    modulated?: number;
    steles?: boolean;
    steleslvl?: number;
    intervention?: boolean;
    jefeId?: number;
    isDungeon?: boolean;
}

let mazmosData: MazmoData[] = [];

function loadMazmos() {
    try {
        const mazmosPath = path.join(__dirname, '../../data/mazmos.json');
        const raw = fs.readFileSync(mazmosPath, 'utf-8');
        mazmosData = JSON.parse(raw);
    } catch (err) {
        console.error('Error loading mazmos:', err);
    }
}

loadMazmos();

const mazmosById = new Map<number, MazmoData>();
mazmosData.forEach((m) => {
    if (m?.id) {
        mazmosById.set(Number(m.id), m);
    }
});

// GET /dungeons - all dungeons with optional filters
router.get('/', async (req: Request, res: Response): Promise<void> => {
    const db = getDb();
    const { modulated, search, is_dungeon } = req.query;

    let sql = 'SELECT * FROM dungeons WHERE 1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (modulated) { sql += ` AND modulated = $${paramIndex++}`; params.push(Number(modulated)); }
    if (is_dungeon !== undefined) { sql += ` AND is_dungeon = $${paramIndex++}`; params.push(is_dungeon === 'true' ? 1 : 0); }
    if (search) { sql += ` AND (name_es ILIKE $${paramIndex} OR name_en ILIKE $${paramIndex++})`; params.push(`%${search}%`); }

    sql += ' ORDER BY modulated ASC, name_es ASC';

    try {
        const dungeonsResult = await db.query(sql, params);
        
        const dungeons = dungeonsResult.rows.map((d: any) => {
            const mazmo = mazmosById.get(d.id);
            return {
                ...d,
                steles: mazmo?.steles || false,
                steleslvl: mazmo?.steleslvl || 0,
                intervention: mazmo?.intervention || false,
                jefeId: mazmo?.jefeId || null,
            };
        });
        
        res.json(dungeons);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /dungeons/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    const db = getDb();
    try {
        const dungeonResult = await db.query('SELECT * FROM dungeons WHERE id = $1', [req.params.id]);
        if (dungeonResult.rows.length === 0) {
            res.status(404).json({ error: 'Mazmorra no encontrada' });
            return;
        }
        
        const dungeon = dungeonResult.rows[0];
        const mazmo = mazmosById.get(Number(req.params.id));
        
        res.json({
            ...dungeon,
            steles: mazmo?.steles || false,
            steleslvl: mazmo?.steleslvl || 0,
            intervention: mazmo?.intervention || false,
            jefeId: mazmo?.jefeId || null,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

export default router;
