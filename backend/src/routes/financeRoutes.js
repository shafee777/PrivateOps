import express from 'express';
import { getTransactions, createTransaction, deleteTransaction, getFinanceAnalytics } from '../controllers/financeController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/analytics', getFinanceAnalytics);
router.get('/', getTransactions);
router.post('/', createTransaction);
router.delete('/:id', deleteTransaction);

export default router;
