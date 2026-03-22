import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { getDb } from './db/database.js';
import { broadcastDesktopUpdate, initSocket } from './socket/chat.js';

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
import { startGroupInactivityMonitor } from './services/group-inactivity.js';

const app = express();
app.set('trust proxy', 3);
const server = http.createServer(app);

// ESM __dirname equivalent
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database (creates tables if not exist)
import { initDb } from './db/database.js';
export let io: ReturnType<typeof initSocket> | null = null;
initDb().then(() => {
    // Init Socket.io after db starts
    io = initSocket(server);
    startGroupInactivityMonitor(getDb(), io);
}).catch(console.error);


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
    origin: process.env.FRONTEND_URL || 'https://packard-dan-magnet-calling.trycloudflare.com',
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

    res.json({
        ok: true,
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
