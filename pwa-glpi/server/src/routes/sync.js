import express from 'express';
import { generateMaintenancePDF } from '../services/pdf.js';
import glpi from '../services/glpi.js';
import fs from 'fs/promises';
import path from 'path';
import Act from '../models/Act.js';

const router = express.Router();

router.post('/maintenance', async (req, res) => {
    const actData = req.body;

    try {
        console.log(`Procesando sincronización para ticket #${actData.glpi_ticket_id}`);

        // 1. Generar PDF
        const pdfBuffer = await generateMaintenancePDF(actData);
        const hostname = actData.equipment_hostname || 'S-H';
        const fileName = `Acta_${hostname}_${Date.now()}.pdf`;
        const tempPath = path.join(process.cwd(), 'temp', fileName);

        // Asegurar directorio temporal
        await fs.mkdir(path.dirname(tempPath), { recursive: true });
        await fs.writeFile(tempPath, pdfBuffer);

        // 0. Guardar en MongoDB
        // 0. Guardar en MongoDB

        // Buscar si ya existe para actualizar o crear nuevo
        let act = await Act.findOne({ glpi_ticket_id: actData.glpi_ticket_id });
        if (!act) {
            act = new Act(actData);
        } else {
            Object.assign(act, actData);
            act.updatedAt = new Date();
        }
        await act.save();
        console.log(`Acta guardada en DB: ${act._id}`);

        // 2. Subir a GLPI
        const docResult = await glpi.uploadDocument(actData.glpi_ticket_id, tempPath, fileName);

        // 3. Agregar seguimiento en GLPI
        await glpi.addFollowup(
            actData.glpi_ticket_id,
            `Se ha registrado el Acta de Mantenimiento Digital (${actData.type}). nombre Equipo: ${hostname} Documento ID: ${docResult.id}`
        );

        // 4. Limpiar temporal
        await fs.unlink(tempPath);

        res.status(200).json({
            status: 'success',
            glpiId: docResult.id
        });

    } catch (error) {
        console.error('Error en sincronización:', error);

        // Extraer mensaje de error más específico si existe
        const errorMessage = error.response?.data?.message || error.message || 'Error desconocido en la sincronización';

        res.status(500).json({
            status: 'error',
            message: errorMessage,
            details: error.response?.data || null
        });
    }
});

export default router;
