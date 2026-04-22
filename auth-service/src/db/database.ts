import { Pool } from 'pg';

let pool: Pool;

export function getDb(): Pool {
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            console.error('Error: DATABASE_URL is not defined in .env');
            process.exit(1);
        }

        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }

    return pool;
}

export async function checkDbConnection() {
    const db = getDb();
    await db.query('SELECT 1');
}

export default getDb;
