import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';



export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.session ||
        req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        res.status(401).json({ error: 'No autenticado' });
        return;
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
        req.user = payload;
        next();
    } catch {
        res.status(401).json({ error: 'Sesión inválida o expirada' });
    }
}

export function generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function setCookieSession(res: Response, token: string): void {
    const isSecure = process.env.NODE_ENV === 'production' || process.env.USE_SECURE_COOKIES === 'true';
    res.cookie('session', token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
}
