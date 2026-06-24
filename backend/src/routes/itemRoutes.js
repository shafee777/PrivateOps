import express from 'express';
import { getItems, getItemById, createItem, deleteItem } from '../controllers/itemController.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getItems);
router.get('/:id', getItemById);
router.post('/', upload.single('file'), createItem);
router.delete('/:id', deleteItem);

export default router;
