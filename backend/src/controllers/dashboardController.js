import { query } from '../config/db.js';
import { cacheGet, cacheSet } from '../config/redis.js';

export async function getDashboardData(req, res) {
  const userId = req.user.id;
  const cacheKey = `dashboard:${userId}`;

  try {
    const cachedData = await cacheGet(cacheKey);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    // 1. Total Notes Count
    const notesCountRes = await query(
      'SELECT COUNT(*) as count FROM items WHERE user_id = ? AND type = "NOTE"',
      [userId]
    );
    const notesCount = notesCountRes[0]?.count || 0;

    // 2. Total Documents Count (PDF, IMAGE, CERTIFICATE, RECEIPT, DOCUMENT)
    const docsCountRes = await query(
      'SELECT COUNT(*) as count FROM items WHERE user_id = ? AND type IN ("PDF", "IMAGE", "CERTIFICATE", "RECEIPT", "DOCUMENT")',
      [userId]
    );
    const documentsCount = docsCountRes[0]?.count || 0;

    // 3. Total Expenses This Month
    const expensesRes = await query(`
      SELECT SUM(amount) as total 
      FROM finance_transactions 
      WHERE user_id = ? AND type = "EXPENSE"
        AND MONTH(transaction_date) = MONTH(CURDATE())
        AND YEAR(transaction_date) = YEAR(CURDATE())
    `, [userId]);
    const monthlyExpenses = parseFloat(expensesRes[0]?.total) || 0;

    // 4. Recent Items Uploaded/Created (last 5)
    const recentItems = await query(`
      SELECT id, title, type, file_url, is_private, requires_verification, created_at
      FROM items
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `, [userId]);

    // 5. Recent Activity Logs (last 6)
    const recentActivities = await query(`
      SELECT id, action_type, entity_type, entity_id, metadata, created_at
      FROM activity_logs
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 6
    `, [userId]);

    const dashboardPayload = {
      stats: {
        notesCount,
        documentsCount,
        monthlyExpenses,
      },
      recentItems: recentItems.map(item => ({
        ...item,
        is_private: !!item.is_private,
        requires_verification: !!item.requires_verification
      })),
      recentActivities: recentActivities.map(act => ({
        ...act,
        metadata: typeof act.metadata === 'string' ? JSON.parse(act.metadata) : act.metadata
      }))
    };

    // Cache dashboard payload for 3 minutes
    await cacheSet(cacheKey, dashboardPayload, 180);

    return res.status(200).json(dashboardPayload);
  } catch (error) {
    console.error('Get dashboard data error:', error);
    return res.status(500).json({ error: 'Failed to retrieve dashboard metrics' });
  }
}
