import express from 'express';
import { register, login, refreshToken, setupVaultPin, unlockVault } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/vault-pin', authenticateToken, setupVaultPin);
router.post('/vault-unlock', authenticateToken, unlockVault);

export default router;
