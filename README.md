
# 🎮 WakGroup - Plataforma de Búsqueda de Grupo

Plataforma completa para encontrar grupos y hacer mazmorras en el MMORPG Wakfu.

## ✨ Características

- 🔐 **Autenticación con Discord OAuth 2.0**
- 👥 **Creación y gestión de grupos de mazmorras**
- 🎯 **Sistema de aplicaciones para unirse a grupos**
- 💬 **Chat en tiempo real con Socket.io**
- 📱 **Interfaz responsive y moderna**
- 🌍 **Soporte multi-servidor (Ogrest, Rubilax, Pandora)**
- 📊 **Sistema de notificaciones**
- 📖 **Wiki y guías de mazmorras**

## 🏗️ Arquitectura

```
wakgroup/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── database.ts      (conexión SQLite)
│   │   │   ├── schema.sql       (esquema de BD)
│   │   │   └── seed.ts          (datos iniciales)
│   │   ├── middleware/
│   │   │   ├── auth.ts          (JWT + cookies)
│   │   │   └── validate.ts      (validación)
│   │   ├── routes/              (endpoints API)
│   │   ├── socket/              (WebSocket Chat)
│   │   ├── types/               (TypeScript types)
│   │   └── index.ts             (servidor principal)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── .env                      (⚠️ NO COMMITAR)
│
├── frontend/
│   ├── app/
│   │   ├── globals.css          (estilos globales)
│   │   ├── layout.tsx           (layout raíz)
│   │   ├── page.tsx             (página inicio)
│   │   ├── dungeons/
│   │   ├── wiki/
│   │   └── profile/
│   ├── components/              (componentes React)
│   ├── lib/
│   │   ├── api.ts               (cliente axios)
│   │   └── auth-context.tsx     (contexto auth)
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   └── .env.local               (⚠️ NO COMMITAR)
│
└── desktop/                      (Electron app - opcional)
```

## 🚀 Quick Start

### Prerequisitos

- Node.js >= 22.5
- npm >= 9
- Cuenta en Discord Developer Portal

### 1️⃣ Setup Backend

```bash
cd backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores de Discord OAuth

# Compilar TypeScript
npm run build

# Popular base de datos (opcional)
npm run seed

# Ejecutar servidor
npm run dev
# O en producción:
npm start
```

**El servidor estará en:** `http://localhost:4000`

### 2️⃣ Setup Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Configurar variables de entorno
# .env.local ya está creado con NEXT_PUBLIC_API_URL

# Ejecutar en desarrollo
npm run dev
# O compilar para producción:
npm run build && npm start
```

**La app estará en:** `http://localhost:3000`

---

## 🔑 Configuración de Discord OAuth

1. **Ir a:** https://discord.com/developers/applications
2. **Crear nueva aplicación**
3. **En OAuth2 → General:**
   - Copiar **Client ID** → `DISCORD_CLIENT_ID` en `.env`
   - Copiar **Client Secret** → `DISCORD_CLIENT_SECRET` en `.env`
4. **En OAuth2 → Redirects, agregar:**
   ```
   http://localhost:4000/auth/discord/callback
   ```
5. **En General → Application ID** → `DISCORD_CLIENT_ID`

---

## 📝 Variables de Entorno

### Backend (`.env`)

```env
# Servidor
PORT=4000
NODE_ENV=development

# JWT
JWT_SECRET=change_this_in_production

# Base de datos
DATABASE_PATH=./wakgroup.db

# Frontend
FRONTEND_URL=http://localhost:3000

# Discord OAuth
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_REDIRECT_URI=http://localhost:4000/auth/discord/callback
```

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## 📚 Endpoints API Principales

### Autenticación
- `GET /auth/discord` - Redirige a Discord
- `GET /auth/discord/callback` - Callback de Discord
- `GET /auth/me` - Obtener usuario actual (auth required)
- `POST /auth/logout` - Cerrar sesión

### Grupos
- `GET /groups` - Listar grupos (con filtros)
- `GET /groups/:id` - Detalles de grupo
- `POST /groups` - Crear grupo (auth required)
- `PATCH /groups/:id` - Actualizar grupo (auth required)
- `DELETE /groups/:id` - Eliminar grupo (auth required)

### Personajes
- `GET /characters` - Mis personajes (auth required)
- `POST /characters` - Crear personaje (auth required)
- `PUT /characters/:id` - Actualizar (auth required)
- `DELETE /characters/:id` - Eliminar (auth required)

### Aplicaciones
- `POST /applications` - Solicitar unirse a grupo (auth required)
- `PATCH /applications/:id` - Aceptar/rechazar (leader only)

### Chat & Notificaciones
- WebSocket `/socket.io` - Chat en tiempo real
- `GET /notifications` - Mis notificaciones

---

## 🗄️ Base de Datos

**SQLite** con las siguientes tablas:

| Tabla | Descripción |
|-------|-------------|
| `users` | Usuarios de Discord |
| `classes` | Clases del juego (14) |
| `dungeons` | Mazmorras disponibles |
| `characters` | Personajes de jugadores |
| `groups` | Grupos para mazmorras |
| `group_members` | Miembros de grupo |
| `applications` | Solicitudes de unión |
| `chat_messages` | Mensajes de grupo |
| `notifications` | Notificaciones |
| `wiki_posts` | Guías wiki |

**Para acceder a la BD:**
```bash
sqlite3 wakgroup.db
sqlite> .tables
sqlite> SELECT * FROM users;
```

---

## 🧪 Testing

### Backend

```bash
cd backend

# Build
npm run build

# Dev server
npm run dev

# Test endpoint
curl http://localhost:4000/health
# Respuesta: {"status":"ok","time":"2026-03-12T..."}
```

### Frontend

```bash
cd frontend

# Dev server
npm run dev

# Build
npm run build

# Revisar que compila sin errores
```

---

## 📦 Deployment

### Vercel (Frontend)

```bash
cd frontend
npm run build
vercel deploy --prod
```

### Railway / Heroku (Backend)

```bash
# Asegurar que .env está en variables de entorno
# En el panel de control:
# PORT: 4000
# NODE_ENV: production
# JWT_SECRET: [cambiar a algo seguro]
# DISCORD_*: [tus valores]

# Deploy
git push heroku main
# O usar Railway CLI
railway deploy
```

### Docker (Recomendado)

```bash
# Backend
cd backend
docker build -t wakfu-backend .
docker run -p 4000:4000 --env-file .env wakfu-backend

# Frontend
cd frontend
docker build -t wakfu-frontend .
docker run -p 3000:3000 wakfu-frontend
```

---

## 🔐 Seguridad

- ✅ **JWT en cookies** (httpOnly, Secure, SameSite)
- ✅ **CORS configurado**
- ✅ **Rate limiting** en endpoints
- ✅ **Validación de entrada** con express-validator
- ✅ **SQLi prevention** con prepared statements
- ✅ **XSS prevention** con sanitize-html

### Checklist de Producción

- [ ] Cambiar `JWT_SECRET` a string aleatorio fuerte
- [ ] Usar HTTPS en frontend y backend
- [ ] Configurar `FRONTEND_URL` correctamente
- [ ] Usar dominio real en Discord OAuth
- [ ] Habilitar backups de base de datos
- [ ] Monitorear logs y errores
- [ ] Usar `.env` con variables de entorno seguros

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'node:sqlite'"
**Solución:** Requiere Node.js >= 22.5. Actualiza Node.js.

### Error: "CORS error"
**Solución:** Verifica que `FRONTEND_URL` en `.env` es correcto (sin trailing slash).

### Error: "Discord OAuth failed"
**Solución:** 
- Verifica Client ID y Secret
- Verifica que `DISCORD_REDIRECT_URI` es exactamente igual
- Revisa que el app está habilitado en Discord

### Frontend no conecta al backend
**Solución:** 
- Verifica que `NEXT_PUBLIC_API_URL` en `.env.local` es correcto
- Verifica que backend está ejecutándose en puerto 4000
- Revisa CORS en `index.ts` del backend

### Base de datos vacía
**Solución:** 
```bash
cd backend
npm run seed
```

---

## 📖 Documentación

Ver carpeta `/docs` para:
- Guía de API completa
- Guía de desarrollo
- Guía de deployment

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

---

## 📄 Licencia

MIT

---

## 👨‍💻 Autor

WakGroup Platform - 2026

---

## 📞 Soporte

¿Problemas? Consulta:
- Documentación en `/docs`
- Issues en GitHub
- Discord community

---

**¡Disfruta buscando grupo! ⚔️🎮**



