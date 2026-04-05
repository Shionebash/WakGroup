import fs from 'fs/promises';
import path from 'path';

const WAKFU_CDN_BASE_URL = process.env.WAKFU_CDN_BASE_URL || 'https://wakfu.cdn.ankama.com';
const WAKFU_GAMEDATA_BASE_URL = `${WAKFU_CDN_BASE_URL}/gamedata`;
const WAKFU_CHECK_INTERVAL_MS = 60 * 60 * 1000;
const WAKFU_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const WAKFU_TYPES = [
    'actions',
    'blueprints',
    'collectibleResources',
    'equipmentItemTypes',
    'harvestLoots',
    'itemTypes',
    'itemProperties',
    'items',
    'jobsItems',
    'recipeCategories',
    'recipeIngredients',
    'recipeResults',
    'recipes',
    'resourceTypes',
    'resources',
    'states',
] as const;

type WakfuType = (typeof WAKFU_TYPES)[number];

interface WakfuConfigResponse {
    version: string;
}

interface WakfuSyncMetadata {
    version: string | null;
    lastCheckedAt: string | null;
    lastSyncedAt: string | null;
    configUrl: string;
    downloadedTypes: WakfuType[];
}

export interface WakfuSyncResult {
    checkedAt: string;
    version: string;
    changed: boolean;
    downloadedTypes: WakfuType[];
    reason: 'forced' | 'version_changed' | 'missing_files' | 'up_to_date';
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const RAW_GAMEDATA_DIR = path.join(DATA_DIR, 'wakfu-gamedata');
const CONFIG_PATH = path.join(RAW_GAMEDATA_DIR, 'config.json');
const METADATA_PATH = path.join(RAW_GAMEDATA_DIR, 'metadata.json');
const LEGACY_MIRROR_TYPES = new Set<WakfuType>(['items']);

let syncInFlight: Promise<WakfuSyncResult> | null = null;
let schedulerStarted = false;

async function ensureDir(dirPath: string) {
    await fs.mkdir(dirPath, { recursive: true });
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content) as T;
    } catch (error) {
        return null;
    }
}

async function writeJsonAtomically(filePath: string, data: unknown) {
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tempPath, filePath);
}

async function downloadJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
        headers: {
            'user-agent': 'WakGroup Data Sync',
            accept: 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

function getTypeFilePath(type: WakfuType) {
    return path.join(RAW_GAMEDATA_DIR, `${type}.json`);
}

async function findMissingTypes() {
    const missing: WakfuType[] = [];

    for (const type of WAKFU_TYPES) {
        if (!(await fileExists(getTypeFilePath(type)))) {
            missing.push(type);
        }
    }

    return missing;
}

async function mirrorLegacyFile(type: WakfuType, payload: unknown) {
    if (!LEGACY_MIRROR_TYPES.has(type)) {
        return;
    }

    await writeJsonAtomically(path.join(DATA_DIR, `${type}.json`), payload);
}

async function persistType(type: WakfuType, payload: unknown) {
    await writeJsonAtomically(getTypeFilePath(type), payload);
    await mirrorLegacyFile(type, payload);
}

export async function syncWakfuGamedata(options: { force?: boolean } = {}): Promise<WakfuSyncResult> {
    if (syncInFlight) {
        return syncInFlight;
    }

    syncInFlight = (async () => {
        await ensureDir(RAW_GAMEDATA_DIR);

        const checkedAt = new Date().toISOString();
        const currentMetadata = await readJsonFile<WakfuSyncMetadata>(METADATA_PATH);
        const configUrl = `${WAKFU_GAMEDATA_BASE_URL}/config.json`;
        const config = await downloadJson<WakfuConfigResponse>(configUrl);
        const missingTypes = await findMissingTypes();
        const versionChanged = currentMetadata?.version !== config.version;
        const force = options.force === true;

        let reason: WakfuSyncResult['reason'] = 'up_to_date';
        let typesToDownload: WakfuType[] = [];

        if (force) {
            reason = 'forced';
            typesToDownload = [...WAKFU_TYPES];
        } else if (versionChanged) {
            reason = 'version_changed';
            typesToDownload = [...WAKFU_TYPES];
        } else if (missingTypes.length > 0) {
            reason = 'missing_files';
            typesToDownload = missingTypes;
        }

        if (typesToDownload.length > 0) {
            for (const type of typesToDownload) {
                const typeUrl = `${WAKFU_GAMEDATA_BASE_URL}/${config.version}/${type}.json`;
                const payload = await downloadJson<unknown>(typeUrl);
                await persistType(type, payload);
            }

            await writeJsonAtomically(CONFIG_PATH, config);
            await writeJsonAtomically(METADATA_PATH, {
                version: config.version,
                lastCheckedAt: checkedAt,
                lastSyncedAt: checkedAt,
                configUrl,
                downloadedTypes: [...WAKFU_TYPES],
            } satisfies WakfuSyncMetadata);
        } else {
            await writeJsonAtomically(METADATA_PATH, {
                version: currentMetadata?.version || config.version,
                lastCheckedAt: checkedAt,
                lastSyncedAt: currentMetadata?.lastSyncedAt || null,
                configUrl,
                downloadedTypes: currentMetadata?.downloadedTypes || [],
            } satisfies WakfuSyncMetadata);
        }

        return {
            checkedAt,
            version: config.version,
            changed: typesToDownload.length > 0,
            downloadedTypes: typesToDownload,
            reason,
        };
    })();

    try {
        return await syncInFlight;
    } finally {
        syncInFlight = null;
    }
}

export function startWakfuGamedataScheduler(onSync?: (result: WakfuSyncResult) => Promise<void> | void) {
    if (schedulerStarted) {
        return;
    }

    schedulerStarted = true;

    const runCheck = async () => {
        try {
            const metadata = await readJsonFile<WakfuSyncMetadata>(METADATA_PATH);
            const shouldSyncNow = !metadata?.lastCheckedAt
                || (Date.now() - new Date(metadata.lastCheckedAt).getTime()) >= WAKFU_SYNC_INTERVAL_MS;

            if (!shouldSyncNow) {
                return;
            }

            const result = await syncWakfuGamedata();
            if (result.changed) {
                console.log(`[wakfu-gamedata] Updated to version ${result.version} (${result.downloadedTypes.length} files)`);
            } else {
                console.log(`[wakfu-gamedata] Checked version ${result.version}; already up to date`);
            }

            await onSync?.(result);
        } catch (error) {
            console.error('[wakfu-gamedata] Sync failed', error);
        }
    };

    void runCheck();
    setInterval(() => {
        void runCheck();
    }, WAKFU_CHECK_INTERVAL_MS);
}
