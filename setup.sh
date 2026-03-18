#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎮 WAKFU LFG - SETUP AUTOMÁTICO${NC}\n"

# Check Node.js version
echo "📌 Verificando Node.js >= 22.5..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1,2)
if (( $(echo "$NODE_VERSION < 22.5" | bc -l) )); then
  echo -e "${RED}❌ Node.js >= 22.5 es requerido. Actual: $(node -v)${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}\n"

# Backend Setup
echo -e "${BLUE}🚀 BACKEND SETUP${NC}"
cd backend

echo "📦 Instalando dependencias backend..."
npm install

echo -e "${YELLOW}⚠️  Configurando variables de entorno...${NC}"
if [ ! -f .env ]; then
  echo "   Copiando .env.example a .env"
  cp .env.example .env
  echo -e "${YELLOW}   ⚠️  POR FAVOR: Edita backend/.env con tus valores de Discord OAuth${NC}"
  echo -e "${YELLOW}       1. Ir a https://discord.com/developers/applications${NC}"
  echo -e "${YELLOW}       2. Crear nueva app y obtener Client ID y Secret${NC}"
  echo -e "${YELLOW}       3. Copiar valores a backend/.env${NC}"
  read -p "   Presiona ENTER cuando hayas configurado .env..."
else
  echo -e "${GREEN}✅ .env ya existe${NC}"
fi

echo "🏗️  Compilando TypeScript..."
npm run build

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Error compilando backend${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Backend compilado${NC}\n"

# Frontend Setup
cd ../frontend

echo -e "${BLUE}🎨 FRONTEND SETUP${NC}"
echo "📦 Instalando dependencias frontend..."
npm install

if [ ! -f .env.local ]; then
  echo "   Creando .env.local"
  cp .env.local .env.local 2>/dev/null || echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
fi
echo -e "${GREEN}✅ Frontend listo${NC}\n"

# Test build
echo "🏗️  Compilando Next.js..."
npm run build

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Error compilando frontend${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Frontend compilado${NC}\n"

# Summary
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ SETUP COMPLETADO EXITOSAMENTE!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}\n"

echo -e "${BLUE}📝 PRÓXIMOS PASOS:${NC}\n"
echo "1. Backend:"
echo -e "   ${YELLOW}cd backend${NC}"
echo -e "   ${YELLOW}npm run dev${NC}"
echo "   (Backend en http://localhost:4000)\n"

echo "2. Frontend (en otra terminal):"
echo -e "   ${YELLOW}cd frontend${NC}"
echo -e "   ${YELLOW}npm run dev${NC}"
echo "   (Frontend en http://localhost:3000)\n"

echo "3. Opcional - Popular base de datos con datos iniciales:"
echo -e "   ${YELLOW}cd backend${NC}"
echo -e "   ${YELLOW}npm run seed${NC}\n"

echo -e "${GREEN}¡Disfruta buscando grupo! ⚔️${NC}\n"
