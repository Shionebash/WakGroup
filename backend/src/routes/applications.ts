import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { Application, DungeonGroup } from '../types/index.js';
import { touchDungeonGroupActivity } from '../services/group-inactivity.js';

const router = Router();

// POST /applications - apply to a group
router.post('/',
    requireAuth,
    [
        body('group_id').isUUID(),
        body('character_id').isUUID(),
    ],
    validateRequest,
    async (req: Request, res: Response): Promise<void> => {
        const db = getDb();
        const { group_id, character_id } = req.body;

        try {
            // Verify character belongs to user
            const charResult = await db.query('SELECT * FROM characters WHERE id = $1 AND user_id = $2', [character_id, req.user!.userId]);
            if (charResult.rows.length === 0) {
                res.status(400).json({ error: 'Personaje inválido' });
                return;
            }

            // Get group and check it's open
            const groupResult = await db.query("SELECT * FROM groups WHERE id = $1 AND status = 'open'", [group_id]);
            if (groupResult.rows.length === 0) {
                res.status(404).json({ error: 'Grupo no disponible' });
                return;
            }
            const group = groupResult.rows[0];

            // Check user is not the group leader
            const leaderCharResult = await db.query('SELECT user_id FROM characters WHERE id = $1', [group.leader_char_id]);
            const leaderChar = leaderCharResult.rows[0];
            if (leaderChar?.user_id === req.user!.userId) {
                // Check group not full
                const dungeonResult = await db.query('SELECT max_players FROM dungeons WHERE id = $1', [group.dungeon_id]);
                const dungeon = dungeonResult.rows[0];
                const memberCountResult = await db.query('SELECT COUNT(*) as cnt FROM group_members WHERE group_id = $1', [group_id]);
                const memberCount = parseInt(memberCountResult.rows[0].cnt, 10) + 1;
                if (memberCount >= dungeon.max_players) {
                    res.status(400).json({ error: 'El grupo está lleno' });
                    return;
                }
                const memberId = uuidv4();
                await db.query('INSERT INTO group_members (id, group_id, character_id) VALUES ($1, $2, $3)', [memberId, group_id, character_id]);
                await touchDungeonGroupActivity(db, group_id);
                res.status(201).json({ ok: true, auto_accepted: true });
                return;
            }

            // Check already a member
            const alreadyMemberResult = await db.query('SELECT id FROM group_members WHERE group_id = $1 AND character_id = $2', [group_id, character_id]);
            if (alreadyMemberResult.rows.length > 0) {
                res.status(400).json({ error: 'Ya eres miembro de este grupo' });
                return;
            }

            // Check not already applied
            const existingAppResult = await db.query('SELECT id FROM applications WHERE group_id = $1 AND character_id = $2', [group_id, character_id]);
            if (existingAppResult.rows.length > 0) {
                res.status(400).json({ error: 'Ya enviaste una solicitud para este grupo' });
                return;
            }

            // Check group not full
            const dungeonResult = await db.query('SELECT max_players FROM dungeons WHERE id = $1', [group.dungeon_id]);
            const dungeon = dungeonResult.rows[0];
            const memberCountResult = await db.query('SELECT COUNT(*) as cnt FROM group_members WHERE group_id = $1', [group_id]);
            const memberCount = parseInt(memberCountResult.rows[0].cnt, 10) + 1; // +1 for leader
            if (memberCount >= dungeon.max_players) {
                res.status(400).json({ error: 'El grupo está lleno' });
                return;
            }

            const id = uuidv4();
            await db.query('INSERT INTO applications (id, group_id, character_id) VALUES ($1, $2, $3)', [id, group_id, character_id]);
            await touchDungeonGroupActivity(db, group_id);

            // Get applicant username and char name for richer notification
            const applicantUserResult = await db.query('SELECT username FROM users WHERE id = $1', [req.user!.userId]);
            const applicantUsername = applicantUserResult.rows[0]?.username || 'Alguien';
            const charNameResult = await db.query('SELECT name FROM characters WHERE id = $1', [character_id]);
            const charName = charNameResult.rows[0]?.name || '';

            // Notify group leader
            const notifId = uuidv4();
            const notifPayload = JSON.stringify({
                group_id,
                character_id,
                application_id: id,
                from_username: applicantUsername,
                char_name: charName,
                preview: `${applicantUsername} quiere unirse con ${charName}`,
            });
            await db.query(`
                INSERT INTO notifications (id, user_id, type, payload) VALUES ($1, $2, 'application_received', $3)
            `, [notifId, leaderChar!.user_id, notifPayload]);

            // Real-time socket notification
            try {
                const { emitNotification } = await import('../socket/chat.js');
                const { io: ioInstance } = await import('../index.js');
                if (ioInstance) {
                    emitNotification(ioInstance, leaderChar!.user_id, 'notification', {
                        type: 'application_received',
                        groupId: group_id,
                        fromUsername: applicantUsername,
                        charName,
                        preview: `${applicantUsername} quiere unirse con ${charName}`,
                    });
                }
            } catch { /* socket not ready */ }

            res.status(201).json({ ok: true, application_id: id });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Database error' });
        }
    }
);

// PATCH /applications/:id - accept or reject (leader only)
router.patch('/:id',
    requireAuth,
    [body('action').isIn(['accepted', 'rejected'])],
    validateRequest,
    async (req: Request, res: Response): Promise<void> => {
        const db = getDb();
        const { id } = req.params;
        const { action } = req.body;

        try {
            const appResult = await db.query('SELECT * FROM applications WHERE id = $1', [id]);
            if (appResult.rows.length === 0) {
                res.status(404).json({ error: 'Solicitud no encontrada' });
                return;
            }
            const app = appResult.rows[0];

            if (app.status !== 'pending') {
                res.status(400).json({ error: 'Solicitud ya procesada' });
                return;
            }

            // Verify current user is the group leader
            const groupResult = await db.query(`
                SELECT g.* FROM groups g
                JOIN characters c ON g.leader_char_id = c.id
                WHERE g.id = $1 AND c.user_id = $2
            `, [app.group_id, req.user!.userId]);

            if (groupResult.rows.length === 0) {
                res.status(403).json({ error: 'Solo el líder puede gestionar solicitudes' });
                return;
            }
            const group = groupResult.rows[0];

            await db.query('UPDATE applications SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [action, id]);

            // Get applicant's user_id for notification
            const applicantUserResult = await db.query('SELECT user_id FROM characters WHERE id = $1', [app.character_id]);
            const applicantUser = applicantUserResult.rows[0];

            if (action === 'accepted') {
                // Check group not full
                const dungeonResult = await db.query('SELECT max_players FROM dungeons WHERE id = $1', [group.dungeon_id]);
                const dungeon = dungeonResult.rows[0];
                const memberCountResult = await db.query('SELECT COUNT(*) as cnt FROM group_members WHERE group_id = $1', [app.group_id]);
                const memberCount = parseInt(memberCountResult.rows[0].cnt, 10) + 1;

                if (memberCount >= dungeon.max_players) {
                    await db.query('UPDATE applications SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['rejected', id]);
                    res.status(400).json({ error: 'El grupo está lleno' });
                    return;
                }

                // Add as member
                const memberId = uuidv4();
                await db.query('INSERT INTO group_members (id, group_id, character_id) VALUES ($1, $2, $3)', [memberId, app.group_id, app.character_id]);
                await touchDungeonGroupActivity(db, app.group_id);

                // Update group status if full
                const newCount = memberCount + 1;
                if (newCount >= dungeon.max_players) {
                    await db.query("UPDATE groups SET status = 'full', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [app.group_id]);
                }
            }
            await touchDungeonGroupActivity(db, app.group_id);

            // Notify applicant
            const notifId = uuidv4();
            const notifType = action === 'accepted' ? 'application_accepted' : 'application_rejected';
            const leaderName = (await db.query('SELECT username FROM users WHERE id = $1', [req.user!.userId])).rows[0]?.username || '';
            await db.query(`
                INSERT INTO notifications (id, user_id, type, payload) VALUES ($1, $2, $3, $4)
            `, [notifId, applicantUser.user_id, notifType, JSON.stringify({
                group_id: app.group_id,
                application_id: id,
                from_username: leaderName,
                preview: action === 'accepted' ? '¡Tu solicitud fue aceptada!' : 'Tu solicitud fue rechazada.',
            })]);

            // Real-time socket notification
            try {
                const { emitNotification } = await import('../socket/chat.js');
                const { io: ioInstance } = await import('../index.js');
                if (ioInstance) {
                    emitNotification(ioInstance, applicantUser.user_id, 'notification', {
                        type: notifType,
                        groupId: app.group_id,
                        fromUsername: leaderName,
                        preview: action === 'accepted' ? '¡Tu solicitud fue aceptada!' : 'Tu solicitud fue rechazada.',
                    });
                }
            } catch { /* socket not ready */ }

            res.json({ ok: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Database error' });
        }
    }
);

// GET /applications/mine - my sent applications
router.get('/mine', requireAuth, async (req: Request, res: Response): Promise<void> => {
    const db = getDb();
    try {
        const appsResult = await db.query(`
            SELECT 
            a.*, 
            g.title as group_title, g.server as group_server,
            d.name_es as dungeon_name, d.image_path as dungeon_image,
            c.name as char_name, cl.name_es as class_name, cl.icon_path as class_icon
            FROM applications a
            JOIN groups g ON a.group_id = g.id
            JOIN dungeons d ON g.dungeon_id = d.id
            JOIN characters c ON a.character_id = c.id
            JOIN classes cl ON c.class_id = cl.id
            WHERE c.user_id = $1
            ORDER BY a.created_at DESC
        `, [req.user!.userId]);
        res.json(appsResult.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /applications/incoming - applications received by groups I lead
router.get('/incoming', requireAuth, async (req: Request, res: Response): Promise<void> => {
    const db = getDb();
    try {
        const appsResult = await db.query(`
            SELECT 
            a.*,
            g.title as group_title,
            d.name_es as dungeon_name,
            c.name as char_name, c.level, c.role,
            cl.name_es as class_name, cl.icon_path as class_icon,
            u.username as applicant_username, u.avatar as applicant_avatar
            FROM applications a
            JOIN groups g ON a.group_id = g.id
            JOIN dungeons d ON g.dungeon_id = d.id
            JOIN characters c ON a.character_id = c.id
            JOIN classes cl ON c.class_id = cl.id
            JOIN characters lc ON g.leader_char_id = lc.id
            JOIN users u ON c.user_id = u.id
            WHERE lc.user_id = $1 AND a.status = 'pending'
            ORDER BY a.created_at DESC
        `, [req.user!.userId]);
        res.json(appsResult.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

export default router;
