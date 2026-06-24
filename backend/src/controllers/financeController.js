import { query } from '../config/db.js';
import { logActivity } from '../utils/activityLogger.js';
import { cacheDelete, cacheGet, cacheSet } from '../config/redis.js';

export async function getTransactions(req, res) {
  const userId = req.user.id;

  try {
    const transactions = await query(`
      SELECT 
        ft.*,
        d.original_name as receipt_name,
        i.file_url as receipt_url
      FROM finance_transactions ft
      LEFT JOIN documents d ON ft.receipt_document_id = d.id
      LEFT JOIN items i ON d.item_id = i.id
      WHERE ft.user_id = ?
      ORDER BY ft.transaction_date DESC, ft.id DESC
    `, [userId]);

    return res.status(200).json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    return res.status(500).json({ error: 'Failed to fetch financial transactions' });
  }
}

export async function createTransaction(req, res) {
  const userId = req.user.id;
  const { type, category, amount, note, transaction_date, receipt_document_id } = req.body;

  if (!type || !category || !amount || !transaction_date) {
    return res.status(400).json({ error: 'Type, category, amount, and date are required' });
  }

  const receiptId = receipt_document_id ? parseInt(receipt_document_id) : null;
  const amt = parseFloat(amount);

  try {
    const result = await query(
      `INSERT INTO finance_transactions 
      (user_id, type, category, amount, note, transaction_date, receipt_document_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, type, category, amt, note || null, transaction_date, receiptId]
    );

    const transactionId = result.insertId;

    await logActivity(userId, 'FINANCE_ADD', 'FINANCE', transactionId, { amount: amt, type, category });
    
    // Clear financial/dashboard cache
    await cacheDelete(`finance_analytics:${userId}`);
    await cacheDelete(`dashboard:${userId}`);

    return res.status(201).json({
      message: 'Transaction recorded successfully',
      transactionId
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    return res.status(500).json({ error: 'Failed to log finance transaction' });
  }
}

export async function deleteTransaction(req, res) {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const check = await query('SELECT amount, type, category FROM finance_transactions WHERE id = ? AND user_id = ?', [id, userId]);
    if (check.length === 0) {
      return res.status(404).json({ error: 'Transaction not found or access denied' });
    }
    const t = check[0];

    await query('DELETE FROM finance_transactions WHERE id = ?', [id]);

    await logActivity(userId, 'FINANCE_DELETE', 'FINANCE', id, { amount: t.amount, type: t.type, category: t.category });
    
    await cacheDelete(`finance_analytics:${userId}`);
    await cacheDelete(`dashboard:${userId}`);

    return res.status(200).json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    return res.status(500).json({ error: 'Failed to delete transaction' });
  }
}

export async function getFinanceAnalytics(req, res) {
  const userId = req.user.id;
  const cacheKey = `finance_analytics:${userId}`;

  try {
    const cachedData = await cacheGet(cacheKey);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    // 1. Calculate Monthly aggregates (last 6 months)
    const monthlySummary = await query(`
      SELECT 
        DATE_FORMAT(transaction_date, '%b %Y') as month_year,
        SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as expense
      FROM finance_transactions
      WHERE user_id = ? AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(transaction_date, '%b %Y'), YEAR(transaction_date), MONTH(transaction_date)
      ORDER BY YEAR(transaction_date) ASC, MONTH(transaction_date) ASC
    `, [userId]);

    // 2. Category-wise Expense breakdown (for current month)
    const categoryBreakdown = await query(`
      SELECT 
        category,
        SUM(amount) as value
      FROM finance_transactions
      WHERE user_id = ? AND type = 'EXPENSE' 
        AND MONTH(transaction_date) = MONTH(CURDATE()) 
        AND YEAR(transaction_date) = YEAR(CURDATE())
      GROUP BY category
      ORDER BY value DESC
    `, [userId]);

    // 3. Current month totals
    const currentMonthTotals = await query(`
      SELECT 
        SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as expense
      FROM finance_transactions
      WHERE user_id = ? 
        AND MONTH(transaction_date) = MONTH(CURDATE()) 
        AND YEAR(transaction_date) = YEAR(CURDATE())
    `, [userId]);

    const totals = currentMonthTotals[0] || { income: 0, expense: 0 };
    const balance = (parseFloat(totals.income) || 0) - (parseFloat(totals.expense) || 0);

    const analyticsPayload = {
      monthlySummary,
      categoryBreakdown,
      currentMonth: {
        income: parseFloat(totals.income) || 0,
        expense: parseFloat(totals.expense) || 0,
        savings: balance > 0 ? balance : 0,
        savingsRate: totals.income > 0 ? Math.round((balance / totals.income) * 100) : 0
      }
    };

    // Cache the aggregates for 5 minutes
    await cacheSet(cacheKey, analyticsPayload, 300);

    return res.status(200).json(analyticsPayload);
  } catch (error) {
    console.error('Finance analytics error:', error);
    return res.status(500).json({ error: 'Failed to aggregate financial analytics' });
  }
}
