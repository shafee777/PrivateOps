import express from 'express';
import { getActivityLogs } from '../controllers/activityController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, getActivityLogs);

export default router;
