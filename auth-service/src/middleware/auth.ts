import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

function isLoopbackHost(hostname: string): boolean {
    const normalized = hostname.trim().toLowerCase();
    return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
}

export function shouldUseSecureCookies(req?: Request): boolean {
    if (req) {
        const forwardedProto = req.header('x-forwarded-proto');
        if (forwardedProto) {
            return forwardedProto.split(',')[0].trim() === 'https';
        }

        const hostHeader = req.get('host');
        if (hostHeader) {
            const hostname = hostHeader.split(':')[0];
            if (isLoopbackHost(hostname)) {
                return false;
            }
        }

        if (req.secure) {
            return true;
        }
    }

    const redirectUri = process.env.DISCORD_REDIRECT_URI;
    if (redirectUri) {
        try {
            const parsed = new URL(redirectUri);
            if (parsed.protocol !== 'https:' || isLoopbackHost(parsed.hostname)) {
                return false;
            }
        } catch {
            return process.env.NODE_ENV === 'production' || process.env.USE_SECURE_COOKIES === 'true';
        }
    }

    return process.env.NODE_ENV === 'production' || process.env.USE_SECURE_COOKIES === 'true';
}

export function generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function setCookieSession(res: Response, token: string, req?: Request): void {
    const isSecure = shouldUseSecureCookies(req);
    res.cookie('session', token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
}
