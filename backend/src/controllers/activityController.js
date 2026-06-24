import { query } from '../config/db.js';
import { cacheGet, cacheSet } from '../config/redis.js';

export async function getActivityLogs(req, res) {
  const userId = req.user.id;
  const cacheKey = `timeline:${userId}`;

  try {
    const cachedData = await cacheGet(cacheKey);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const logs = await query(`
      SELECT id, action_type, entity_type, entity_id, metadata, created_at
      FROM activity_logs
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `, [userId]);

    const formattedLogs = logs.map(log => ({
      ...log,
      metadata: typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata
    }));

    await cacheSet(cacheKey, formattedLogs, 60); // Cache timeline for 60 seconds

    return res.status(200).json(formattedLogs);
  } catch (error) {
    console.error('Get activity logs error:', error);
    return res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
}
