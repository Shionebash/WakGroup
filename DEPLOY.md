# Guía de deploy — WakGroup

Stack: **Next.js** (Vercel) · **Express + Socket.io** (Render) · **PostgreSQL** (Supabase)

---

## Arquitectura

```
[Usuario]
   │
   ▼
[Vercel] ── Next.js frontend
   │  NEXT_PUBLIC_API_URL
   ▼
[Render] ── Express API + Socket.io
   │  DATABASE_URL
   ▼
[Supabase] ── PostgreSQL
```

---

## Paso 1 — Migrar PostgreSQL a Supabase

### 1.1 Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) y crear una cuenta
2. Crear un nuevo proyecto (elegir región `us-east-1` o la más cercana)
3. Guardar la contraseña del proyecto — no se puede recuperar después

### 1.2 Exportar la base de datos local

```bash
pg_dump -U postgres -d wakfu_lfg \
  --no-owner --no-acl \
  -f wakfu_backup.sql
```

> El flag `--no-owner` evita errores de permisos al importar en Supabase.

### 1.3 Importar el backup

En Supabase ir a **Settings → Database → Connection string → URI** y copiar la URL. Luego ejecutar:

```bash
psql "postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres" \
  -f wakfu_backup.sql
```

### 1.4 Verificar la importación

En el panel de Supabase ir a **Table Editor** y confirmar que las tablas `users`, `characters`, `groups`, `dungeons`, etc. están presentes con sus datos.

---

## Paso 2 — Preparar el código para producción

### 2.1 Habilitar SSL en la conexión a la base de datos

En `backend/src/db/database.ts`, descomentar la línea de SSL (ya está preparada):

```typescript
pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
```

Supabase requiere SSL en producción. Sin esto, la conexión será rechazada.

### 2.2 Actualizar next.config.js

En `frontend/next.config.js`, agregar el hostname de Render para que las imágenes servidas por el backend funcionen en producción:

```javascript
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'cdn.discordapp.com',
            },
            {
                protocol: 'https',
                hostname: '*.onrender.com', // backend en producción
            }
        ],
    },
};
```

### 2.3 Verificar Socket.io (ya está bien configurado)

En `frontend/lib/chat-context.tsx` el socket ya tiene la configuración correcta con fallback a polling:

```typescript
const socket = io(BACKEND_URL, {
    withCredentials: true,
    transports: ['polling', 'websocket'], // polling primero como fallback
    auth: token ? { token } : undefined,
});
```

No se requieren cambios.

---

## Paso 3 — Deploy del backend en Render

### 3.1 Crear el servicio

1. Ir a [render.com](https://render.com) y crear cuenta
2. **New → Web Service**
3. Conectar el repositorio de GitHub (solo la carpeta `backend`)
4. Configurar:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node dist/index.js`
   - **Node version:** `22.5.0` (en Environment)

### 3.2 Variables de entorno en Render

En **Environment → Environment Variables** agregar:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | Connection string de Supabase + `?sslmode=require` al final |
| `JWT_SECRET` | Cadena aleatoria larga (mín. 32 caracteres) |
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `FRONTEND_URL` | `https://tu-app.vercel.app` (se obtiene en el paso 4) |
| `DISCORD_CLIENT_ID` | El mismo de tu app en Discord Developer Portal |
| `DISCORD_CLIENT_SECRET` | El mismo de tu app en Discord Developer Portal |
| `DISCORD_REDIRECT_URI` | `https://tu-backend.onrender.com/auth/discord/callback` |

> La `DATABASE_URL` de Supabase se encuentra en **Settings → Database → Connection string → URI**. Agregar `?sslmode=require` al final de la URL.

### 3.3 Archivos de assets (ya en el repo)

El backend sirve assets estáticos desde `/assets` y **ahora están versionados dentro de** `backend/assets`.
No necesitas subirlos manualmente si el repo está sincronizado.

> El path esperado en producción es: `backend/assets/`

### 3.4 Verificar que el backend está corriendo

Una vez desplegado, visitar:

```
https://tu-backend.onrender.com/health
```

Debe responder:

```json
{ "status": "ok", "time": "2025-..." }
```

---

## Paso 4 — Deploy del frontend en Vercel

### 4.1 Crear el proyecto

1. Ir a [vercel.com](https://vercel.com) y crear cuenta
2. **New Project → Import Git Repository**
3. Seleccionar el repo y configurar:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Next.js (detectado automáticamente)

### 4.2 Variables de entorno en Vercel

En **Settings → Environment Variables**:

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://tu-backend.onrender.com` |
| `NEXT_PUBLIC_BACKEND_URL` | `https://tu-backend.onrender.com` |

> Agregar estas variables **antes** de hacer el primer deploy.

### 4.3 Actualizar FRONTEND_URL en Render

Una vez que Vercel asigne el dominio (ej. `https://wakgroup.vercel.app`), volver a Render y actualizar la variable `FRONTEND_URL` con esa URL exacta. Esto es crítico para que CORS funcione.

---

## Paso 5 — Actualizar Discord OAuth

### 5.1 Registrar las nuevas URLs de redirect

1. Ir a [discord.com/developers/applications](https://discord.com/developers/applications)
2. Seleccionar la aplicación
3. Ir a **OAuth2 → Redirects**
4. Agregar:

```
https://tu-backend.onrender.com/auth/discord/callback
```

Sin este paso el login con Discord fallará en producción con error `invalid_redirect_uri`.

---

## Paso 6 — Evitar que el backend se duerma (opcional)

El plan gratuito de Render suspende el servidor tras **15 minutos de inactividad**. El primer request tarda ~30 segundos en "despertar".

Para evitarlo, configurar [UptimeRobot](https://uptimerobot.com) (gratis):

1. Crear monitor tipo **HTTP(s)**
2. URL: `https://tu-backend.onrender.com/health`
3. Intervalo: **cada 10 minutos**

El backend ya tiene el endpoint `/health` listo para esto.

---

## Datos JSON (backend)

Los JSON se movieron a `backend/data/` para que Render los incluya en el deploy:

- `backend/data/clases.json`
- `backend/data/mazmos.json`
- `backend/data/items.json`
- `backend/data/stasis.json`
- `backend/data/wakfu_mobs.json`

El backend ya está configurado para leerlos desde esa ruta.

---
## Variables de entorno — resumen completo

### backend/.env (producción)

```env
PORT=4000
NODE_ENV=production

DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?sslmode=require

JWT_SECRET=una_cadena_muy_larga_y_aleatoria_aqui

FRONTEND_URL=https://tu-app.vercel.app

DISCORD_CLIENT_ID=tu_client_id
DISCORD_CLIENT_SECRET=tu_client_secret
DISCORD_REDIRECT_URI=https://tu-backend.onrender.com/auth/discord/callback
```

### frontend/.env.local (producción)

```env
NEXT_PUBLIC_API_URL=https://tu-backend.onrender.com
NEXT_PUBLIC_BACKEND_URL=https://tu-backend.onrender.com
```

---

## Limitaciones del plan gratuito

| Servicio | Limitación |
|----------|-----------|
| **Render** | El backend se duerme tras 15 min de inactividad. 750 h/mes de cómputo. |
| **Supabase** | 500 MB de base de datos. El proyecto se pausa tras 1 semana sin actividad (se reactiva desde el dashboard). |
| **Vercel** | 100 GB de ancho de banda/mes. Sin límite de deployments. |

---

## Orden de deploy recomendado

```
1. Supabase   → crear proyecto + importar backup
2. Render     → deploy backend con variables de entorno
3. Discord    → actualizar redirect URI
4. Vercel     → deploy frontend con NEXT_PUBLIC_API_URL
5. Render     → actualizar FRONTEND_URL con el dominio de Vercel
6. UptimeRobot → configurar ping a /health (opcional)
```


---

## Nota sobre build de frontend

En Windows se presentó un error `EPERM` durante `next build` cuando se ejecuta dentro de sandbox.
El build funciona correctamente ejecutándolo fuera del sandbox.

