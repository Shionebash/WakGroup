import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import { checkDbConnection } from './db/database.js';

const app = express();
app.set('trust proxy', 1);

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

app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https://cdn.discordapp.com'],
        },
    },
}));

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

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Demasiados intentos. Por favor espera.' },
});

app.use(generalLimiter);
app.use('/auth', authLimiter, authRoutes);

app.get('/health', async (req, res) => {
    try {
        await checkDbConnection();
        res.json({ status: 'ok', time: new Date().toISOString() });
    } catch (error) {
        console.error('[auth-service] Health check failed:', error);
        res.status(503).json({ status: 'error', time: new Date().toISOString() });
    }
});

app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = Number(process.env.PORT) || 4010;
app.listen(PORT, () => {
    console.log(`[auth-service] WakGroup Auth Service running on port ${PORT}`);
});

export default app;
