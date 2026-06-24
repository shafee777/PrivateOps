import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_private_ops_jwt_key';

/**
 * Middleware to protect API routes with standard JWT access token authentication.
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Access token invalid or expired' });
    }
    req.user = user;
    next();
  });
}

/**
 * Middleware to verify that the request has an active, valid Vault session.
 * Used for endpoints displaying highly sensitive items (Aadhaar, PAN, Passport, locked notes).
 * Expects the 'x-vault-token' header.
 */
export function verifyVaultAccess(req, res, next) {
  const vaultToken = req.headers['x-vault-token'];

  if (!vaultToken) {
    return res.status(403).json({ 
      error: 'Vault verification required', 
      requiresVaultUnlock: true 
    });
  }

  try {
    const decoded = jwt.verify(vaultToken, JWT_SECRET);
    
    // Ensure the vault token matches the logged-in user
    if (decoded.userId !== req.user.id || decoded.type !== 'vault_unlock') {
      return res.status(403).json({ 
        error: 'Vault token mismatch', 
        requiresVaultUnlock: true 
      });
    }
    
    next();
  } catch (error) {
    return res.status(403).json({ 
      error: 'Vault session expired. Please re-enter your PIN.', 
      requiresVaultUnlock: true 
    });
  }
}
