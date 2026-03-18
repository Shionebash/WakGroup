import { Router, Request, Response } from 'express';
import { body, query } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import sanitizeHtml from 'sanitize-html';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { WikiPost } from '../types/index.js';

const router = Router();

// Strict HTML sanitization config - allows embeds but no scripts
const SANITIZE_CONFIG: sanitizeHtml.IOptions = {
    allowedTags: [
        'h1', 'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'strong', 'em',
        'blockquote', 'a', 'img', 'br', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'iframe'
    ],
    allowedAttributes: {
        'a': ['href', 'title', 'target', 'rel'],
        'img': ['src', 'alt', 'width', 'height'],
        'iframe': ['src', 'width', 'height', 'frameborder', 'allowfullscreen', 'title'],
    },
    allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'player.vimeo.com'],
    allowedSchemes: ['https'],
    transformTags: {
        'a': (tagName, attribs) => ({
            tagName,
            attribs: { ...attribs, rel: 'noopener noreferrer', target: '_blank' }
        }),
        'iframe': (tagName, attribs) => {
            // Only allow YouTube embeds
            const src = attribs.src || '';
            if (src.includes('youtube.com') || src.includes('vimeo.com')) {
                return { tagName, attribs: { src, width: '100%', height: '400', frameborder: '0', allowfullscreen: '1', title: 'Video' } };
            }
            return { tagName: 'p', attribs: {} as Record<string, string> };
        }
    }
};

// GET /wiki - list posts
router.get('/', async (req: Request, res: Response): Promise<void> => {
    const db = getDb();
    const { dungeon_id, search, modulated, limit = '20', offset = '0' } = req.query;

    let sql = `
    SELECT 
      wp.id, wp.title, wp.dungeon_id, wp.created_at, wp.updated_at,
      d.name_es as dungeon_name, d.image_path as dungeon_image, d.modulated as dungeon_lvl,
      u.username, u.avatar, u.id as user_id
    FROM wiki_posts wp
    JOIN dungeons d ON wp.dungeon_id = d.id
    JOIN users u ON wp.user_id = u.id
    WHERE 1=1
  `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (dungeon_id) { sql += ` AND wp.dungeon_id = $${paramIndex++}`; params.push(dungeon_id); }
    if (modulated) { sql += ` AND d.modulated = $${paramIndex++}`; params.push(Number(modulated)); }
    if (search) { sql += ` AND (wp.title ILIKE $${paramIndex} OR d.name_es ILIKE $${paramIndex++})`; params.push(`%${search}%`); }

    sql += ` ORDER BY wp.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(Number(limit), Number(offset));

    try {
        const postsResult = await db.query(sql, params);
        res.json(postsResult.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /wiki/:id - detail single post
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    const db = getDb();
    try {
        const postResult = await db.query(`
            SELECT wp.*, d.name_es as dungeon_name, u.username, u.avatar
            FROM wiki_posts wp
            JOIN dungeons d ON wp.dungeon_id = d.id
            JOIN users u ON wp.user_id = u.id
            WHERE wp.id = $1
        `, [req.params.id]);

        if (postResult.rows.length === 0) {
            res.status(404).json({ error: 'Post no encontrado' });
            return;
        }
        res.json(postResult.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// POST /wiki - create post
router.post('/',
    requireAuth,
    [
        body('dungeon_id').isInt(),
        body('title').trim().isLength({ min: 1, max: 200 }),
        body('content').isLength({ min: 1, max: 50000 }),
    ],
    validateRequest,
    async (req: Request, res: Response): Promise<void> => {
        const db = getDb();
        const { dungeon_id, title, content } = req.body;

        try {
            const dungeonResult = await db.query('SELECT id FROM dungeons WHERE id = $1', [dungeon_id]);
            if (dungeonResult.rows.length === 0) {
                res.status(400).json({ error: 'Mazmorra no encontrada' });
                return;
            }

            const sanitized = sanitizeHtml(content, SANITIZE_CONFIG);
            const id = uuidv4();
            await db.query(`
                INSERT INTO wiki_posts (id, dungeon_id, user_id, title, content) VALUES ($1, $2, $3, $4, $5)
            `, [id, dungeon_id, req.user!.userId, title.trim(), sanitized]);

            res.status(201).json({ id });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Database error' });
        }
    }
);

// PUT /wiki/:id - update post
router.put('/:id',
    requireAuth,
    [
        body('title').trim().isLength({ min: 1, max: 200 }),
        body('content').isLength({ min: 1, max: 50000 }),
    ],
    validateRequest,
    async (req: Request, res: Response): Promise<void> => {
        const db = getDb();
        const { id } = req.params;
        const { title, content } = req.body;

        try {
            const postResult = await db.query('SELECT * FROM wiki_posts WHERE id = $1 AND user_id = $2', [id, req.user!.userId]);
            if (postResult.rows.length === 0) {
                res.status(404).json({ error: 'Post no encontrado' });
                return;
            }

            const sanitized = sanitizeHtml(content, SANITIZE_CONFIG);
            await db.query(`
                UPDATE wiki_posts SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3
            `, [title.trim(), sanitized, id]);

            res.json({ ok: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Database error' });
        }
    }
);

// DELETE /wiki/:id - delete post  
router.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
    const db = getDb();
    const { id } = req.params;

    try {
        const postResult = await db.query('SELECT * FROM wiki_posts WHERE id = $1 AND user_id = $2', [id, req.user!.userId]);
        if (postResult.rows.length === 0) {
            res.status(404).json({ error: 'Post no encontrado' });
            return;
        }

        await db.query('DELETE FROM wiki_posts WHERE id = $1', [id]);
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

export default router;
