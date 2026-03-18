import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { Character } from '../types/index.js';

const router = Router();

const VALID_ROLES = ['dps', 'healer', 'tank', 'support', 'invocador', 'posicionador'];
const VALID_SERVERS = ['Ogrest', 'Rubilax', 'Pandora'];

const characterValidation = [
    body('name').trim().isLength({ min: 1, max: 50 }).escape(),
    body('level').isInt({ min: 1, max: 245 }),
    body('class_id').isInt({ min: 1 }),
    body('role').isIn(VALID_ROLES),
    body('server').isIn(VALID_SERVERS),
];

// GET all characters of authenticated user
router.get('/', requireAuth, async (req: Request, res: Response) => {
    const db = getDb();
    try {
        const result = await db.query(`
            SELECT c.*, cl.name_es as class_name, cl.icon_path as class_icon
            FROM characters c
            JOIN classes cl ON c.class_id = cl.id
            WHERE c.user_id = $1
            ORDER BY c.created_at DESC
        `, [req.user!.userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// POST create character
router.post('/', requireAuth, characterValidation, validateRequest, async (req: Request, res: Response): Promise<void> => {
    const db = getDb();
    const { name, level, class_id, role, server } = req.body;

    try {
        // Validate class exists
        const clsResult = await db.query('SELECT id FROM classes WHERE id = $1', [class_id]);
        if (clsResult.rows.length === 0) {
            res.status(400).json({ error: 'Clase inválida' });
            return;
        }

        // Max 5 characters per user
        //  const countResult = await db.query('SELECT COUNT(*) as cnt FROM characters WHERE user_id = $1', [req.user!.userId]);
        //  const count = parseInt(countResult.rows[0].cnt, 10);
        //  if (count >= 5) {
        //      res.status(400).json({ error: 'Máximo 5 personajes por cuenta' });
        //      return;
        //  }

        const id = uuidv4();
        await db.query(
            'INSERT INTO characters (id, user_id, name, level, class_id, role, server) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [id, req.user!.userId, name, level, class_id, role, server]
        );

        const newCharResult = await db.query('SELECT * FROM characters WHERE id = $1', [id]);
        res.status(201).json(newCharResult.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// PUT update character
router.put('/:id', requireAuth, characterValidation, validateRequest, async (req: Request, res: Response): Promise<void> => {
    const db = getDb();
    const { id } = req.params;
    const { name, level, class_id, role, server } = req.body;

    try {
        const existingResult = await db.query('SELECT * FROM characters WHERE id = $1 AND user_id = $2', [id, req.user!.userId]);
        if (existingResult.rows.length === 0) {
            res.status(404).json({ error: 'Personaje no encontrado' });
            return;
        }

        await db.query(
            'UPDATE characters SET name = $1, level = $2, class_id = $3, role = $4, server = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6',
            [name, level, class_id, role, server, id]
        );

        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// DELETE character
router.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
    const db = getDb();
    const { id } = req.params;

    try {
        const existingResult = await db.query('SELECT * FROM characters WHERE id = $1 AND user_id = $2', [id, req.user!.userId]);
        if (existingResult.rows.length === 0) {
            res.status(404).json({ error: 'Personaje no encontrado' });
            return;
        }

        await db.query('DELETE FROM characters WHERE id = $1', [id]);
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

export default router;
