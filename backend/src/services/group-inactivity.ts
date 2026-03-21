import { Pool } from 'pg';
import { Server as SocketServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { emitNotification } from '../socket/chat.js';

const WARNING_INTERVAL_SQL = "INTERVAL '1 hour'";
const CLOSE_INTERVAL_SQL = "INTERVAL '30 minutes'";
const CHECK_INTERVAL_MS = 60_000;

type GroupType = 'dungeon' | 'pvp';

type PromptRow = {
    id: string;
    leader_user_id: string;
    group_title: string;
};

type ClosedRow = PromptRow;

async function createNotification(
    db: Pool,
    io: SocketServer | null,
    userId: string,
    type: string,
    payload: Record<string, unknown>
) {
    const id = uuidv4();
    await db.query(
        'INSERT INTO notifications (id, user_id, type, payload) VALUES ($1, $2, $3, $4)',
        [id, userId, type, JSON.stringify(payload)]
    );

    if (io) {
        emitNotification(io, userId, 'notification', {
            id,
            type,
            ...payload,
        });
    }
}

async function getDungeonGroupUsers(db: Pool, groupId: string): Promise<string[]> {
    const result = await db.query(`
        SELECT DISTINCT c.user_id
        FROM groups g
        JOIN characters c ON g.leader_char_id = c.id
        WHERE g.id = $1
        UNION
        SELECT DISTINCT c.user_id
        FROM group_members gm
        JOIN characters c ON gm.character_id = c.id
        WHERE gm.group_id = $1
    `, [groupId]);

    return result.rows.map((row: { user_id: string }) => row.user_id);
}

async function getPvpGroupUsers(db: Pool, groupId: string): Promise<string[]> {
    const result = await db.query(`
        SELECT DISTINCT c.user_id
        FROM pvp_groups pg
        JOIN characters c ON pg.leader_char_id = c.id
        WHERE pg.id = $1
        UNION
        SELECT DISTINCT c.user_id
        FROM pvp_group_members pgm
        JOIN characters c ON pgm.character_id = c.id
        WHERE pgm.pvp_group_id = $1
    `, [groupId]);

    return result.rows.map((row: { user_id: string }) => row.user_id);
}

async function warnInactiveDungeonGroups(db: Pool, io: SocketServer | null) {
    const result = await db.query(`
        WITH candidates AS (
            SELECT
                g.id,
                c.user_id AS leader_user_id,
                COALESCE(NULLIF(g.title, ''), d.name_es, 'Grupo') AS group_title
            FROM groups g
            JOIN characters c ON g.leader_char_id = c.id
            LEFT JOIN dungeons d ON d.id = g.dungeon_id
            WHERE g.status IN ('open', 'full')
              AND g.inactivity_prompt_sent_at IS NULL
              AND COALESCE(g.last_activity_at, g.created_at) <= CURRENT_TIMESTAMP - ${WARNING_INTERVAL_SQL}
        )
        UPDATE groups g
        SET inactivity_prompt_sent_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        FROM candidates
        WHERE g.id = candidates.id
        RETURNING g.id, candidates.leader_user_id, candidates.group_title
    `);

    for (const row of result.rows as PromptRow[]) {
        await createNotification(db, io, row.leader_user_id, 'group_inactivity_prompt', {
            group_id: row.id,
            group_type: 'dungeon',
            group_title: row.group_title,
            preview: `Tu grupo "${row.group_title}" lleva 1 hora sin actividad. ¿Sigues buscando grupo?`,
            action_required: true,
            action: 'keep_alive',
        });
    }
}

async function warnInactivePvpGroups(db: Pool, io: SocketServer | null) {
    const result = await db.query(`
        UPDATE pvp_groups pg
        SET inactivity_prompt_sent_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        FROM characters c
        WHERE pg.leader_char_id = c.id
          AND pg.status IN ('open', 'full')
          AND pg.inactivity_prompt_sent_at IS NULL
          AND COALESCE(pg.last_activity_at, pg.created_at) <= CURRENT_TIMESTAMP - ${WARNING_INTERVAL_SQL}
        RETURNING pg.id, c.user_id AS leader_user_id, COALESCE(NULLIF(pg.title, ''), 'Grupo PVP') AS group_title
    `);

    for (const row of result.rows as PromptRow[]) {
        await createNotification(db, io, row.leader_user_id, 'group_inactivity_prompt', {
            group_id: row.id,
            group_type: 'pvp',
            group_title: row.group_title,
            preview: `Tu enfrentamiento "${row.group_title}" lleva 1 hora sin actividad. ¿Sigues buscando grupo?`,
            action_required: true,
            action: 'keep_alive',
        });
    }
}

async function closeInactiveDungeonGroups(db: Pool, io: SocketServer | null) {
    const result = await db.query(`
        WITH candidates AS (
            SELECT
                g.id,
                c.user_id AS leader_user_id,
                COALESCE(NULLIF(g.title, ''), d.name_es, 'Grupo') AS group_title
            FROM groups g
            JOIN characters c ON g.leader_char_id = c.id
            LEFT JOIN dungeons d ON d.id = g.dungeon_id
            WHERE g.status IN ('open', 'full')
              AND g.inactivity_prompt_sent_at IS NOT NULL
              AND g.inactivity_prompt_sent_at <= CURRENT_TIMESTAMP - ${CLOSE_INTERVAL_SQL}
        )
        UPDATE groups g
        SET status = 'closed',
            updated_at = CURRENT_TIMESTAMP
        FROM candidates
        WHERE g.id = candidates.id
        RETURNING g.id, candidates.leader_user_id, candidates.group_title
    `);

    for (const row of result.rows as ClosedRow[]) {
        const users = await getDungeonGroupUsers(db, row.id);
        for (const userId of users) {
            await createNotification(db, io, userId, 'group_inactivity_closed', {
                group_id: row.id,
                group_type: 'dungeon',
                group_title: row.group_title,
                preview: `El grupo "${row.group_title}" se cerró automáticamente por inactividad.`,
            });
        }
    }
}

async function closeInactivePvpGroups(db: Pool, io: SocketServer | null) {
    const result = await db.query(`
        UPDATE pvp_groups pg
        SET status = 'closed',
            updated_at = CURRENT_TIMESTAMP
        FROM characters c
        WHERE pg.leader_char_id = c.id
          AND pg.status IN ('open', 'full')
          AND pg.inactivity_prompt_sent_at IS NOT NULL
          AND pg.inactivity_prompt_sent_at <= CURRENT_TIMESTAMP - ${CLOSE_INTERVAL_SQL}
        RETURNING pg.id, c.user_id AS leader_user_id, COALESCE(NULLIF(pg.title, ''), 'Grupo PVP') AS group_title
    `);

    for (const row of result.rows as ClosedRow[]) {
        const users = await getPvpGroupUsers(db, row.id);
        for (const userId of users) {
            await createNotification(db, io, userId, 'group_inactivity_closed', {
                group_id: row.id,
                group_type: 'pvp',
                group_title: row.group_title,
                preview: `El enfrentamiento "${row.group_title}" se cerró automáticamente por inactividad.`,
            });
        }
    }
}

export async function touchDungeonGroupActivity(db: Pool, groupId: string) {
    await db.query(`
        UPDATE groups
        SET last_activity_at = CURRENT_TIMESTAMP,
            inactivity_prompt_sent_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
    `, [groupId]);
}

export async function touchPvpGroupActivity(db: Pool, groupId: string) {
    await db.query(`
        UPDATE pvp_groups
        SET last_activity_at = CURRENT_TIMESTAMP,
            inactivity_prompt_sent_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
    `, [groupId]);
}

export async function acknowledgeGroupKeepAlive(db: Pool, groupType: GroupType, groupId: string, userId: string): Promise<boolean> {
    const isDungeon = groupType === 'dungeon';
    const table = isDungeon ? 'groups' : 'pvp_groups';

    const result = await db.query(`
        UPDATE ${table} target
        SET last_activity_at = CURRENT_TIMESTAMP,
            inactivity_prompt_sent_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        FROM characters c
        WHERE target.id = $1
          AND target.leader_char_id = c.id
          AND c.user_id = $2
        RETURNING target.id
    `, [groupId, userId]);

    if (result.rows.length === 0) {
        return false;
    }

    await db.query(`
        UPDATE notifications
        SET is_read = true
        WHERE user_id = $1
          AND type = 'group_inactivity_prompt'
          AND payload::jsonb @> $2::jsonb
    `, [userId, JSON.stringify({ group_id: groupId, group_type: groupType })]);

    return true;
}

export async function processInactiveGroups(db: Pool, io: SocketServer | null) {
    await warnInactiveDungeonGroups(db, io);
    await warnInactivePvpGroups(db, io);
    await closeInactiveDungeonGroups(db, io);
    await closeInactivePvpGroups(db, io);
}

export function startGroupInactivityMonitor(db: Pool, io: SocketServer | null) {
    let running = false;

    const tick = async () => {
        if (running) return;
        running = true;
        try {
            await processInactiveGroups(db, io);
        } catch (error) {
            console.error('Group inactivity monitor error:', error);
        } finally {
            running = false;
        }
    };

    void tick();
    return setInterval(() => { void tick(); }, CHECK_INTERVAL_MS);
}
