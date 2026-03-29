import { Router, Request, Response } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';
import { generateToken, setCookieSession, requireAuth, shouldUseSecureCookies } from '../middleware/auth.js';
import { User } from '../types/index.js';

const router = Router();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI!;

// Step 1: redirect to Discord OAuth
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
    // Si el login se inició desde la mini app, redirigiremos el callback a la app de escritorio
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
    res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

// Step 2: handle callback
router.get('/discord/callback', async (req: Request, res: Response): Promise<void> => {
    const { code, state } = req.query;
    const savedState = req.cookies?.oauth_state;

    // Validate state to prevent CSRF
    if (!state || !savedState || state !== savedState) {
        res.status(400).json({ error: 'Estado OAuth inválido' });
        return;
    }
    res.clearCookie('oauth_state');

    if (!code || typeof code !== 'string') {
        res.status(400).json({ error: 'Código de autorización faltante' });
        return;
    }

    try {
        // Exchange code for access token
        const tokenRes = await axios.post(
            'https://discord.com/api/oauth2/token',
            new URLSearchParams({
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: DISCORD_REDIRECT_URI,
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const accessToken = tokenRes.data.access_token;

        // Fetch user info from Discord
        const userRes = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        const discordUser = userRes.data;
        const db = getDb();

        // Upsert user in DB
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

        // Issue JWT in httpOnly cookie
        const token = generateToken({
            userId,
            discordId: discordUser.id,
            username: discordUser.username,
        });
        setCookieSession(res, token, req);

        // Si el login vino de la mini app, redirigir al callback local de Electron
        const redirectTarget = req.cookies?.oauth_redirect_target;
        const desktopCallbackPort = Number(req.cookies?.oauth_desktop_callback_port || 45678);
        res.clearCookie('oauth_redirect_target');
        res.clearCookie('oauth_desktop_callback_port');
        if (redirectTarget === 'desktop') {
            const safeDesktopCallbackPort =
                Number.isInteger(desktopCallbackPort) && desktopCallbackPort >= 1024 && desktopCallbackPort <= 65535
                    ? desktopCallbackPort
                    : 45678;
            // Redirect only to the loopback callback server owned by the desktop app.
            res.redirect(`http://127.0.0.1:${safeDesktopCallbackPort}/callback?token=${encodeURIComponent(token)}`);
            return;
        }

        // Redirect to frontend
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/auth/callback?token=${encodeURIComponent(token)}`);
    } catch (err) {
        console.error('Discord OAuth error:', err);
        res.status(500).json({ error: 'Error durante la autenticación con Discord' });
    }
});

// Desktop callback - serves a page that sends token to Electron and closes
router.get('/desktop-callback', async (req: Request, res: Response): Promise<void> => {
    const token = req.query.token;
    if (!token) {
        res.status(400).json({ error: 'Token no proporcionado' });
        return;
    }
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Login Complete</title>
        </head>
        <body style="font-family:sans-serif;background:#1a1a2e;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;">
            <div style="text-align:center;">
                <p style="font-size:24px;margin-bottom:20px;">✅ Sesión iniciada</p>
                <p style="color:#aaa;margin-bottom:20px;">El token se ha recibido. Cierra esta pestaña.</p>
                <p style="color:#666;font-size:12px;">Token: ${token.toString().substring(0, 20)}...</p>
            </div>
            <script>
                // Store in sessionStorage for Electron to read
                try {
                    sessionStorage.setItem('oauth_token', '${token}');
                } catch(e) {}
            </script>
        </body>
        </html>
    `);
});

// Get current user info
router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
    const db = getDb();
    try {
        const userResult = await db.query('SELECT id, discord_id, username, avatar, created_at FROM users WHERE id = $1', [req.user!.userId]);
        const user = userResult.rows[0] as User | undefined;
        if (!user) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Logout
router.get('/logout', (req: Request, res: Response) => {
    const isSecure = shouldUseSecureCookies(req);
    res.clearCookie('session', {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? 'none' : 'lax',
    });
    const redirect = req.query.redirect as string || process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(redirect);
});

export default router;
