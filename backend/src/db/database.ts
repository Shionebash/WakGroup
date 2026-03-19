import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

let pool: Pool;

export function getDb(): Pool {
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            console.error('Error: DATABASE_URL is not defined in .env');
            console.error('Expected format: DATABASE_URL=postgresql://user:password@localhost:5432/wakfu_lfg');
            process.exit(1);
        }
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }
    return pool;
}

export async function initDb() {
    const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
    const mazmosPath = path.join(process.cwd(), 'data', 'mazmos.json');

    try {
        const db = getDb();
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        await db.query(schema);
        await syncDungeonCapacities(db, mazmosPath);
        await syncGroupStatuses(db);
        console.log('Database schema initialized successfully (PostgreSQL)');
    } catch (err: any) {
        console.error('Error initializing database schema:');
        if (err.code === 'ECONNREFUSED') {
            console.error(`   Failed to connect to database at ${err.address}:${err.port}`);
            console.error('   Please ensure PostgreSQL is running and the connection string in .env is correct.');
        } else {
            console.error('   ', err.message || err);
        }
        throw err;
    }
}

async function syncDungeonCapacities(db: Pool, mazmosPath: string) {
    if (!fs.existsSync(mazmosPath)) {
        return;
    }

    const rawMazmos = fs.readFileSync(mazmosPath, 'utf-8');
    const mazmos = JSON.parse(rawMazmos);
    const capacityRows = Array.isArray(mazmos)
        ? mazmos
            .map((dungeon: any) => ({
                id: Number(dungeon?.id),
                players: Number(dungeon?.players),
            }))
            .filter((dungeon: { id: number; players: number }) => Number.isInteger(dungeon.id) && Number.isInteger(dungeon.players) && dungeon.players > 0)
        : [];

    if (capacityRows.length === 0) {
        return;
    }

    const values: number[] = [];
    const placeholders = capacityRows
        .map((dungeon: { id: number; players: number }, index: number) => {
            const offset = index * 2;
            values.push(dungeon.id, dungeon.players);
            return `($${offset + 1}, $${offset + 2})`;
        })
        .join(', ');

    await db.query(`
        UPDATE dungeons AS d
        SET max_players = src.max_players::integer
        FROM (VALUES ${placeholders}) AS src(id, max_players)
        WHERE d.id = src.id::integer
          AND d.max_players IS DISTINCT FROM src.max_players::integer
    `, values);
}

async function syncGroupStatuses(db: Pool) {
    await db.query(`
        UPDATE groups
        SET status = CASE
                WHEN (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = groups.id) + 1 >= d.max_players THEN 'full'
                ELSE 'open'
            END,
            updated_at = CURRENT_TIMESTAMP
        FROM dungeons d
        WHERE groups.dungeon_id = d.id
          AND groups.status IN ('open', 'full')
          AND groups.status IS DISTINCT FROM CASE
                WHEN (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = groups.id) + 1 >= d.max_players THEN 'full'
                ELSE 'open'
            END
    `);
}

export default getDb;