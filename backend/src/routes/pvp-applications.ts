import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

// POST /pvp-applications - apply to a pvp group
router.post('/',
  requireAuth,
  [
    body('pvp_group_id').isUUID(),
    body('character_id').isUUID(),
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    const db = getDb();
    const { pvp_group_id, character_id } = req.body;

    try {
      // Verify character belongs to the requesting user
      const charResult = await db.query(
        'SELECT * FROM characters WHERE id = $1 AND user_id = $2',
        [character_id, req.user!.userId]
      );
      if (charResult.rows.length === 0) {
        res.status(400).json({ error: 'Personaje inválido' }); return;
      }

      // Verify group exists and is open
      const groupResult = await db.query(
        "SELECT * FROM pvp_groups WHERE id = $1 AND status = 'open'",
        [pvp_group_id]
      );
      if (groupResult.rows.length === 0) {
        res.status(404).json({ error: 'Grupo PVP no encontrado o ya cerrado' }); return;
      }

      const group = groupResult.rows[0];

      // Check max players
      const maxPlayers = group.pvp_mode === '1v1' ? 2 : group.pvp_mode === '2v2' ? 4 : 6;
      const countRes = await db.query(
        'SELECT COUNT(*) FROM pvp_group_members WHERE pvp_group_id = $1',
        [pvp_group_id]
      );
      const memberCount = parseInt(countRes.rows[0].count) + 1; // +1 leader
      if (memberCount >= maxPlayers) {
        res.status(400).json({ error: 'El grupo ya está lleno' }); return;
      }

      // Check not already member
      const existingMember = await db.query(
        'SELECT id FROM pvp_group_members WHERE pvp_group_id = $1 AND character_id = $2',
        [pvp_group_id, character_id]
      );
      if (existingMember.rows.length > 0) {
        res.status(400).json({ error: 'Ya eres miembro de este grupo' }); return;
      }

      // Check not already applied
      const existingApp = await db.query(
        "SELECT id FROM pvp_applications WHERE pvp_group_id = $1 AND character_id = $2 AND status = 'pending'",
        [pvp_group_id, character_id]
      );
      if (existingApp.rows.length > 0) {
        res.status(400).json({ error: 'Ya enviaste una solicitud para este grupo' }); return;
      }

      // Create pvp application
      const id = uuidv4();
      await db.query(`
        INSERT INTO pvp_applications (id, pvp_group_id, character_id)
        VALUES ($1, $2, $3)
      `, [id, pvp_group_id, character_id]);

      // Get leader user_id from the group's leader character
      const leaderResult = await db.query(
        'SELECT c.user_id FROM pvp_groups pg JOIN characters c ON pg.leader_char_id = c.id WHERE pg.id = $1',
        [pvp_group_id]
      );
      const leaderUserId: string = leaderResult.rows[0]?.user_id;

      if (leaderUserId) {
        // Get applicant info for rich notification
        const applicantResult = await db.query(
          'SELECT username FROM users WHERE id = $1', [req.user!.userId]
        );
        const applicantUsername = applicantResult.rows[0]?.username || 'Alguien';
        const charName = charResult.rows[0]?.name || '';

        const notifId = uuidv4();
        const notifPayload = JSON.stringify({
          pvp_group_id,
          character_id,
          application_id: id,
          group_type: 'pvp',
          from_username: applicantUsername,
          char_name: charName,
          preview: `${applicantUsername} quiere unirse con ${charName}`,
        });

        await db.query(
          "INSERT INTO notifications (id, user_id, type, payload) VALUES ($1, $2, 'application_received', $3)",
          [notifId, leaderUserId, notifPayload]
        );

        // Real-time socket emit to leader
        try {
          const { emitNotification } = await import('../socket/chat.js');
          const { io: ioInstance } = await import('../index.js');
          if (ioInstance) {
            emitNotification(ioInstance, leaderUserId, 'notification', {
              type: 'application_received',
              groupId: pvp_group_id,
              groupType: 'pvp',
              fromUsername: applicantUsername,
              charName,
              preview: `${applicantUsername} quiere unirse con ${charName}`,
            });
          }
        } catch { /* socket not ready */ }
      }

      res.status(201).json({ ok: true, application_id: id });
    } catch (err: any) {
      if (err.code === '23505') {
        res.status(400).json({ error: 'Ya enviaste una solicitud para este grupo' }); return;
      }
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  }
);

// PATCH /pvp-applications/:id - accept or reject (leader only)
router.patch('/:id',
  requireAuth,
  [body('action').isIn(['accepted', 'rejected'])],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    const db = getDb();
    const { id } = req.params;
    const { action } = req.body;

    try {
      const appResult = await db.query('SELECT * FROM pvp_applications WHERE id = $1', [id]);
      if (appResult.rows.length === 0) {
        res.status(404).json({ error: 'Solicitud no encontrada' }); return;
      }
      const app = appResult.rows[0];

      if (app.status !== 'pending') {
        res.status(400).json({ error: 'Solicitud ya procesada' }); return;
      }

      // Verify requester is the group leader
      const groupResult = await db.query(`
        SELECT pg.* FROM pvp_groups pg
        JOIN characters c ON pg.leader_char_id = c.id
        WHERE pg.id = $1 AND c.user_id = $2
      `, [app.pvp_group_id, req.user!.userId]);

      if (groupResult.rows.length === 0) {
        res.status(403).json({ error: 'Solo el líder puede gestionar solicitudes' }); return;
      }

      await db.query(
        'UPDATE pvp_applications SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [action, id]
      );

      if (action === 'accepted') {
        const group = groupResult.rows[0];
        const maxPlayers = group.pvp_mode === '1v1' ? 2 : group.pvp_mode === '2v2' ? 4 : 6;
        const countRes = await db.query(
          'SELECT COUNT(*) FROM pvp_group_members WHERE pvp_group_id = $1',
          [app.pvp_group_id]
        );
        const memberCount = parseInt(countRes.rows[0].count) + 1;

        if (memberCount >= maxPlayers) {
          await db.query(
            'UPDATE pvp_applications SET status = $1 WHERE id = $2',
            ['rejected', id]
          );
          res.status(400).json({ error: 'El grupo está lleno' }); return;
        }

        const memberId = uuidv4();
        await db.query(
          'INSERT INTO pvp_group_members (id, pvp_group_id, character_id) VALUES ($1, $2, $3)',
          [memberId, app.pvp_group_id, app.character_id]
        );

        const newCount = memberCount + 1;
        if (newCount >= maxPlayers) {
          await db.query(
            "UPDATE pvp_groups SET status = 'full', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [app.pvp_group_id]
          );
        }
      }

      // Notify the applicant
      const applicantUserResult = await db.query(
        'SELECT user_id FROM characters WHERE id = $1', [app.character_id]
      );
      const applicantUserId = applicantUserResult.rows[0]?.user_id;
      const leaderName = (await db.query('SELECT username FROM users WHERE id = $1', [req.user!.userId])).rows[0]?.username || '';

      if (applicantUserId) {
        const notifId = uuidv4();
        const notifType = action === 'accepted' ? 'application_accepted' : 'application_rejected';
        await db.query(
          "INSERT INTO notifications (id, user_id, type, payload) VALUES ($1, $2, $3, $4)",
          [notifId, applicantUserId, notifType, JSON.stringify({
            pvp_group_id: app.pvp_group_id,
            group_type: 'pvp',
            application_id: id,
            from_username: leaderName,
            preview: action === 'accepted' ? '¡Tu solicitud fue aceptada!' : 'Tu solicitud fue rechazada.',
          })]
        );

        try {
          const { emitNotification } = await import('../socket/chat.js');
          const { io: ioInstance } = await import('../index.js');
          if (ioInstance) {
            emitNotification(ioInstance, applicantUserId, 'notification', {
              type: notifType,
              groupType: 'pvp',
              fromUsername: leaderName,
              preview: action === 'accepted' ? '¡Tu solicitud fue aceptada!' : 'Tu solicitud fue rechazada.',
            });
          }
        } catch { /* socket not ready */ }
      }

      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  }
);

export default router;
