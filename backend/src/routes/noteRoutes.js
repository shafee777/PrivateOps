import express from 'express';
import { updateNote } from '../controllers/noteController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.put('/:id', authenticateToken, updateNote);

export default router;
