import { SyncService } from './services/SyncService';

// No registramos sw.js manualmente en desarrollo si vite-plugin-pwa maneja la inyección virtual.
// El plugin de Vite se encarga de la lógica de registro automática definida en vite.config.js.

// Inicializar el servicio de sincronización
SyncService.init();
