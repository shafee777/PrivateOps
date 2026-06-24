import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { query } from '../config/db.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_private_ops_jwt_key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_private_ops_refresh_jwt_key';

// Helper to generate access tokens
function generateAccessToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '1h' });
}

// Helper to generate refresh tokens
function generateRefreshToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export async function register(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    // Check if user exists
    const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Save user
    const result = await query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, passwordHash]
    );

    const userId = result.insertId;
    const user = { id: userId, name, email };
    
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.status(201).json({
      message: 'User registered successfully',
      user,
      accessToken,
      refreshToken,
      hasVaultPin: false
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
}

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const users = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const userData = { id: user.id, name: user.name, email: user.email };
    const accessToken = generateAccessToken(userData);
    const refreshToken = generateRefreshToken(userData);

    return res.status(200).json({
      message: 'Login successful',
      user: userData,
      accessToken,
      refreshToken,
      hasVaultPin: !!user.vault_pin_hash
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
}

export async function refreshToken(req, res) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token is required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    
    const users = await query('SELECT id, name, email, vault_pin_hash FROM users WHERE id = ?', [decoded.id]);
    if (users.length === 0) {
      return res.status(403).json({ error: 'User no longer exists' });
    }

    const user = users[0];
    const userData = { id: user.id, name: user.name, email: user.email };
    const newAccessToken = generateAccessToken(userData);

    return res.status(200).json({
      accessToken: newAccessToken,
      hasVaultPin: !!user.vault_pin_hash
    });
  } catch (error) {
    return res.status(403).json({ error: 'Refresh token invalid or expired' });
  }
}

export async function setupVaultPin(req, res) {
  const { pin } = req.body;
  const userId = req.user.id;

  if (!pin || pin.length < 4 || pin.length > 6) {
    return res.status(400).json({ error: 'Vault PIN must be between 4 and 6 digits' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const pinHash = await bcrypt.hash(pin, salt);

    await query('UPDATE users SET vault_pin_hash = ? WHERE id = ?', [pinHash, userId]);

    return res.status(200).json({ message: 'Master Vault PIN configured successfully' });
  } catch (error) {
    console.error('Setup PIN error:', error);
    return res.status(500).json({ error: 'Failed to configure Vault PIN' });
  }
}

export async function unlockVault(req, res) {
  const { pin } = req.body;
  const userId = req.user.id;

  if (!pin) {
    return res.status(400).json({ error: 'Vault PIN is required to unlock' });
  }

  try {
    const users = await query('SELECT vault_pin_hash, password_hash FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    let isMatch = false;

    if (user.vault_pin_hash) {
      isMatch = await bcrypt.compare(pin, user.vault_pin_hash);
    } else {
      // Fallback: If no PIN is configured, allow unlocking with user's login password
      isMatch = await bcrypt.compare(pin, user.password_hash);
    }

    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect verification credentials' });
    }

    // Generate short-lived (5 min) vault token
    const vaultToken = jwt.sign(
      { userId, type: 'vault_unlock' }, 
      JWT_SECRET, 
      { expiresIn: '5m' }
    );

    return res.status(200).json({
      message: 'Vault unlocked successfully',
      vaultToken,
      expiresIn: 300 // 5 minutes in seconds
    });
  } catch (error) {
    console.error('Unlock vault error:', error);
    return res.status(500).json({ error: 'Failed to unlock Vault' });
  }
}
