import { Router, Request, Response } from 'express';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /notifications - unread notifications for current user
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
    const db = getDb();
    try {
        const notifsResult = await db.query(`
            SELECT id, type, payload, is_read, created_at
            FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 50
        `, [req.user!.userId]);

        // Parse payload JSON
        const result = notifsResult.rows.map((n: any) => ({
            ...n,
            payload: JSON.parse(n.payload || '{}'),
        }));

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// PATCH /notifications/read-all - mark all as read
router.patch('/read-all', requireAuth, async (req: Request, res: Response): Promise<void> => {
    const db = getDb();
    try {
        await db.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.user!.userId]);
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /notifications/count - unread count
router.get('/count', requireAuth, async (req: Request, res: Response): Promise<void> => {
    const db = getDb();
    try {
        const result = await db.query('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = $1 AND is_read = false', [req.user!.userId]);
        res.json({ count: parseInt(result.rows[0].cnt, 10) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

export default router;
