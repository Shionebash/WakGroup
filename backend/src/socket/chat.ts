import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';
import { JwtPayload } from '../types/index.js';
import { touchDungeonGroupActivity, touchPvpGroupActivity } from '../services/group-inactivity.js';

// In-memory map of userId -> socket ids
const userSockets = new Map<string, string>();
let latestDesktopUpdatePayload: Record<string, unknown> | null = null;

async function isDungeonGroupMember(groupId: string, userId: string): Promise<boolean> {
    const db = getDb();
    const result = await db.query(`
        SELECT 1 FROM group_members gm
        JOIN characters c ON gm.character_id = c.id
        WHERE gm.group_id = $1 AND c.user_id = $2
        UNION
        SELECT 1 FROM groups g
        JOIN characters c ON g.leader_char_id = c.id
        WHERE g.id = $3 AND c.user_id = $4
    `, [groupId, userId, groupId, userId]);
    return result.rows.length > 0;
}

async function isPvpGroupMember(groupId: string, userId: string): Promise<boolean> {
    const db = getDb();
    const result = await db.query(`
        SELECT 1 FROM pvp_group_members pgm
        JOIN characters c ON pgm.character_id = c.id
        WHERE pgm.pvp_group_id = $1 AND c.user_id = $2
        UNION
        SELECT 1 FROM pvp_groups pg
        JOIN characters c ON pg.leader_char_id = c.id
        WHERE pg.id = $3 AND c.user_id = $4
    `, [groupId, userId, groupId, userId]);
    return result.rows.length > 0;
}

async function resolveGroupType(groupId: string): Promise<'dungeon' | 'pvp' | null> {
    const db = getDb();
    const dungeonRes = await db.query('SELECT id FROM groups WHERE id = $1', [groupId]);
    if (dungeonRes.rows.length > 0) return 'dungeon';
    const pvpRes = await db.query('SELECT id FROM pvp_groups WHERE id = $1', [groupId]);
    if (pvpRes.rows.length > 0) return 'pvp';
    return null;
}

export function initSocket(server: HttpServer): SocketServer {
    const io = new SocketServer(server, {
        cors: { origin: true, credentials: true },
    });

    io.of('/updates').on('connection', (socket) => {
        socket.emit('desktop_update_channel_ready', {
            ok: true,
            time: new Date().toISOString(),
        });

        if (latestDesktopUpdatePayload) {
            socket.emit('desktop_update_available', {
                ...latestDesktopUpdatePayload,
                replayed: true,
            });
        }
    });

    io.use((socket, next) => {
        try {
            let token: string | undefined;

            const authHeader = socket.handshake.headers.authorization;
            if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7);

            if (!token) {
                const cookie = socket.handshake.headers.cookie || '';
                const tokenMatch = cookie.match(/session=([^;]+)/);
                if (tokenMatch) token = tokenMatch[1];
            }

            if (!token && socket.handshake.auth?.token) token = socket.handshake.auth.token;
            if (!token) return next(new Error('No autenticado'));

            const payload = jwt.verify(token, process.env.JWT_SECRET || 'change_this_secret') as JwtPayload;
            socket.data.user = payload;
            next();
        } catch {
            next(new Error('Sesion invalida'));
        }
    });

    io.on('connection', (socket) => {
        const user = socket.data.user as JwtPayload;
        userSockets.set(user.userId, socket.id);
        console.log(`Socket connected: ${user.username}`);

        // Join group room — works for dungeon and PVP groups
        socket.on('join_group', async (groupId: string) => {
            if (typeof groupId !== 'string' || groupId.length > 36) return;
            try {
                const groupType = await resolveGroupType(groupId);
                if (!groupType) { socket.emit('error', 'Grupo no encontrado'); return; }

                const isMember = groupType === 'dungeon'
                    ? await isDungeonGroupMember(groupId, user.userId)
                    : await isPvpGroupMember(groupId, user.userId);

                if (!isMember) { socket.emit('error', 'No eres miembro de este grupo'); return; }

                socket.join(`group:${groupId}`);
                socket.emit('joined_group', groupId);
            } catch (err) {
                console.error('Socket join_group error:', err);
            }
        });

        // Send message — works for dungeon and PVP groups
        socket.on('send_message', async ({ groupId, content }: { groupId: string; content: string }) => {
            if (typeof groupId !== 'string' || typeof content !== 'string') return;

            const cleaned = content.replace(/<[^>]*>/g, '').trim().slice(0, 500);
            if (!cleaned) return;

            const db = getDb();
            try {
                const groupType = await resolveGroupType(groupId);
                if (!groupType) return;

                const isMember = groupType === 'dungeon'
                    ? await isDungeonGroupMember(groupId, user.userId)
                    : await isPvpGroupMember(groupId, user.userId);

                if (!isMember) return;

                const msgId = uuidv4();

                if (groupType === 'dungeon') {
                    await db.query(
                        'INSERT INTO chat_messages (id, group_id, user_id, content) VALUES ($1, $2, $3, $4)',
                        [msgId, groupId, user.userId, cleaned]
                    );
                    await touchDungeonGroupActivity(db, groupId);
                } else {
                    await db.query(
                        'INSERT INTO chat_messages (id, pvp_group_id, user_id, content) VALUES ($1, $2, $3, $4)',
                        [msgId, groupId, user.userId, cleaned]
                    );
                    await touchPvpGroupActivity(db, groupId);
                }

                const dbUserResult = await db.query(
                    'SELECT username, avatar, discord_id FROM users WHERE id = $1',
                    [user.userId]
                );
                const dbUser = dbUserResult.rows[0];

                const message = {
                    id: msgId,
                    group_id: groupId,
                    user_id: user.userId,
                    discord_id: dbUser.discord_id,
                    username: dbUser.username,
                    avatar: dbUser.avatar,
                    content: cleaned,
                    created_at: Math.floor(Date.now() / 1000),
                };

                io.to(`group:${groupId}`).emit('new_message', message);

                // Notifications for other members
                const membersQuery = groupType === 'dungeon' ? `
                    SELECT DISTINCT c.user_id FROM group_members gm
                    JOIN characters c ON gm.character_id = c.id
                    WHERE gm.group_id = $1 AND c.user_id != $2
                    UNION
                    SELECT c.user_id FROM groups g
                    JOIN characters c ON g.leader_char_id = c.id
                    WHERE g.id = $3 AND c.user_id != $4
                ` : `
                    SELECT DISTINCT c.user_id FROM pvp_group_members pgm
                    JOIN characters c ON pgm.character_id = c.id
                    WHERE pgm.pvp_group_id = $1 AND c.user_id != $2
                    UNION
                    SELECT c.user_id FROM pvp_groups pg
                    JOIN characters c ON pg.leader_char_id = c.id
                    WHERE pg.id = $3 AND c.user_id != $4
                `;

                const membersResult = await db.query(membersQuery, [groupId, user.userId, groupId, user.userId]);

                for (const member of membersResult.rows as { user_id: string }[]) {
                    const notifId = uuidv4();
                    await db.query(
                        "INSERT INTO notifications (id, user_id, type, payload) VALUES ($1, $2, 'group_message', $3)",
                        [notifId, member.user_id, JSON.stringify({
                            group_id: groupId,
                            group_type: groupType,
                            from_username: dbUser.username,
                            preview: cleaned.slice(0, 80),
                        })]
                    );
                    const memberSocketId = userSockets.get(member.user_id);
                    if (memberSocketId) {
                        io.to(memberSocketId).emit('notification', {
                            type: 'group_message',
                            groupId,
                            groupType,
                            fromUsername: dbUser.username,
                            preview: cleaned.slice(0, 80),
                        });
                    }
                }
            } catch (err) {
                console.error('Socket send_message error:', err);
            }
        });

        socket.on('leave_group', (groupId: string) => {
            socket.leave(`group:${groupId}`);
        });

        socket.on('disconnect', () => {
            userSockets.delete(user.userId);
        });
    });

    return io;
}

export function emitNotification(io: SocketServer, userId: string, event: string, data: unknown): void {
    const socketId = userSockets.get(userId);
    if (socketId) io.to(socketId).emit(event, data);
}

export function broadcastDesktopUpdate(io: SocketServer, data: Record<string, unknown> = {}): void {
    latestDesktopUpdatePayload = {
        issuedAt: new Date().toISOString(),
        ...data,
    };

    io.of('/updates').emit('desktop_update_available', latestDesktopUpdatePayload);
}

export function getDesktopUpdateSubscriberCount(io: SocketServer): number {
    return io.of('/updates').sockets.size;
}
