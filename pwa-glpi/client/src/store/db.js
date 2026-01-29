import Dexie from 'dexie';

export const db = new Dexie('MaintenanceDB');

// Esquema de la base de datos local
db.version(3).stores({
    acts: '++id, glpi_ticket_id, status, type, client_name, technical_name, createdAt, updatedAt',
    assets_cache: '++id, serial, hostname, ticket_id',
    sync_logs: '++id, act_id, timestamp, status, error'
});

/**
 * Guarda o actualiza un acta en estado BORRADOR
 */
export const saveDraftAct = async (actData) => {
    const timestamp = new Date().toISOString();
    if (actData.id) {
        return await db.acts.update(actData.id, {
            ...actData,
            updatedAt: timestamp
        });
    }
    return await db.acts.add({
        ...actData,
        status: 'BORRADOR',
        createdAt: timestamp,
        updatedAt: timestamp
    });
};

/**
 * Marca un acta como lista para sincronización
 */
export const markForSync = async (id) => {
    return await db.acts.update(id, {
        status: 'PENDIENTE_SINCRONIZACION',
        updatedAt: new Date().toISOString()
    });
};

/**
 * Obtiene todas las actas pendientes de sincronización
 */
export const getPendingSync = async () => {
    return await db.acts.where('status').equals('PENDIENTE_SINCRONIZACION').toArray();
};

/**
 * Actualiza el estado después de un intento de sincronización
 */
export const updateSyncStatus = async (id, status, error = null) => {
    const timestamp = new Date().toISOString();
    await db.acts.update(id, { status, updatedAt: timestamp });
    await db.sync_logs.add({
        act_id: id,
        timestamp,
        status,
        error
    });
};

/**
 * Obtiene el historial de actas sincronizadas
 */
export const getHistory = async () => {
    return await db.acts
        .where('status')
        .equals('SINCRONIZADO')
        .reverse()
        .sortBy('createdAt');
};

/**
 * Cache de assets para consulta offline
 */
export const cacheAsset = async (assetData) => {
    const existing = await db.assets_cache.where('serial').equals(assetData.serial).first();
    if (!existing) {
        return await db.assets_cache.add(assetData);
    }
    return existing.id;
};
