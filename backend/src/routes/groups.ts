import { Router, Request, Response } from 'express';
import { body, query } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { DungeonGroup } from '../types/index.js';
import { acknowledgeGroupKeepAlive, touchDungeonGroupActivity } from '../services/group-inactivity.js';

const router = Router();

const VALID_SERVERS = ['Ogrest', 'Rubilax', 'Pandora'];
const VALID_GROUP_LANGUAGES = ['es', 'en', 'fr', 'pt'];

async function isGroupMember(groupId: string, userId: string): Promise<boolean> {
  const db = getDb();
  const result = await db.query(`
    SELECT 1
    FROM group_members gm
    JOIN characters c ON gm.character_id = c.id
    WHERE gm.group_id = $1 AND c.user_id = $2
    UNION
    SELECT 1
    FROM groups g
    JOIN characters c ON g.leader_char_id = c.id
    WHERE g.id = $3 AND c.user_id = $4
  `, [groupId, userId, groupId, userId]);

  return result.rows.length > 0;
}

// GET /groups - list with filters
router.get('/', async (req: Request, res: Response) => {
  const db = getDb();
  const { dungeon_id, server, stasis, min_lvl, language, limit = '20', offset = '0' } = req.query;

  let sql = `
    SELECT 
      g.*,
      d.name_es as dungeon_name, d.image_path as dungeon_image, d.modulated as dungeon_lvl, d.max_players,
      c.name as leader_name, c.class_id as leader_class_id, c.server as leader_server,
      cl.icon_path as leader_class_icon, cl.name_es as leader_class_name,
      u.username as leader_username, u.avatar as leader_avatar, u.id as leader_user_id,
      (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) + 1 as member_count
    FROM groups g
    JOIN dungeons d ON g.dungeon_id = d.id
    JOIN characters c ON g.leader_char_id = c.id
    JOIN classes cl ON c.class_id = cl.id
    JOIN users u ON c.user_id = u.id
    WHERE g.status = 'open'
  `;
  const params: unknown[] = [];
  let paramIndex = 1;

  if (dungeon_id) { sql += ` AND g.dungeon_id = $${paramIndex++}`; params.push(dungeon_id); }
  if (server && VALID_SERVERS.includes(server as string)) { sql += ` AND g.server = $${paramIndex++}`; params.push(server); }
  if (stasis) { sql += ` AND g.stasis = $${paramIndex++}`; params.push(Number(stasis)); }
  if (min_lvl) { sql += ` AND d.modulated = $${paramIndex++}`; params.push(Number(min_lvl)); }
  if (language && VALID_GROUP_LANGUAGES.includes(language as string)) {
    sql += ` AND COALESCE(NULLIF(g.languages, ''), '["es","en","fr","pt"]')::jsonb ? $${paramIndex++}`;
    params.push(language);
  }

  sql += ` ORDER BY g.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(Number(limit), Number(offset));

  try {
    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    console.error('GET /groups error:', err.message, err.stack);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// GET /groups/:id/messages - chat history for members only
router.get('/:id/messages', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  const { id } = req.params;

  try {
    const isMember = await isGroupMember(id, req.user!.userId);
    if (!isMember) {
      res.status(403).json({ error: 'No eres miembro de este grupo' });
      return;
    }

    const result = await db.query(`
      SELECT cm.id, cm.content, cm.created_at,
             u.id as user_id, u.discord_id, u.username, u.avatar
      FROM chat_messages cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.group_id = $1
      ORDER BY cm.created_at ASC
      LIMIT 100
    `, [id]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /groups/:id - detail with members
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  const { id } = req.params;

  try {
        const groupResult = await db.query(`
            SELECT 
            g.*,
            d.name_es as dungeon_name, d.image_path as dungeon_image, d.modulated as dungeon_lvl, d.max_players,
            c.name as leader_name, c.class_id as leader_class_id,
            cl.icon_path as leader_class_icon, cl.name_es as leader_class_name,
            u.username as leader_username, u.avatar as leader_avatar, u.id as leader_user_id
            FROM groups g
            JOIN dungeons d ON g.dungeon_id = d.id
            JOIN characters c ON g.leader_char_id = c.id
            JOIN classes cl ON c.class_id = cl.id
            JOIN users u ON c.user_id = u.id
            WHERE g.id = $1
        `, [id]);

    if (groupResult.rows.length === 0) {
      res.status(404).json({ error: 'Grupo no encontrado' });
      return;
    }

    // Get members
    const membersResult = await db.query(`
            SELECT 
            gm.id as membership_id, gm.joined_at,
            c.id as char_id, c.name as char_name, c.level, c.role,
            cl.id as class_id, cl.name_es as class_name, cl.icon_path as class_icon,
            u.id as user_id, u.username, u.avatar
            FROM group_members gm
            JOIN characters c ON gm.character_id = c.id
            JOIN classes cl ON c.class_id = cl.id
            JOIN users u ON c.user_id = u.id
            WHERE gm.group_id = $1
        `, [id]);

    // Get chat messages (last 50)
    const messagesResult = await db.query(`
    SELECT cm.id, cm.content, cm.created_at, 
           u.username, u.avatar, u.id as user_id, u.discord_id
    FROM chat_messages cm
    JOIN users u ON cm.user_id = u.id
    WHERE cm.group_id = $1
    ORDER BY cm.created_at ASC
    LIMIT 50
`, [id]);

    res.json({ ...groupResult.rows[0], members: membersResult.rows, messages: messagesResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /groups - create
router.post('/',
  requireAuth,
  [
    body('title').trim().isLength({ min: 1, max: 100 }).escape(),
    body('description').optional().trim().isLength({ max: 500 }).escape(),
    body('dungeon_id').isInt(),
    body('leader_char_id').isUUID(),
    body('stasis').isInt({ min: 1, max: 10 }),
    body('steles_active').optional().isBoolean(),
    body('steles_count').optional().isInt({ min: 1, max: 10 }),
    body('intervention_active').optional().isBoolean(),
    body('steles_drops').optional().isArray(),
    body('languages').isArray({ min: 1 }),
    body('languages.*').isIn(VALID_GROUP_LANGUAGES),
    body('server').isIn(VALID_SERVERS),
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    const db = getDb();
    const {
      title,
      description,
      dungeon_id,
      leader_char_id,
      stasis,
      steles_active = false,
      steles_count = 1,
      intervention_active = false,
      steles_drops = [],
      languages = VALID_GROUP_LANGUAGES,
      server,
    } = req.body;

    try {
      // Verify leader char belongs to user
      const charResult = await db.query('SELECT * FROM characters WHERE id = $1 AND user_id = $2', [leader_char_id, req.user!.userId]);
      if (charResult.rows.length === 0) {
        res.status(400).json({ error: 'Personaje líder inválido' });
        return;
      }

      // Verify dungeon exists
      const dungeonResult = await db.query('SELECT * FROM dungeons WHERE id = $1', [dungeon_id]);
      if (dungeonResult.rows.length === 0) {
        res.status(400).json({ error: 'Mazmorra no encontrada' });
        return;
      }

      const id = uuidv4();
      const normalizedLanguages = Array.from(new Set((languages || []).filter((entry: string) => VALID_GROUP_LANGUAGES.includes(entry))));
      await db.query(`
                INSERT INTO groups (id, title, description, dungeon_id, leader_char_id, stasis, steles_active, steles_count, intervention_active, steles_drops, languages, server)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `, [id, title, description || null, dungeon_id, leader_char_id, stasis, steles_active, steles_count, intervention_active, JSON.stringify(steles_drops || []), JSON.stringify(normalizedLanguages.length > 0 ? normalizedLanguages : VALID_GROUP_LANGUAGES), server]);
      await touchDungeonGroupActivity(db, id);

      const newGroupResult = await db.query('SELECT * FROM groups WHERE id = $1', [id]);
      res.status(201).json(newGroupResult.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  }
);

// DELETE /groups/:id - delete group (leader only)
router.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  const { id } = req.params;

  try {
    const groupResult = await db.query(`
            SELECT g.id FROM groups g
            JOIN characters c ON g.leader_char_id = c.id
            WHERE g.id = $1 AND c.user_id = $2
        `, [id, req.user!.userId]);

    if (groupResult.rows.length === 0) {
      res.status(404).json({ error: 'Grupo no encontrado o permisos insuficientes' });
      return;
    }

    await db.query('DELETE FROM groups WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PATCH /groups/:id/close - close group (leader only)
router.patch('/:id/close', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  const { id } = req.params;

  try {
    const groupResult = await db.query(`
            SELECT g.* FROM groups g
            JOIN characters c ON g.leader_char_id = c.id
            WHERE g.id = $1 AND c.user_id = $2
        `, [id, req.user!.userId]);

    if (groupResult.rows.length === 0) {
      res.status(404).json({ error: 'Grupo no encontrado o permisos insuficientes' });
      return;
    }

    await db.query("UPDATE groups SET status = 'closed', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /groups/:id/keep-alive - leader confirms the group is still active
router.post('/:id/keep-alive', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  const ok = await acknowledgeGroupKeepAlive(db, 'dungeon', req.params.id, req.user!.userId);
  if (!ok) {
    res.status(404).json({ error: 'Grupo no encontrado o permisos insuficientes' });
    return;
  }
  res.json({ ok: true });
});

// DELETE /groups/:id/members/:characterId - member leaves or leader kicks
router.delete('/:id/members/:characterId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  const { id, characterId } = req.params;
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  try {
    // Get the user's character IDs
    const userChars = await db.query('SELECT id FROM characters WHERE user_id = $1', [req.user!.userId]);
    const userCharIds = userChars.rows.map((c: any) => c.id);
    
    // Get group info
    const groupResult = await db.query('SELECT * FROM groups WHERE id = $1', [id]);
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
    await db.query('DELETE FROM group_members WHERE group_id = $1 AND character_id = $2', [id, characterId]);
    
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /groups/:id/leader - leader leaves and transfers leadership
router.delete('/:id/leader', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  const { id } = req.params;
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  try {
    const userChars = await db.query('SELECT id FROM characters WHERE user_id = $1', [req.user!.userId]);
    const userCharIds = userChars.rows.map((c: any) => c.id);
    
    const groupResult = await db.query('SELECT * FROM groups WHERE id = $1', [id]);
    if (groupResult.rows.length === 0) {
      res.status(404).json({ error: 'Grupo no encontrado' });
      return;
    }
    const group = groupResult.rows[0];
    
    if (!userCharIds.includes(group.leader_char_id)) {
      res.status(403).json({ error: 'No eres el líder del grupo' });
      return;
    }
    
    const membersResult = await db.query('SELECT character_id FROM group_members WHERE group_id = $1 ORDER BY joined_at ASC', [id]);
    
    if (membersResult.rows.length > 0) {
      const newLeaderCharId = membersResult.rows[0].character_id;
      const newLeaderChar = await db.query('SELECT c.name, c.user_id FROM characters c WHERE c.id = $1', [newLeaderCharId]);
      
      await db.query('UPDATE groups SET leader_char_id = $1, leader_name = $2, leader_user_id = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4', 
        [newLeaderCharId, newLeaderChar.rows[0].name, newLeaderChar.rows[0].user_id, id]);
      
      await db.query('DELETE FROM group_members WHERE group_id = $1 AND character_id = $2', [id, group.leader_char_id]);
    } else {
      await db.query("UPDATE groups SET status = 'closed', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);
    }
    
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT /groups/:id/transfer-leadership - transfer leadership to a member
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
    
    const groupResult = await db.query('SELECT * FROM groups WHERE id = $1', [id]);
    if (groupResult.rows.length === 0) {
      res.status(404).json({ error: 'Grupo no encontrado' });
      return;
    }
    const group = groupResult.rows[0];
    
    if (!userCharIds.includes(group.leader_char_id)) {
      res.status(403).json({ error: 'No eres el líder del grupo' });
      return;
    }
    
    const memberCheck = await db.query('SELECT character_id FROM group_members WHERE group_id = $1 AND character_id = $2', [id, new_leader_character_id]);
    if (memberCheck.rows.length === 0) {
      res.status(400).json({ error: 'El personaje no es miembro del grupo' });
      return;
    }
    
    const newLeaderChar = await db.query('SELECT c.name, c.user_id FROM characters c WHERE c.id = $1', [new_leader_character_id]);
    
    await db.query('UPDATE groups SET leader_char_id = $1, leader_name = $2, leader_user_id = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4', 
      [new_leader_character_id, newLeaderChar.rows[0].name, newLeaderChar.rows[0].user_id, id]);
    
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
