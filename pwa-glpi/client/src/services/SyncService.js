import { db, updateSyncStatus, getPendingSync } from '../store/db';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const SyncService = {
    /**
     * Intenta sincronizar todas las actas pendientes
     */
    async syncPendingActs() {
        if (!navigator.onLine) return;

        const pending = await getPendingSync();
        if (pending.length === 0) return;

        console.log(`Iniciando sincronización de ${pending.length} actas...`);

        for (const act of pending) {
            try {
                const response = await fetch(`${API_BASE_URL}/sync/maintenance`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // 'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(act)
                });

                if (response.ok) {
                    const result = await response.json();
                    await updateSyncStatus(act.id, 'SINCRONIZADA');
                    console.log(`Acta ${act.id} sincronizada correctamente. GLPI ID: ${result.glpiId}`);
                } else {
                    const error = await response.text();
                    await updateSyncStatus(act.id, 'ERROR', error);
                }
            } catch (err) {
                console.error(`Error sincronizando acta ${act.id}:`, err);
                await updateSyncStatus(act.id, 'ERROR', err.message);
            }
        }
    },

    /**
     * Trae cambios del servidor al cliente
     */
    async pullRemoteChanges() {
        if (!navigator.onLine) return;

        try {
            const response = await fetch(`${API_BASE_URL}/sync/maintenance?limit=50`);
            if (response.ok) {
                const remoteActs = await response.json();
                if (remoteActs && remoteActs.length > 0) {
                    const { saveRemoteActs } = await import('../store/db');
                    await saveRemoteActs(remoteActs);
                    console.log(`Sincronizados ${remoteActs.length} registros del servidor.`);
                }
            }
        } catch (error) {
            console.error('Error obteniendo datos remotos:', error);
        }
    },

    /**
     * Inicia un listener para cambios de conexión
     */
    init() {
        window.addEventListener('online', () => {
            console.log('Conexión restaurada. Intentando sincronizar...');
            this.syncPendingActs();
            this.pullRemoteChanges();
        });

        // También intentar sincronizar al cargar la app
        this.syncPendingActs();
        this.pullRemoteChanges();
    }
};
