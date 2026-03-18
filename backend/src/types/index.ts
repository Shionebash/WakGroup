// Shared TypeScript types for the backend

export interface User {
    id: string;
    discord_id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    created_at: number;
}

export interface Character {
    id: string;
    user_id: string;
    name: string;
    level: number;
    class_id: number;
    role: CharacterRole;
    server: Server;
    created_at: number;
}

export interface DungeonGroup {
    id: string;
    title: string;
    description: string | null;
    dungeon_id: number;
    leader_char_id: string;
    stasis: number;
    steles_active: boolean;
    steles_count: number;
    intervention_active: boolean;
    steles_drops?: string | number[];
    server: Server;
    status: GroupStatus;
    created_at: number;
}

export interface Application {
    id: string;
    group_id: string;
    character_id: string;
    status: ApplicationStatus;
    created_at: number;
}

export interface ChatMessage {
    id: string;
    group_id: string;
    user_id: string;
    content: string;
    created_at: number;
}

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    payload: Record<string, unknown>;
    is_read: number;
    created_at: number;
}

export interface WikiPost {
    id: string;
    dungeon_id: number;
    user_id: string;
    title: string;
    content: string;
    created_at: number;
    updated_at: number;
}

export type CharacterRole = 'dps' | 'healer' | 'tank' | 'support' | 'invocador' | 'posicionador';
export type Server = 'Ogrest' | 'Rubilax' | 'Pandora';
export type GroupStatus = 'open' | 'full' | 'closed';
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected';
export type NotificationType =
    | 'application_received'
    | 'application_accepted'
    | 'application_rejected'
    | 'group_message';

// JWT payload
export interface JwtPayload {
    userId: string;
    discordId: string;
    username: string;
}

// Express augmentation
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}
