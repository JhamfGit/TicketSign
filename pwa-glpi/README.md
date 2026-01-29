# Gestión de Actas Digitales - GLPI PRO

Esta es una PWA diseñada para el registro de mantenimientos TI con funcionamiento Offline-First.

## Requisitos
- Node.js (incluido de forma portable en `node-root`)

## Ejecución Local

### 1. Servidor (Backend)
```powershell
cd server
..\node-local.bat npm install  # Si no se ha hecho
..\node-local.bat npm run dev
```

### 2. Cliente (Frontend)
```powershell
cd client
..\node-local.bat npm install  # Si no se ha hecho
..\node-local.bat npm run dev
```

## Estructura del Proyecto
- `client/`: React + Vite + Dexie.js (IndexedDB).
- `server/`: Node + Express + Puppeteer (PDF) + GLPI API.
- `node-root/`: Node.js portable v20.11.0.

## Características
- [x] Funcionamiento Offline (Dexie.js)
- [x] Captura de firmas digitales
- [x] Registro de evidencias fotográficas
- [x] Generación de PDF profesional
- [x] Sincronización automática con GLPI
