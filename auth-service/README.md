# WakGroup Auth Service

Servicio minimo para sacar el OAuth de Discord fuera de Render.

## Variables de entorno

- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `JWT_SECRET`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`
- `FRONTEND_URL`

## Endpoints

- `GET /health`
- `GET /auth/discord`
- `GET /auth/discord/callback`

## Deploy sugerido

1. Despliega esta carpeta como servicio aparte.
2. Configura `DISCORD_REDIRECT_URI` con la URL publica del nuevo servicio:
   `https://tu-auth-service/auth/discord/callback`
3. En Discord Developer Portal agrega ese mismo redirect URI.
4. En el frontend define `NEXT_PUBLIC_AUTH_API_URL` con la URL publica del nuevo servicio.
5. Mantén `NEXT_PUBLIC_API_URL` apuntando al backend principal.
