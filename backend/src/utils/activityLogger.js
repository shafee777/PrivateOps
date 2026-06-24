import { query } from '../config/db.js';
import { cacheDelete } from '../config/redis.js';

/**
 * Helper to log activity events to the MySQL database and invalidate dashboard/timeline caches.
 * @param {number} userId - ID of the user performing action
 * @param {string} actionType - E.g. 'NOTE_CREATE', 'DOC_UPLOAD', 'EXPENSE_ADD', 'VAULT_UNLOCK'
 * @param {string} entityType - E.g. 'NOTE', 'DOCUMENT', 'FINANCE', 'SYSTEM'
 * @param {number} entityId - ID of the target object
 * @param {object} metadata - Optional additional JSON metadata
 */
export async function logActivity(userId, actionType, entityType, entityId, metadata = null) {
  try {
    const metadataStr = metadata ? JSON.stringify(metadata) : null;
    await query(
      'INSERT INTO activity_logs (user_id, action_type, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?)',
      [userId, actionType, entityType, entityId, metadataStr]
    );
    
    // Invalidate activity timeline cache
    await cacheDelete(`timeline:${userId}`);
    await cacheDelete(`dashboard:${userId}`);
  } catch (error) {
    console.error('[ActivityLogger] Error logging activity:', error);
  }
}

export default logActivity;
