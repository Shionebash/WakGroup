import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { getDb } from './db/database.js';
import { broadcastDesktopUpdate, getDesktopUpdateSubscriberCount, initSocket } from './socket/chat.js';

import authRoutes from './routes/auth.js';
import characterRoutes from './routes/characters.js';
import groupRoutes from './routes/groups.js';
import applicationRoutes from './routes/applications.js';
import wikiRoutes from './routes/wiki.js';
import notificationRoutes from './routes/notifications.js';
import dungeonRoutes from './routes/dungeons.js';
import pvpGroupRoutes from './routes/pvp-groups.js';
import pvpApplicationRoutes from './routes/pvp-applications.js';
import mobsRoutes from './routes/mobs.js';
import { reloadMobRouteData } from './routes/mobs.js';
import builderRoutes, { reloadBuilderRouteData } from './routes/builder.js';

console.log('[index] Builder routes imported:', typeof builderRoutes);
import { startGroupInactivityMonitor } from './services/group-inactivity.js';
import { startWakfuGamedataScheduler } from './services/wakfu-gamedata.js';

const app = express();
app.set('trust proxy', 3);
const server = http.createServer(app);

// ESM __dirname equivalent
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function buildAllowedOrigins(): Set<string> {
    const configuredFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const candidates = [
        configuredFrontendUrl,
        process.env.FRONTEND_URL,
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
    ].filter(Boolean) as string[];

    const origins = new Set<string>();
    for (const candidate of candidates) {
        try {
            origins.add(new URL(candidate).origin);
        } catch {
            // Ignore malformed env values and keep the server booting.
        }
    }

    return origins;
}

const allowedOrigins = buildAllowedOrigins();

// Initialize database (creates tables if not exist)
import { initDb } from './db/database.js';
export let io: ReturnType<typeof initSocket> | null = null;
initDb().then(() => {
    // Init Socket.io after db starts
    io = initSocket(server);
    startGroupInactivityMonitor(getDb(), io);
}).catch(console.error);

startWakfuGamedataScheduler((result) => {
    if (!result.changed) {
        return;
    }

    if (result.downloadedTypes.includes('items')) {
        reloadMobRouteData();
    }

    if (result.downloadedTypes.some((type) => ['items', 'actions', 'equipmentItemTypes'].includes(type))) {
        reloadBuilderRouteData();
    }
});


// Security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // for serving images
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https://cdn.discordapp.com'],
            frameSrc: ['https://www.youtube.com', 'https://player.vimeo.com'],
        },
    },
}));

// CORS - only allow configured frontend
app.use(cors({
    origin(origin, callback) {
        if (!origin || origin === 'null' || allowedOrigins.has(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
}));

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Serve static assets (class icons, dungeon images)
app.use('/assets', express.static(path.join(__dirname, '../assets'), {
    maxAge: '7d',
    etag: true,
}));

// Rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // ← sube de 20 a 100 durante desarrollo
    message: { error: 'Demasiados intentos. Por favor espera.' },
});

const writeLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 min
    max: 30,
});

app.use(generalLimiter);

// Routes
app.use('/auth', authLimiter, authRoutes);
app.use('/characters', writeLimiter, characterRoutes);
app.use('/groups', writeLimiter, groupRoutes);
app.use('/applications', writeLimiter, applicationRoutes);
app.use('/wiki', writeLimiter, wikiRoutes);
app.use('/notifications', notificationRoutes);
app.use('/dungeons', dungeonRoutes);
app.use('/pvp-groups', writeLimiter, pvpGroupRoutes);
app.use('/pvp-applications', writeLimiter, pvpApplicationRoutes);
app.use('/mobs', mobsRoutes);
app.use('/builder', builderRoutes);
console.log('[index] Builder routes registered');

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/internal/desktop-updates/broadcast', (req, res) => {
    const expectedSecret = process.env.DESKTOP_UPDATE_BROADCAST_SECRET;
    const receivedSecret = req.header('x-update-secret');

    if (!expectedSecret) {
        return res.status(503).json({ error: 'Desktop update broadcast is not configured.' });
    }

    if (!receivedSecret || receivedSecret !== expectedSecret) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!io) {
        return res.status(503).json({ error: 'Socket server is not ready yet.' });
    }

    const payload = typeof req.body === 'object' && req.body ? req.body : {};
    broadcastDesktopUpdate(io, payload);
    const subscriberCount = getDesktopUpdateSubscriberCount(io);

    console.log('[updates] Desktop update broadcast emitted', {
        version: payload.version || null,
        subscriberCount,
        issuedAt: payload.issuedAt || new Date().toISOString(),
    });

    res.json({
        ok: true,
        subscriberCount,
        emittedAt: new Date().toISOString(),
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = Number(process.env.PORT) || 4000;
server.listen(PORT, () => {
    console.log(`🚀 Wakfu LFG Backend running on port ${PORT}`);
});

export default app;
