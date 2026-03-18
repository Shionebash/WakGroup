import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

let pool: Pool;

export function getDb(): Pool {
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            console.error('❌ Error: DATABASE_URL is not defined in .env');
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

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initDb() {
    const SCHEMA_PATH = path.join(process.cwd(), 'src', 'db', 'schema.sql');
    try {
        const db = getDb();
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
        await db.query(schema);
        console.log('✅ Database schema initialized successfully (PostgreSQL)');
    } catch (err: any) {
        console.error('❌ Error initializing database schema:');
        if (err.code === 'ECONNREFUSED') {
            console.error(`   Failed to connect to database at ${err.address}:${err.port}`);
            console.error('   Please ensure PostgreSQL is running and the connection string in .env is correct.');
        } else {
            console.error('   ', err.message || err);
        }
        // Don't exit process here so index.ts can catch it if needed, 
        // but we've already logged a friendly message
        throw err;
    }
}

export default getDb;
