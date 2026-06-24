import { query } from '../config/db.js';
import { backgroundQueue } from '../utils/backgroundQueue.js';
import { generateEmbedding, saveItemEmbedding } from '../services/embeddingService.js';
import { logActivity } from '../utils/activityLogger.js';
import { cacheDelete } from '../config/redis.js';

/**
 * Updates note content and meta-properties (title, description, tags, private locks).
 */
export async function updateNote(req, res) {
  const userId = req.user.id;
  const { id } = req.params; // item_id of the note
  const { title, description, content, tags, is_private, requires_verification } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Note title is required' });
  }

  try {
    // Check if item exists and belongs to user
    const check = await query('SELECT id, title FROM items WHERE id = ? AND user_id = ? AND type = "NOTE"', [id, userId]);
    if (check.length === 0) {
      return res.status(404).json({ error: 'Note not found or access denied' });
    }

    const itemId = check[0].id;
    const isPrivate = is_private === true || is_private === 'true';
    const reqVerification = requires_verification === true || requires_verification === 'true';
    const tagsJson = tags ? JSON.stringify(tags) : '[]';

    // 1. Update items details
    await query(
      `UPDATE items 
       SET title = ?, description = ?, tags = ?, is_private = ?, requires_verification = ?
       WHERE id = ?`,
      [title, description || null, tagsJson, isPrivate, reqVerification, itemId]
    );

    // 2. Update notes content
    await query(
      'UPDATE notes SET content = ? WHERE item_id = ?',
      [content || '', itemId]
    );

    // 3. Re-index embedding for search
    backgroundQueue.enqueue(async () => {
      const parsedTags = tags || [];
      const embeddingText = `Title: ${title}. Description: ${description || ''}. Tags: ${parsedTags.join(', ')}. Content: ${content || ''}`;
      const embedding = await generateEmbedding(embeddingText);
      if (embedding) {
        await saveItemEmbedding(itemId, embedding);
      }
    }, `Update-Index-Note-${itemId}`);

    // 4. Log and cache invalidation
    await logActivity(userId, 'NOTE_EDIT', 'NOTE', itemId, { title });
    await cacheDelete(`dashboard:${userId}`);
    await cacheDelete(`search_all:${userId}`);

    return res.status(200).json({ message: 'Note updated successfully' });
  } catch (error) {
    console.error('Update note error:', error);
    return res.status(500).json({ error: 'Failed to update note content' });
  }
}
