import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import syncRoutes from './routes/sync.js';
import authRoutes from './routes/auth.js';
import reportsRoutes from './routes/reports.js';

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB Connection
import mongoose from 'mongoose';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ticketsign';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/reports', reportsRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes placeholders
// app.use('/api/auth', authRoutes);
// app.use('/api/sync', syncRoutes);
// app.use('/api/glpi', glpiRoutes);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
