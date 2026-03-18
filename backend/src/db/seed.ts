import 'dotenv/config';
import { getDb } from './database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Paths to JSON data
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLASES_PATH = path.resolve(__dirname, '../../data/clases.json');
const MAZMOS_PATH = path.resolve(__dirname, '../../data/mazmos.json');

// Interface for classes JSON
interface ClassData {
    id: number;
    names: {
        en: string;
        es: string;
    };
    assets: {
        icon: string;
    };
}

// Interface for dungeons JSON
interface DungeonData {
    id: number;
    name: {
        en: string;
        es: string;
    };
    modulated: number;
    players: number;
    image: string;
    isDungeon: boolean;
}

export async function seedDatabase(): Promise<void> {
    const db = getDb();

    console.log('🌱 Iniciando seed de base de datos...');

    try {
        // Load data from files
        console.log('📖 Cargando archivos JSON...');
        const classesData: ClassData[] = JSON.parse(fs.readFileSync(CLASES_PATH, 'utf-8'));
        const mazmosData: DungeonData[] = JSON.parse(fs.readFileSync(MAZMOS_PATH, 'utf-8'));

        // Seed classes
        console.log(`⏳ Insertando ${classesData.length} clases...`);
        for (const cls of classesData) {
            await db.query(`
                INSERT INTO classes (id, name_es, name_en, icon_path, color)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT(id) DO UPDATE SET
                    name_es = EXCLUDED.name_es,
                    name_en = EXCLUDED.name_en,
                    icon_path = EXCLUDED.icon_path
            `, [cls.id, cls.names.es, cls.names.en, cls.assets.icon, '#777777']);
        }
        console.log(`✅ ${classesData.length} clases sincronizadas`);

        // Seed dungeons
        console.log(`⏳ Insertando ${mazmosData.length} mazmorras...`);
        for (const dungeon of mazmosData) {
            // Only seed items marked as isDungeon
            if (!dungeon.isDungeon) continue;

            await db.query(`
                INSERT INTO dungeons (id, name_es, name_en, description, image_path, modulated, max_players, min_stasis, max_stasis)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT(id) DO UPDATE SET
                    name_es = EXCLUDED.name_es,
                    name_en = EXCLUDED.name_en,
                    image_path = EXCLUDED.image_path,
                    modulated = EXCLUDED.modulated,
                    max_players = EXCLUDED.max_players
            `, [
                dungeon.id, 
                dungeon.name.es, 
                dungeon.name.en, 
                'Guía de mazmorra', 
                dungeon.image, 
                dungeon.modulated, 
                dungeon.players, 
                1, 
                10
            ]);
        }
        console.log(`✅ Mazmorras sincronizadas`);

        console.log('✅ Seed completado exitosamente!');
    } catch (error) {
        console.error('❌ Error en seed:', error);
        process.exit(1);
    }
}

// Run seed if this script is executed directly
const isDirectRun = import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/')) || 
                    import.meta.url.includes(process.argv[1].replace(/\\/g, '/'));

if (isDirectRun) {
    seedDatabase()
        .then(() => {
            console.log('🏁 Seed process finished.');
            process.exit(0);
        })
        .catch(err => {
            console.error('❌ Fatal error in seed:', err);
            process.exit(1);
        });
}
