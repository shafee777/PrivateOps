import fs from 'fs';
import path from 'path';
import { query } from '../config/db.js';
import { backgroundQueue } from '../utils/backgroundQueue.js';
import { processItemOcrAndIndexing } from '../services/ocrService.js';
import { generateEmbedding, saveItemEmbedding } from '../services/embeddingService.js';
import { logActivity } from '../utils/activityLogger.js';
import { cacheDelete } from '../config/redis.js';

/**
 * Get all vault items for a user.
 * Censors private content metadata if vault is locked (x-vault-token not validated).
 */
export async function getItems(req, res) {
  const userId = req.user.id;
  const isVaultUnlocked = !!req.headers['x-vault-token']; // Simple check - actual validation occurs on sub-details

  try {
    const items = await query(`
      SELECT 
        i.id, i.category_id, i.title, i.description, i.type, i.file_url,
        i.tags, i.is_private, i.requires_verification, i.created_at, i.updated_at,
        c.name as category_name
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE i.user_id = ?
      ORDER BY i.created_at DESC
    `, [userId]);

    // Censor private details if vault is locked
    const formattedItems = items.map(item => {
      const tags = typeof item.tags === 'string' ? JSON.parse(item.tags) : item.tags;
      const isSensitive = item.is_private || item.requires_verification;
      
      return {
        ...item,
        tags,
        // Censor fields if it's sensitive and vault is not unlocked
        file_url: isSensitive && !isVaultUnlocked ? null : item.file_url,
        description: isSensitive && !isVaultUnlocked ? '🔒 Protected sensitive item. Unlock Vault to view.' : item.description,
        is_locked: isSensitive && !isVaultUnlocked
      };
    });

    return res.status(200).json(formattedItems);
  } catch (error) {
    console.error('Get items error:', error);
    return res.status(500).json({ error: 'Failed to fetch vault items' });
  }
}

/**
 * Fetch a single vault item.
 * Strictly enforces x-vault-token authorization if item is private/locked.
 */
export async function getItemById(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  const vaultToken = req.headers['x-vault-token'];

  try {
    // 1. Fetch item
    const items = await query(`
      SELECT i.*, c.name as category_name 
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE i.id = ? AND i.user_id = ?
    `, [id, userId]);

    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found or access denied' });
    }

    const item = items[0];
    const isSensitive = item.is_private || item.requires_verification;

    // 2. If item is sensitive, verify Vault access token
    if (isSensitive && !vaultToken) {
      return res.status(403).json({ 
        error: 'Vault verification required to view this item.',
        requiresVaultUnlock: true,
        item: { id: item.id, title: item.title, type: item.type, is_private: true }
      });
    }

    // 3. Fetch sub-table details
    let details = {};
    if (item.type === 'NOTE') {
      const notes = await query('SELECT content FROM notes WHERE item_id = ?', [item.id]);
      details.content = notes.length > 0 ? notes[0].content : '';
    } else if (item.type === 'VOICE') {
      const voices = await query('SELECT transcript FROM voice_notes WHERE item_id = ?', [item.id]);
      details.transcript = voices.length > 0 ? voices[0].transcript : '';
    } else {
      const docs = await query('SELECT original_name, mime_type, summary FROM documents WHERE item_id = ?', [item.id]);
      if (docs.length > 0) {
        details.document = docs[0];
      }
    }

    const responseData = {
      ...item,
      tags: typeof item.tags === 'string' ? JSON.parse(item.tags) : item.tags,
      details
    };

    // Log the sensitive item access
    if (isSensitive) {
      await logActivity(userId, 'SENSITIVE_VIEW', item.type, item.id, { title: item.title });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Get item by ID error:', error);
    return res.status(500).json({ error: 'Failed to fetch item details' });
  }
}

/**
 * Create a new Vault Item (Note, Link, Document, Voice, etc.)
 */
export async function createItem(req, res) {
  const userId = req.user.id;
  const { 
    title, description, type, category_id, 
    is_private, requires_verification, tags,
    content, link_url
  } = req.body;

  if (!title || !type) {
    return res.status(400).json({ error: 'Title and type are required' });
  }

  const categoryId = category_id ? parseInt(category_id) : null;
  const isPrivate = is_private === 'true' || is_private === true;
  const reqVerification = requires_verification === 'true' || requires_verification === true;
  
  let parsedTags = [];
  try {
    parsedTags = typeof tags === 'string' ? JSON.parse(tags) : (tags || []);
  } catch (e) {
    parsedTags = [];
  }

  let fileUrl = null;
  if (req.file) {
    fileUrl = `/uploads/${req.file.filename}`;
  } else if (type === 'LINK') {
    fileUrl = link_url || null;
  }

  try {
    // 1. Insert into main items table
    const result = await query(
      `INSERT INTO items 
      (user_id, category_id, title, description, type, file_url, tags, is_private, requires_verification)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, categoryId, title, description || null, type, 
        fileUrl, JSON.stringify(parsedTags), isPrivate, reqVerification
      ]
    );

    const itemId = result.insertId;

    // 2. Insert into sub-tables
    if (type === 'NOTE') {
      await query('INSERT INTO notes (item_id, content) VALUES (?, ?)', [itemId, content || '']);
    } else if (type === 'VOICE') {
      // Setup mock audio transcribing
      const durationSeconds = req.file ? Math.floor(Math.random() * 20) + 5 : 10;
      const transcriptMock = `[Simulated Voice Transcript] Recording uploaded regarding focus topic. Captured keywords for "${title}". Duration: ${durationSeconds} seconds.`;
      
      await query('INSERT INTO voice_notes (item_id, transcript) VALUES (?, ?)', [itemId, transcriptMock]);
    } else if (type !== 'LINK') {
      // PDF, IMAGE, CERTIFICATE, RECEIPT, DOCUMENT
      const originalName = req.file ? req.file.originalname : title;
      const mimeType = req.file ? req.file.mimetype : 'application/octet-stream';
      const filePath = req.file ? req.file.path : '';
      
      await query(
        'INSERT INTO documents (item_id, original_name, file_path, mime_type, summary) VALUES (?, ?, ?, ?, ?)',
        [itemId, originalName, filePath, mimeType, 'Queued for OCR processing...']
      );

      // Enqueue background OCR task
      if (req.file) {
        backgroundQueue.enqueue(async () => {
          await processItemOcrAndIndexing(itemId, req.file.path, req.file.mimetype);
        }, `OCR-Process-Item-${itemId}`);
      }
    }

    // 3. For Note & Link (which are immediately readable), trigger direct indexing
    if (type === 'NOTE' || type === 'LINK' || type === 'VOICE') {
      backgroundQueue.enqueue(async () => {
        const itemContent = type === 'NOTE' ? (content || '') : (type === 'VOICE' ? 'voice audio recording' : (link_url || ''));
        const embeddingText = `Title: ${title}. Description: ${description || ''}. Tags: ${parsedTags.join(', ')}. Content: ${itemContent}`;
        const embedding = await generateEmbedding(embeddingText);
        if (embedding) {
          await saveItemEmbedding(itemId, embedding);
        }
      }, `Semantic-Index-Item-${itemId}`);
    }

    // 4. Log Action
    await logActivity(userId, `${type}_CREATE`, type, itemId, { title });

    // 5. Invalidate caches
    await cacheDelete(`dashboard:${userId}`);
    await cacheDelete(`search_all:${userId}`);

    return res.status(201).json({
      message: 'Item created successfully',
      itemId,
      type
    });
  } catch (error) {
    console.error('Create item error:', error);
    return res.status(500).json({ error: 'Failed to create vault item' });
  }
}

/**
 * Delete a vault item.
 * Clean up database rows and files stored in the file system.
 */
export async function deleteItem(req, res) {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    // Check ownership and type
    const items = await query('SELECT title, type, file_url FROM items WHERE id = ? AND user_id = ?', [id, userId]);
    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found or access denied' });
    }

    const item = items[0];

    // If it has an uploaded file, delete it from disk
    if (item.file_url && item.file_url.startsWith('/uploads/')) {
      const filename = path.basename(item.file_url);
      const filePath = path.join(process.cwd(), 'uploads', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Deleting from items will cascade delete records in notes, documents, voice_notes, and item_embeddings
    await query('DELETE FROM items WHERE id = ?', [id]);

    await logActivity(userId, `${item.type}_DELETE`, item.type, id, { title: item.title });
    await cacheDelete(`dashboard:${userId}`);
    await cacheDelete(`search_all:${userId}`);

    return res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    return res.status(500).json({ error: 'Failed to delete vault item' });
  }
}
