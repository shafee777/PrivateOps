import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import { initializeDatabase } from './config/db.js';
import { setupSchema } from './database/schema.js';
import { initializeRedis } from './config/redis.js';
import { initializeEmbeddingModel } from './services/embeddingService.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import itemRoutes from './routes/itemRoutes.js';
import noteRoutes from './routes/noteRoutes.js';
import financeRoutes from './routes/financeRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import activityRoutes from './routes/activityRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security and utility middleware
app.use(helmet({
  crossOriginResourcePolicy: false // Allow loading files in browser via frontend
}));
app.use(cors());
app.use(express.json());

// Serving uploaded files (Receipts, PDF, Image documents, Voice files)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Rate limiting to secure endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api', limiter);

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/activity', activityRoutes);

// Health Check
app.get('/health', (req, res) => res.json({ status: 'ok', server: 'PrivateOps', uptime: process.uptime() }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', server: 'PrivateOps', uptime: process.uptime() }));

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err.stack || err);
  res.status(500).json({ error: err.message || 'An unexpected error occurred on the server' });
});

// App Startup
async function startServer() {
  try {
    // 1. Setup Database
    await initializeDatabase();
    await setupSchema();
    
    // 2. Setup Caching
    await initializeRedis();

    // 3. Start Express server
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`PrivateOps Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`URL: http://localhost:${PORT}`);
      console.log(`====================================================`);
    });

    // 4. Asynchronously load the local Embedding model (all-MiniLM-L6-v2) so server starts instantly
    initializeEmbeddingModel();
    
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
