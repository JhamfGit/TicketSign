import express from 'express';
import { generateConsolidatedPDF, generateMaintenancePDF } from '../services/pdf.js';
import glpi from '../services/glpi.js';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

router.post('/consolidated', async (req, res) => {
    const { client_name, acts, projectId } = req.body;

    if (!projectId) {
        return res.status(400).json({ status: 'error', message: 'El ID de Proyecto es obligatorio para consolidados' });
    }

    try {
        console.log(`Generando reporte consolidado para: ${client_name} (Proyecto: ${projectId})`);

        // 1. Generar PDF Maestro
        const pdfBuffer = await generateConsolidatedPDF(client_name, acts);
        const fileName = `Consolidado_${client_name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
        const tempPath = path.join(process.cwd(), 'temp', fileName);

        await fs.mkdir(path.dirname(tempPath), { recursive: true });
        await fs.writeFile(tempPath, pdfBuffer);

        // 2. Subir a la tarea de proyecto especificada estrictamente como 'ProjectTask'
        const docResult = await glpi.uploadDocument(projectId, tempPath, fileName, 'ProjectTask');

        await fs.unlink(tempPath);

        res.status(200).json({
            status: 'success',
            glpiId: docResult.id
        });

    } catch (error) {
        console.error('Error en reporte consolidado:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

router.post('/export-consolidated', async (req, res) => {
    const { client_name, acts } = req.body;
    try {
        const pdfBuffer = await generateConsolidatedPDF(client_name, acts);
        res.contentType('application/pdf');
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error exportando consolidado:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

router.post('/individual', async (req, res) => {
    const actData = req.body;
    try {
        const pdfBuffer = await generateMaintenancePDF(actData);
        res.contentType('application/pdf');
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generando PDF individual:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

export default router;
