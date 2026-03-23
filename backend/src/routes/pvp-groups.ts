import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { acknowledgeGroupKeepAlive, touchPvpGroupActivity } from '../services/group-inactivity.js';

const router = Router();

const VALID_SERVERS = ['Ogrest', 'Rubilax', 'Pandora'];
const VALID_PVP_MODES = ['1v1', '2v2', '3v3', '4v4', '5v5', '6v6'];
const VALID_BANDS = [20, 35, 50, 65, 80, 95, 110, 125, 140, 155, 170, 185, 200, 215, 230, 245];
const VALID_TEAMS = ['red', 'blue'];
const VALID_GROUP_LANGUAGES = ['es', 'en', 'fr', 'pt'];

async function isPvpGroupMember(groupId: string, userId: string): Promise<boolean> {
  const db = getDb();
  const result = await db.query(`
    SELECT 1
    FROM pvp_group_members pgm
    JOIN characters c ON pgm.character_id = c.id
    WHERE pgm.pvp_group_id = $1 AND c.user_id = $2
    UNION
    SELECT 1
    FROM pvp_groups pg
    JOIN characters c ON pg.leader_char_id = c.id
    WHERE pg.id = $3 AND c.user_id = $4
  `, [groupId, userId, groupId, userId]);

  return result.rows.length > 0;
}

// GET /pvp-groups - list with filters
router.get('/', async (req: Request, res: Response) => {
  const db = getDb();
  const { pvp_mode, equipment_band, server, language, limit = '20', offset = '0' } = req.query;

  let sql = `
    SELECT 
      pg.*,
      c.name as leader_name, c.class_id as leader_class_id,
      cl.icon_path as leader_class_icon, cl.name_es as leader_class_name,
      u.username as leader_username, u.avatar as leader_avatar, u.id as leader_user_id,
      (SELECT COUNT(*) FROM pvp_group_members pgm WHERE pgm.pvp_group_id = pg.id) + 1 as member_count
    FROM pvp_groups pg
    JOIN characters c ON pg.leader_char_id = c.id
    JOIN classes cl ON c.class_id = cl.id
    JOIN users u ON c.user_id = u.id
    WHERE pg.status = 'open'
  `;
  const params: unknown[] = [];
  let paramIndex = 1;

  if (pvp_mode && VALID_PVP_MODES.includes(pvp_mode as string)) {
    sql += ` AND pg.pvp_mode = $${paramIndex++}`; params.push(pvp_mode);
  }
  if (equipment_band) {
    sql += ` AND pg.equipment_band = $${paramIndex++}`; params.push(Number(equipment_band));
  }
  if (server && VALID_SERVERS.includes(server as string)) {
    sql += ` AND pg.server = $${paramIndex++}`; params.push(server);
  }
  if (language && VALID_GROUP_LANGUAGES.includes(language as string)) {
    sql += ` AND COALESCE(NULLIF(pg.languages, ''), '["es","en","fr","pt"]')::jsonb ? $${paramIndex++}`;
    params.push(language);
  }

  sql += ` ORDER BY pg.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(Number(limit), Number(offset));

  try {
    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /pvp-groups/:id - detail with members and their teams
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  const { id } = req.params;

  try {
    const groupResult = await db.query(`
      SELECT 
        pg.*,
        c.name as leader_name, c.class_id as leader_class_id,
        cl.icon_path as leader_class_icon, cl.name_es as leader_class_name,
        u.username as leader_username, u.avatar as leader_avatar, u.id as leader_user_id
      FROM pvp_groups pg
      JOIN characters c ON pg.leader_char_id = c.id
      JOIN classes cl ON c.class_id = cl.id
      JOIN users u ON c.user_id = u.id
      WHERE pg.id = $1
    `, [id]);

    if (groupResult.rows.length === 0) {
      res.status(404).json({ error: 'Grupo PVP no encontrado' }); return;
    }

    const membersResult = await db.query(`
      SELECT 
        pgm.id as membership_id, pgm.joined_at, pgm.team,
        c.id as char_id, c.name as char_name, c.level,
        cl.id as class_id, cl.name_es as class_name, cl.icon_path as class_icon,
        u.id as user_id, u.username, u.avatar
      FROM pvp_group_members pgm
      JOIN characters c ON pgm.character_id = c.id
      JOIN classes cl ON c.class_id = cl.id
      JOIN users u ON c.user_id = u.id
      WHERE pgm.pvp_group_id = $1
      ORDER BY pgm.joined_at ASC
    `, [id]);

    res.json({ ...groupResult.rows[0], members: membersResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /pvp-groups/:id/messages
router.get('/:id/messages', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  try {
    const isMember = await isPvpGroupMember(req.params.id, req.user!.userId);
    if (!isMember) {
      res.status(403).json({ error: 'No eres miembro de este grupo' });
      return;
    }

    const result = await db.query(`
      SELECT cm.id, cm.content, cm.created_at,
        u.id as user_id, u.discord_id, u.username, u.avatar
      FROM chat_messages cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.pvp_group_id = $1
      ORDER BY cm.created_at ASC
      LIMIT 100
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /pvp-groups - create
router.post('/',
  requireAuth,
  [
    body('title').trim().isLength({ min: 1, max: 100 }).escape(),
    body('leader_char_id').isUUID(),
    body('pvp_mode').isIn(VALID_PVP_MODES),
    body('equipment_band').isInt(),
    body('languages').isArray({ min: 1 }),
    body('languages.*').isIn(VALID_GROUP_LANGUAGES),
    body('server').isIn(VALID_SERVERS),
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    const db = getDb();
    const { title, leader_char_id, pvp_mode, equipment_band, languages = VALID_GROUP_LANGUAGES, server } = req.body;

    if (!VALID_BANDS.includes(Number(equipment_band))) {
      res.status(400).json({ error: 'Franja de equipamiento inválida' }); return;
    }

    try {
      const charResult = await db.query(
        'SELECT * FROM characters WHERE id = $1 AND user_id = $2',
        [leader_char_id, req.user!.userId]
      );
      if (charResult.rows.length === 0) {
        res.status(400).json({ error: 'Personaje líder inválido' }); return;
      }

      const id = uuidv4();
      const normalizedLanguages = Array.from(new Set((languages || []).filter((entry: string) => VALID_GROUP_LANGUAGES.includes(entry))));
      await db.query(`
        INSERT INTO pvp_groups (id, title, leader_char_id, pvp_mode, equipment_band, languages, server)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [id, title, leader_char_id, pvp_mode, Number(equipment_band), JSON.stringify(normalizedLanguages.length > 0 ? normalizedLanguages : VALID_GROUP_LANGUAGES), server]);
      await touchPvpGroupActivity(db, id);

      const newGroup = await db.query('SELECT * FROM pvp_groups WHERE id = $1', [id]);
      res.status(201).json(newGroup.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  }
);

// DELETE /pvp-groups/:id - delete group (leader only)
router.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  const { id } = req.params;
  try {
    const groupResult = await db.query(`
      SELECT pg.id FROM pvp_groups pg
      JOIN characters c ON pg.leader_char_id = c.id
      WHERE pg.id = $1 AND c.user_id = $2
    `, [id, req.user!.userId]);

    if (groupResult.rows.length === 0) {
      res.status(404).json({ error: 'Grupo no encontrado o permisos insuficientes' });
      return;
    }

    await db.query('DELETE FROM pvp_groups WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PATCH /pvp-groups/:id/member-team - change a member's team (leader only, or the member themselves)
router.patch('/:id/member-team',
  requireAuth,
  [
    body('character_id').isUUID(),
    body('team').isIn(VALID_TEAMS),
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    const db = getDb();
    const { id } = req.params;
    const { character_id, team } = req.body;

    try {
      // Check the requester is either the group leader or owns the character
      const authCheck = await db.query(`
        SELECT 1 FROM pvp_groups pg
        JOIN characters c ON pg.leader_char_id = c.id
        WHERE pg.id = $1 AND c.user_id = $2
        UNION
        SELECT 1 FROM characters c2
        WHERE c2.id = $3 AND c2.user_id = $4
      `, [id, req.user!.userId, character_id, req.user!.userId]);

      if (authCheck.rows.length === 0) {
        res.status(403).json({ error: 'Sin permisos' }); return;
      }

      // Check character is in this group
      const memberCheck = await db.query(
        'SELECT id FROM pvp_group_members WHERE pvp_group_id = $1 AND character_id = $2',
        [id, character_id]
      );

      // If it's the leader's char, update the pvp_groups table (leader team field)
      const leaderCheck = await db.query(
        'SELECT leader_char_id FROM pvp_groups WHERE id = $1',
        [id]
      );
      const isLeaderChar = leaderCheck.rows[0]?.leader_char_id === character_id;

      if (!isLeaderChar && memberCheck.rows.length === 0) {
        res.status(404).json({ error: 'Miembro no encontrado en este grupo' }); return;
      }

      if (isLeaderChar) {
        // Store leader team in pvp_groups
        await db.query(
          'UPDATE pvp_groups SET leader_team = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [team, id]
        );
      } else {
        await db.query(
          'UPDATE pvp_group_members SET team = $1 WHERE pvp_group_id = $2 AND character_id = $3',
          [team, id, character_id]
        );
      }

      // Return updated group
      const updatedMembers = await db.query(`
        SELECT pgm.id as membership_id, pgm.team, c.id as char_id, c.name as char_name,
          cl.name_es as class_name, cl.icon_path as class_icon, u.id as user_id, u.username
        FROM pvp_group_members pgm
        JOIN characters c ON pgm.character_id = c.id
        JOIN classes cl ON c.class_id = cl.id
        JOIN users u ON c.user_id = u.id
        WHERE pgm.pvp_group_id = $1
      `, [id]);

      res.json({ ok: true, members: updatedMembers.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  }
);

// PATCH /pvp-groups/:id/close
router.patch('/:id/close', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  const { id } = req.params;
  try {
    const groupResult = await db.query(`
      SELECT pg.* FROM pvp_groups pg
      JOIN characters c ON pg.leader_char_id = c.id
      WHERE pg.id = $1 AND c.user_id = $2
    `, [id, req.user!.userId]);

    if (groupResult.rows.length === 0) {
      res.status(404).json({ error: 'Grupo no encontrado o permisos insuficientes' }); return;
    }

    await db.query("UPDATE pvp_groups SET status = 'closed', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /pvp-groups/:id/keep-alive - leader confirms the match is still active
router.post('/:id/keep-alive', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  const ok = await acknowledgeGroupKeepAlive(db, 'pvp', req.params.id, req.user!.userId);
  if (!ok) {
    res.status(404).json({ error: 'Grupo no encontrado o permisos insuficientes' });
    return;
  }
  res.json({ ok: true });
});

// DELETE /pvp-groups/:id/members/:characterId - member leaves or leader kicks
router.delete('/:id/members/:characterId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  const { id, characterId } = req.params;
  
  try {
    // Get the user's character IDs
    const userChars = await db.query('SELECT id FROM characters WHERE user_id = $1', [req.user!.userId]);
    const userCharIds = userChars.rows.map((c: any) => c.id);
    
    // Get group info
    const groupResult = await db.query('SELECT * FROM pvp_groups WHERE id = $1', [id]);
    if (groupResult.rows.length === 0) {
      res.status(404).json({ error: 'Grupo no encontrado' });
      return;
    }
    const group = groupResult.rows[0];
    
    // Check if user is the leader or the member leaving
    const isLeader = group.leader_char_id === userCharIds[0];
    const isMemberLeaving = userCharIds.includes(characterId);
    
    // Leader can kick any member, member can leave their own group
    if (!isLeader && !isMemberLeaving) {
      res.status(403).json({ error: 'No tienes permisos para esta acción' });
      return;
    }
    
    // Can't kick the leader
    if (characterId === group.leader_char_id) {
      res.status(400).json({ error: 'No puedes expulsar al líder' });
      return;
    }
    
    // Delete the member
    await db.query('DELETE FROM pvp_group_members WHERE pvp_group_id = $1 AND character_id = $2', [id, characterId]);
    
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /pvp-groups/:id/leader - leader leaves and transfers leadership
router.delete('/:id/leader', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  const { id } = req.params;
  
  try {
    const userChars = await db.query('SELECT id FROM characters WHERE user_id = $1', [req.user!.userId]);
    const userCharIds = userChars.rows.map((c: any) => c.id);
    
    const groupResult = await db.query('SELECT * FROM pvp_groups WHERE id = $1', [id]);
    if (groupResult.rows.length === 0) {
      res.status(404).json({ error: 'Grupo no encontrado' });
      return;
    }
    const group = groupResult.rows[0];
    
    if (!userCharIds.includes(group.leader_char_id)) {
      res.status(403).json({ error: 'No eres el líder del grupo' });
      return;
    }
    
    const membersResult = await db.query('SELECT character_id FROM pvp_group_members WHERE pvp_group_id = $1 ORDER BY joined_at ASC', [id]);
    
    if (membersResult.rows.length > 0) {
      const newLeaderCharId = membersResult.rows[0].character_id;
      const newLeaderChar = await db.query('SELECT c.name, c.user_id FROM characters c WHERE c.id = $1', [newLeaderCharId]);
      
      await db.query('UPDATE pvp_groups SET leader_char_id = $1, leader_name = $2, leader_user_id = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4', 
        [newLeaderCharId, newLeaderChar.rows[0].name, newLeaderChar.rows[0].user_id, id]);
      
      await db.query('DELETE FROM pvp_group_members WHERE pvp_group_id = $1 AND character_id = $2', [id, group.leader_char_id]);
    } else {
      await db.query("UPDATE pvp_groups SET status = 'closed', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);
    }
    
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT /pvp-groups/:id/transfer-leadership - transfer leadership to a member
router.put('/:id/transfer-leadership', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  const { id } = req.params;
  const { new_leader_character_id } = req.body;
  
  if (!new_leader_character_id) {
    res.status(400).json({ error: 'ID de personaje requerido' });
    return;
  }
  
  try {
    const userChars = await db.query('SELECT id FROM characters WHERE user_id = $1', [req.user!.userId]);
    const userCharIds = userChars.rows.map((c: any) => c.id);
    
    const groupResult = await db.query('SELECT * FROM pvp_groups WHERE id = $1', [id]);
    if (groupResult.rows.length === 0) {
      res.status(404).json({ error: 'Grupo no encontrado' });
      return;
    }
    const group = groupResult.rows[0];
    
    if (!userCharIds.includes(group.leader_char_id)) {
      res.status(403).json({ error: 'No eres el líder del grupo' });
      return;
    }
    
    const memberCheck = await db.query('SELECT character_id FROM pvp_group_members WHERE pvp_group_id = $1 AND character_id = $2', [id, new_leader_character_id]);
    if (memberCheck.rows.length === 0) {
      res.status(400).json({ error: 'El personaje no es miembro del grupo' });
      return;
    }
    
    const newLeaderChar = await db.query('SELECT c.name, c.user_id FROM characters c WHERE c.id = $1', [new_leader_character_id]);
    
    await db.query('UPDATE pvp_groups SET leader_char_id = $1, leader_name = $2, leader_user_id = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4', 
      [new_leader_character_id, newLeaderChar.rows[0].name, newLeaderChar.rows[0].user_id, id]);
    
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
