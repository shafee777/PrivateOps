import express from 'express';
import { searchAll } from '../controllers/searchController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, searchAll);

export default router;
