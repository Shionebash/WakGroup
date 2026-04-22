export interface User {
    id: string;
    discord_id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    created_at: number;
}

export interface JwtPayload {
    userId: string;
    discordId: string;
    username: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}
