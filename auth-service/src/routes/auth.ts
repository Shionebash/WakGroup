import { Router, Request, Response } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';
import { generateToken, setCookieSession, shouldUseSecureCookies } from '../middleware/auth.js';
import { User } from '../types/index.js';

const router = Router();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI!;
const IS_DEV = process.env.NODE_ENV !== 'production';
const OAUTH_CODE_TTL_MS = 2 * 60 * 1000;
const oauthCodeLocks = new Map<string, number>();

function cleanupOauthCodeLocks() {
    const now = Date.now();
    for (const [storedCode, expiresAt] of oauthCodeLocks.entries()) {
        if (expiresAt <= now) {
            oauthCodeLocks.delete(storedCode);
        }
    }
}

function reserveOauthCode(code: string) {
    cleanupOauthCodeLocks();
    if (oauthCodeLocks.has(code)) {
        return false;
    }

    oauthCodeLocks.set(code, Date.now() + OAUTH_CODE_TTL_MS);
    return true;
}

function releaseOauthCode(code: string) {
    oauthCodeLocks.delete(code);
}

function getAxiosErrorDetails(err: unknown) {
    if (!axios.isAxiosError(err)) {
        return null;
    }

    return {
        message: err.message,
        code: err.code,
        status: err.response?.status,
        retryAfterHeader: err.response?.headers?.['retry-after'],
        data: err.response?.data,
    };
}

function buildFrontendAuthErrorUrl(message: string, retryAfterSeconds?: number) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const params = new URLSearchParams({ error: message });
    if (typeof retryAfterSeconds === 'number' && Number.isFinite(retryAfterSeconds)) {
        params.set('retryAfterSeconds', String(retryAfterSeconds));
    }

    return `${frontendUrl}/auth/callback?${params.toString()}`;
}

function sendDesktopAuthError(res: Response, message: string, retryAfterSeconds?: number) {
    const retryText =
        typeof retryAfterSeconds === 'number' && Number.isFinite(retryAfterSeconds)
            ? `<p style="color:#aaa;margin-bottom:20px;">Reintenta en aproximadamente ${retryAfterSeconds} segundos.</p>`
            : '';

    res.status(503).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Discord Login Error</title>
        </head>
        <body style="font-family:sans-serif;background:#1a1a2e;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;padding:24px;text-align:center;">
            <div style="max-width:460px;">
                <p style="font-size:24px;margin-bottom:16px;">No se pudo iniciar sesion</p>
                <p style="color:#ddd;margin-bottom:12px;">${message}</p>
                ${retryText}
                <p style="color:#666;font-size:12px;">Puedes cerrar esta ventana y volver a intentarlo.</p>
            </div>
        </body>
        </html>
    `);
}

router.get('/discord', (req, res) => {
    const state = uuidv4();
    const isSecure = shouldUseSecureCookies(req);
    const desktopCallbackPortRaw = req.query.desktop_callback_port;
    const desktopCallbackPort =
        typeof desktopCallbackPortRaw === 'string' && /^\d{2,5}$/.test(desktopCallbackPortRaw)
            ? Number(desktopCallbackPortRaw)
            : null;

    res.cookie('oauth_state', state, {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? 'none' : 'lax',
        maxAge: 10 * 60 * 1000
    });

    if (req.query.from === 'desktop') {
        res.cookie('oauth_redirect_target', 'desktop', {
            httpOnly: true,
            secure: isSecure,
            sameSite: isSecure ? 'none' : 'lax',
            maxAge: 10 * 60 * 1000
        });

        if (desktopCallbackPort && desktopCallbackPort >= 1024 && desktopCallbackPort <= 65535) {
            res.cookie('oauth_desktop_callback_port', String(desktopCallbackPort), {
                httpOnly: true,
                secure: isSecure,
                sameSite: isSecure ? 'none' : 'lax',
                maxAge: 10 * 60 * 1000
            });
        }
    }

    const params = new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        redirect_uri: DISCORD_REDIRECT_URI,
        response_type: 'code',
        scope: 'identify',
        state,
    });

    if (IS_DEV) {
        console.log('[auth-service] Starting Discord OAuth', {
            from: req.query.from || 'web',
            redirectUri: DISCORD_REDIRECT_URI,
            host: req.get('host'),
            secureCookies: isSecure,
            desktopCallbackPort,
        });
    }

    res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

router.get('/discord/callback', async (req: Request, res: Response): Promise<void> => {
    const { code, state } = req.query;
    const savedState = req.cookies?.oauth_state;
    const redirectTarget = req.cookies?.oauth_redirect_target || 'web';

    if (IS_DEV) {
        console.log('[auth-service] Received Discord callback', {
            hasCode: Boolean(code),
            hasState: Boolean(state),
            savedStatePresent: Boolean(savedState),
            redirectTarget,
        });
    }

    if (!state || !savedState || state !== savedState) {
        const message = 'Estado OAuth invalido';
        if (redirectTarget === 'desktop') {
            sendDesktopAuthError(res, message);
            return;
        }
        res.redirect(buildFrontendAuthErrorUrl(message));
        return;
    }
    res.clearCookie('oauth_state');

    if (!code || typeof code !== 'string') {
        const message = 'Codigo de autorizacion faltante';
        if (redirectTarget === 'desktop') {
            sendDesktopAuthError(res, message);
            return;
        }
        res.redirect(buildFrontendAuthErrorUrl(message));
        return;
    }

    try {
        if (!reserveOauthCode(code)) {
            const message = 'El codigo OAuth ya se esta procesando o fue reutilizado. Intenta iniciar sesion otra vez.';
            if (redirectTarget === 'desktop') {
                sendDesktopAuthError(res, message);
                return;
            }
            res.redirect(buildFrontendAuthErrorUrl(message));
            return;
        }

        const tokenRes = await axios.post(
            'https://discord.com/api/oauth2/token',
            new URLSearchParams({
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: DISCORD_REDIRECT_URI,
            }),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 15000,
            }
        );

        const accessToken = tokenRes.data.access_token;

        const userRes = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: 15000,
        });

        const discordUser = userRes.data;
        const db = getDb();
        const existingResult = await db.query('SELECT * FROM users WHERE discord_id = $1', [discordUser.id]);
        const existing = existingResult.rows[0] as User | undefined;

        let userId: string;
        if (existing) {
            await db.query(
                `UPDATE users SET username = $1, avatar = $2, discriminator = $3, updated_at = CURRENT_TIMESTAMP WHERE discord_id = $4`,
                [discordUser.username, discordUser.avatar, discordUser.discriminator || '0', discordUser.id]
            );
            userId = existing.id;
        } else {
            userId = uuidv4();
            await db.query(
                'INSERT INTO users (id, discord_id, username, discriminator, avatar) VALUES ($1, $2, $3, $4, $5)',
                [userId, discordUser.id, discordUser.username, discordUser.discriminator || '0', discordUser.avatar]
            );
        }

        const token = generateToken({
            userId,
            discordId: discordUser.id,
            username: discordUser.username,
        });
        setCookieSession(res, token, req);

        const desktopCallbackPort = Number(req.cookies?.oauth_desktop_callback_port || 45678);
        res.clearCookie('oauth_redirect_target');
        res.clearCookie('oauth_desktop_callback_port');

        if (redirectTarget === 'desktop') {
            const safeDesktopCallbackPort =
                Number.isInteger(desktopCallbackPort) && desktopCallbackPort >= 1024 && desktopCallbackPort <= 65535
                    ? desktopCallbackPort
                    : 45678;

            res.redirect(`http://127.0.0.1:${safeDesktopCallbackPort}/callback?token=${encodeURIComponent(token)}`);
            return;
        }

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/auth/callback?token=${encodeURIComponent(token)}`);
    } catch (err) {
        const errorDetails = getAxiosErrorDetails(err);

        if (errorDetails) {
            console.error('[auth-service] Discord OAuth error:', errorDetails);

            if (errorDetails.status === 429) {
                const retryAfterSeconds =
                    Number(errorDetails.retryAfterHeader) ||
                    (typeof errorDetails.data === 'object' &&
                    errorDetails.data &&
                    'retry_after' in errorDetails.data &&
                    typeof errorDetails.data.retry_after === 'number'
                        ? errorDetails.data.retry_after
                        : 30);

                const message = 'Discord esta limitando temporalmente el inicio de sesion. Intenta de nuevo en unos segundos.';
                if (redirectTarget === 'desktop') {
                    sendDesktopAuthError(res, message, retryAfterSeconds);
                    return;
                }
                res.redirect(buildFrontendAuthErrorUrl(message, retryAfterSeconds));
                return;
            }
        } else {
            console.error('[auth-service] Discord OAuth error:', err);
        }

        const genericMessage = 'Error durante la autenticacion con Discord';
        if (redirectTarget === 'desktop') {
            sendDesktopAuthError(res, genericMessage);
            return;
        }
        res.redirect(buildFrontendAuthErrorUrl(genericMessage));
    } finally {
        releaseOauthCode(code);
    }
});

export default router;
