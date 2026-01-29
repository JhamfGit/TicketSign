import mongoose from 'mongoose';

const actSchema = new mongoose.Schema({
    glpi_ticket_id: { type: String, required: true },
    client_name: String,
    technical_name: String,
    equipment_serial: String,
    equipment_hostname: String,
    equipment_model: String,
    assigned_user: String,
    inventory_number: String,
    type: { type: String, enum: ['PREVENTIVO', 'CORRECTIVO'] },
    status: { type: String, default: 'BORRADOR' },

    // Checklist dinámico
    checklist: { type: Map, of: mongoose.Schema.Types.Mixed },

    observations: String,
    recommendations: String,

    signatures: {
        technical: String,
        client: String
    },

    photos: [String],

    glpi_tracking_id: String, // ID del documento/seguimiento en GLPI

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Act', actSchema);
