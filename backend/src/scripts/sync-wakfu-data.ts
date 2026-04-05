import 'dotenv/config';

import { syncWakfuGamedata } from '../services/wakfu-gamedata.js';

async function main() {
    const force = process.argv.includes('--force');
    const result = await syncWakfuGamedata({ force });

    console.log(JSON.stringify({
        ok: true,
        force,
        version: result.version,
        changed: result.changed,
        reason: result.reason,
        downloadedTypes: result.downloadedTypes,
        checkedAt: result.checkedAt,
    }, null, 2));
}

main().catch((error) => {
    console.error('[wakfu-gamedata] Manual sync failed', error);
    process.exit(1);
});
