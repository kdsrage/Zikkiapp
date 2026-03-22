import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import * as dotenv from 'dotenv';

dotenv.config();

import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import foodRoutes from './routes/foods';
import logRoutes from './routes/log';
import weightRoutes from './routes/weight';
import aiRoutes from './routes/ai';

const app = express();

// Security & middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/log', logRoutes);
app.use('/api/weight', weightRoutes);
app.use('/api/ai', aiRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use(errorHandler);

export default app;
