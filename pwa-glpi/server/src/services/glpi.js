import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

class GLPIConnector {
    constructor() {
        this.sessionToken = null;
    }

    get config() {
        return {
            apiUrl: process.env.GLPI_API_URL,      // Debe ser https://service.jhamf.com/apirest.php
            appToken: process.env.GLPI_APP_TOKEN,
            userToken: process.env.GLPI_USER_TOKEN
        };
    }

    /**
     * Inicializa la sesión en GLPI
     */
    async initSession() {
        const { apiUrl, appToken, userToken } = this.config;
        console.log(`[GLPI] Iniciando sesión en: ${apiUrl}`);

        if (!apiUrl) throw new Error('GLPI_API_URL no configurado');

        try {
            console.log(`[GLPI] Intentando conectar con App-Token: ${appToken ? 'OK' : 'MISSING'} y User-Token: ${userToken ? 'OK' : 'MISSING'}`);

            const response = await axios.get(`${apiUrl}/initSession`, {
                params: {
                    get_full_session: true
                },
                headers: {
                    'App-Token': appToken,
                    'Authorization': `user_token ${userToken}`
                }
            });

            this.sessionToken = response.data.session_token;
            const currentProfile = response.data.session?.glpiprofiles?.name || 'Desconocido';
            const activeProfileId = response.data.session.glpiactiveprofile?.id;
            const activeProfileName = response.data.session.glpiactiveprofile?.name;

            console.log(`[GLPI] Sesión establecida. ID Sesión: ${this.sessionToken?.substring(0, 10)}...`);
            console.log(`[GLPI] Perfil Activo: ${activeProfileName} (ID: ${activeProfileId})`);

            // Auto-switch profile logic
            let profiles = response.data.session?.glpiprofiles || [];

            // Si profiles no es un array (ej: un objeto si solo hay uno), convertirlo
            if (!Array.isArray(profiles)) {
                // Si es un objeto, lo ponemos en un array. Si es null/undefined, array vacío.
                profiles = profiles ? [profiles] : [];
            }

            const currentProfileName = (activeProfileName || '').toLowerCase();
            const allowedProfiles = ['especialistas', 'super-admin', 'admin'];

            // Verificar si el perfil actual ya es de alto privilegio
            const isAlreadyAllowed = allowedProfiles.some(p => currentProfileName.includes(p));

            if (isAlreadyAllowed) {
                console.log(`[GLPI] Perfil actual '${activeProfileName}' tiene privilegios suficientes. No se requiere cambio.`);
            } else {
                // Intentar encontrar un perfil de alto privilegio en la lista
                const targetProfile = profiles.find(p =>
                    p.name && allowedProfiles.some(hp => p.name.toLowerCase().includes(hp))
                );

                if (targetProfile && targetProfile.id !== activeProfileId) {
                    console.log(`[GLPI] Cambiando a perfil con mayores privilegios: ${targetProfile.name} (ID: ${targetProfile.id})`);
                    await axios.post(`${apiUrl}/changeActiveProfile`, {
                        profiles_id: targetProfile.id
                    }, {
                        headers: {
                            'App-Token': appToken,
                            'Session-Token': this.sessionToken
                        }
                    });
                    console.log('[GLPI] Perfil cambiado exitosamente.');
                } else {
                    console.log(`[GLPI] No se encontró un perfil mejor. Operando con: ${activeProfileName}`);
                }
            }

            return this.sessionToken;
        } catch (error) {
            console.error('[GLPI] Error FATAL en initSession:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Busca un activo (Computadora) por Numero de Inventario o Serial
     */
    async findComputer(query) {
        if (!this.sessionToken) await this.initSession();
        const { apiUrl, appToken } = this.config;

        try {
            const response = await axios.get(`${apiUrl}/Computer`, {
                params: {
                    searchText: query,
                    is_deleted: 0
                },
                headers: {
                    'App-Token': appToken,
                    'Session-Token': this.sessionToken
                }
            });
            return response.data[0] || null;
        } catch (error) {
            console.error('[GLPI] Error en findComputer:', error.message);
            return null;
        }
    }

    /**
     * Sube un documento y lo asocia a un ítem (Ticket o Project)
     */
    async uploadDocument(itemId, filePath, fileName, itemtype = 'Ticket') {
        if (!this.sessionToken) await this.initSession();
        const { apiUrl, appToken } = this.config;

        try {
            // 0. Diagnóstico previo (solo para Tickets)
            if (false && itemtype === 'Ticket') {
                try {
                    const ticketResponse = await axios.get(`${apiUrl}/Ticket/${itemId}`, {
                        headers: {
                            'App-Token': appToken,
                            'Session-Token': this.sessionToken
                        }
                    });
                    const ticket = ticketResponse.data;
                    console.log(`[GLPI] Diagnóstico Ticket #${itemId}: Estado=${ticket.status}, Entidad=${ticket.entities_id}`);

                    // Verificar Entidad Activa
                    const sessionResponse = await axios.get(`${apiUrl}/getMyProfiles`, {
                        headers: { 'App-Token': appToken, 'Session-Token': this.sessionToken }
                    });
                    // Nota: getMyProfiles no da la entidad activa, usamos session token info si fuera posible o asumimos la default.
                    // Mejor intentar cambiar entidad si difiere

                } catch (ticketError) {
                    console.error(`[GLPI] Error al consultar Ticket #${itemId}:`, ticketError.message);
                }
            }

            console.log(`[GLPI] Subiendo archivo a: ${apiUrl}/Document`);
            const form = new FormData();
            form.append('uploadManifest', JSON.stringify({
                input: {
                    name: `Consolidado - ${fileName}`,
                    _filename: [fileName]
                }
            }));
            form.append('filename', fs.createReadStream(filePath));

            // 1. Subir documento
            const response = await axios.post(`${apiUrl}/Document`, form, {
                headers: {
                    ...form.getHeaders(),
                    'App-Token': appToken,
                    'Session-Token': this.sessionToken
                }
            });

            const docId = response.data.id;
            console.log(`[GLPI] Documento creado (ID: ${docId}). Vinculando al ${itemtype} #${itemId}...`);

            // 2. Asociar al Ítem
            await axios.post(`${apiUrl}/Document_Item`, {
                input: {
                    documents_id: docId,
                    items_id: itemId,
                    itemtype: itemtype
                }
            }, {
                headers: {
                    'App-Token': appToken,
                    'Session-Token': this.sessionToken
                }
            });

            return { id: docId, success: true };
        } catch (error) {
            console.error(`[GLPI] ERROR DETALLADO en uploadDocument:`, {
                status: error.response?.status,
                data: error.response?.data,
                itemtype,
                itemId,
                url: this.config.apiUrl
            });
            const errorMessage = JSON.stringify(error.response?.data) || error.message;
            throw new Error(`GLPI Upload Error: ${errorMessage}`);
        }
    }

    /**
     * Agrega un seguimiento al ítem
     */
    async addFollowup(itemId, content, itemtype = 'Ticket') {
        if (!this.sessionToken) await this.initSession();
        const { apiUrl, appToken } = this.config;

        // GLPI usa ITILFollowup para Tickets, pero para Projects podría variar. 
        // Si es Project, solemos usar un comentario o el Document_Item es suficiente.
        // Mantenemos ITILFollowup solo para Tickets por ahora.
        if (itemtype !== 'Ticket') return;

        try {
            await axios.post(`${apiUrl}/ITILFollowup`, {
                input: {
                    items_id: itemId,
                    itemtype: itemtype,
                    content: content,
                    is_private: 0
                }
            }, {
                headers: {
                    'App-Token': appToken,
                    'Session-Token': this.sessionToken
                }
            });
            console.log(`[GLPI] Seguimiento añadido al ${itemtype} #${itemId}`);
        } catch (error) {
            console.error(`[GLPI] Error en addFollowup para ${itemtype}:`, error.response?.data || error.message);
        }
    }
}

export default new GLPIConnector();
