import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

// Interceptor de REQUEST: agrega token en cada petición
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('session_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Interceptor de RESPONSE: limpia token si expira
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('session_token');
            }
        }
        return Promise.reject(error);
    }
);

export function getAssetUrl(path: string): string {
    if (!path) return '/placeholder-dungeon.png';
    return `${API_URL}/${path}`;
}

export function getDiscordAvatar(userId: string, avatar: string | null): string {
    if (!avatar) return `https://cdn.discordapp.com/embed/avatars/0.png`;
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
}