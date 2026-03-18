@echo off
setlocal enabledelayedexpansion

echo.
echo ======================================
echo   WAKFU LFG - SETUP AUTOMATICO
echo ======================================
echo.

REM Check Node.js
echo Verificando Node.js...
node -v >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js no está instalado
  echo Descargalo en: https://nodejs.org (>= 22.5)
  pause
  exit /b 1
)

echo Node.js version:
node -v
echo.

REM Backend Setup
echo.
echo ======================================
echo   BACKEND SETUP
echo ======================================
echo.

cd backend

echo Instalando dependencias del backend...
call npm install
if errorlevel 1 (
  echo ERROR: No se pudieron instalar dependencias
  pause
  exit /b 1
)

echo.
echo Configurando variables de entorno...

if not exist .env (
  echo Copiando .env.example a .env
  copy .env.example .env
  echo.
  echo *** IMPORTANTE ***
  echo Edita backend\.env con tus valores de Discord OAuth:
  echo 1. Ir a https://discord.com/developers/applications
  echo 2. Crear nueva app
  echo 3. Obtener Client ID y Client Secret
  echo 4. Copiar valores a .env
  echo.
  pause
) else (
  echo .env ya existe
)

echo.
echo Compilando TypeScript...
call npm run build
if errorlevel 1 (
  echo ERROR: No se pudo compilar backend
  pause
  exit /b 1
)

echo Backend compilado exitosamente!
echo.

REM Frontend Setup
cd ..\frontend

echo ======================================
echo   FRONTEND SETUP
echo ======================================
echo.

echo Instalando dependencias del frontend...
call npm install
if errorlevel 1 (
  echo ERROR: No se pudieron instalar dependencias
  pause
  exit /b 1
)

if not exist .env.local (
  echo Creando .env.local
  (
    echo NEXT_PUBLIC_API_URL=http://localhost:4000
  ) > .env.local
)

echo.
echo Compilando Next.js...
call npm run build
if errorlevel 1 (
  echo ERROR: No se pudo compilar frontend
  pause
  exit /b 1
)

echo Frontend compilado exitosamente!
echo.

REM Summary
echo.
echo ======================================
echo   SETUP COMPLETADO
echo ======================================
echo.

echo PROXIMOS PASOS:
echo.
echo 1. Backend:
echo    cd backend
echo    npm run dev
echo    (Backend en http://localhost:4000)
echo.
echo 2. Frontend (otra terminal):
echo    cd frontend
echo    npm run dev
echo    (Frontend en http://localhost:3000)
echo.
echo 3. Opcional - Popular base de datos:
echo    cd backend
echo    npm run seed
echo.

pause
