import { query } from '../config/db.js';
import { searchSemanticItems } from '../services/embeddingService.js';

/**
 * Intelligent Global Search across notes, documents, voice notes, and finance.
 * Dynamically chooses between Local Semantic Search, MySQL Full-Text Search, and Finance heuristical filters.
 */
export async function searchAll(req, res) {
  const userId = req.user.id;
  const { q } = req.query;
  const isVaultUnlocked = !!req.headers['x-vault-token'];

  if (!q) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const queryText = q.trim();
  const lowerQuery = queryText.toLowerCase();

  try {
    const combinedResults = [];

    // --- HEURISTIC 1: Check for Finance Expense Searches (e.g., "travel expenses from April", "rent expenses") ---
    const monthNames = {
      january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
      may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8, september: 9, sep: 9, sept: 9,
      october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12
    };

    let isFinanceSearch = lowerQuery.includes('expense') || lowerQuery.includes('spend') || lowerQuery.includes('income') || lowerQuery.includes('salary');
    let monthMatch = null;
    
    // Check if any month name is in the query
    for (const [name, num] of Object.entries(monthNames)) {
      if (lowerQuery.includes(name)) {
        monthMatch = num;
        isFinanceSearch = true; // assume finance search if month is specified with keywords
        break;
      }
    }

    if (isFinanceSearch) {
      console.log(`[SearchController] Heuristic finance query detected: "${queryText}"`);
      let financeSql = 'SELECT id, type, category, amount, note, transaction_date FROM finance_transactions WHERE user_id = ?';
      const params = [userId];

      if (monthMatch) {
        financeSql += ' AND MONTH(transaction_date) = ?';
        params.push(monthMatch);
      }

      // Check category match
      const categories = ['travel', 'rent', 'food', 'utility', 'utilities', 'shopping', 'salary', 'grocery', 'groceries'];
      for (const cat of categories) {
        if (lowerQuery.includes(cat)) {
          financeSql += ' AND (category LIKE ? OR note LIKE ?)';
          params.push(`%${cat}%`, `%${cat}%`);
          break;
        }
      }

      financeSql += ' ORDER BY transaction_date DESC LIMIT 10';
      const financeItems = await query(financeSql, params);
      
      financeItems.forEach(item => {
        combinedResults.push({
          id: `finance-${item.id}`,
          title: `${item.type}: ${item.category} ($${item.amount})`,
          description: item.note || `Transaction logged on ${item.transaction_date.toISOString().split('T')[0]}`,
          type: 'FINANCE',
          created_at: item.transaction_date,
          score: 0.95, // High heuristic score
          tags: [item.category.toLowerCase(), item.type.toLowerCase()],
          is_locked: false,
          original_id: item.id
        });
      });
    }

    // --- METHOD 2: Try Local Semantic Search ---
    const semanticResults = await searchSemanticItems(userId, queryText, 10);
    
    if (semanticResults && semanticResults.length > 0) {
      console.log(`[SearchController] Semantic Search returned ${semanticResults.length} matches.`);
      semanticResults.forEach(item => {
        // Censor private details if vault is locked
        const isSensitive = item.is_private || item.requires_verification;
        
        combinedResults.push({
          id: `item-${item.id}`,
          title: item.title,
          description: isSensitive && !isVaultUnlocked ? '🔒 Protected sensitive item. Unlock Vault to view.' : item.description,
          type: item.type,
          file_url: isSensitive && !isVaultUnlocked ? null : item.file_url,
          tags: item.tags,
          is_private: item.is_private,
          requires_verification: item.requires_verification,
          category_name: item.category_name,
          created_at: item.created_at,
          score: item.score,
          is_locked: isSensitive && !isVaultUnlocked,
          original_id: item.id
        });
      });
    }

    // --- METHOD 3: Fallback / Layer with MySQL Full-Text Search (to capture direct string matches) ---
    // Search main items table
    const ftsItems = await query(`
      SELECT 
        i.id, i.title, i.description, i.type, i.file_url, i.tags, i.is_private, i.requires_verification, i.created_at,
        c.name as category_name
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE i.user_id = ? AND (
        MATCH(i.title, i.description, i.extracted_text) AGAINST(? IN NATURAL LANGUAGE MODE)
        OR i.title LIKE ? OR i.description LIKE ?
      )
      LIMIT 10
    `, [userId, queryText, `%${queryText}%`, `%${queryText}%`]);

    ftsItems.forEach(item => {
      // Check if already added by semantic search or finance
      if (combinedResults.some(r => r.id === `item-${item.id}`)) return;

      const isSensitive = item.is_private || item.requires_verification;
      const tags = typeof item.tags === 'string' ? JSON.parse(item.tags) : item.tags;

      combinedResults.push({
        id: `item-${item.id}`,
        title: item.title,
        description: isSensitive && !isVaultUnlocked ? '🔒 Protected sensitive item. Unlock Vault to view.' : item.description,
        type: item.type,
        file_url: isSensitive && !isVaultUnlocked ? null : item.file_url,
        tags,
        is_private: !!item.is_private,
        requires_verification: !!item.requires_verification,
        category_name: item.category_name,
        created_at: item.created_at,
        score: 0.8, // Neutral FTS score
        is_locked: isSensitive && !isVaultUnlocked,
        original_id: item.id
      });
    });

    // Sort combined results by score descending
    combinedResults.sort((a, b) => b.score - a.score);

    return res.status(200).json(combinedResults);
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Search failed due to internal error' });
  }
}
