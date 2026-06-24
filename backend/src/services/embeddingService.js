import { pipeline } from '@xenova/transformers';
import { query } from '../config/db.js';

let extractor = null;
let isLoadingModel = false;

/**
 * Initializes the Hugging Face embedding pipeline locally.
 * Model will be cached in the default local folder.
 */
export async function initializeEmbeddingModel() {
  if (extractor) return;
  if (isLoadingModel) return;
  
  isLoadingModel = true;
  try {
    console.log('[EmbeddingService] Downloading and loading Xenova/all-MiniLM-L6-v2 model...');
    // We use all-MiniLM-L6-v2 which yields a 384-dimension vector. It's lightweight (~90MB) and very fast.
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('[EmbeddingService] Local embedding model loaded successfully.');
  } catch (error) {
    console.error('[EmbeddingService] Failed to load local embedding model:', error);
    console.warn('[EmbeddingService] System will run with standard MySQL Full-Text Search fallback.');
  } finally {
    isLoadingModel = false;
  }
}

/**
 * Generates an embedding vector for a given string of text.
 * @param {string} text 
 * @returns {Promise<Array<number>|null>}
 */
export async function generateEmbedding(text) {
  if (!text || typeof text !== 'string') return null;
  
  // Ensure the model is loaded, try loading if it hasn't succeeded
  if (!extractor) {
    await initializeEmbeddingModel();
    if (!extractor) {
      console.warn('[EmbeddingService] Model unavailable. Skipping embedding generation.');
      return null;
    }
  }

  try {
    const cleanText = text.replace(/\s+/g, ' ').trim();
    if (cleanText.length === 0) return null;
    
    const output = await extractor(cleanText, { pooling: 'mean', normalize: true });
    // Convert Float32Array to standard JavaScript array
    return Array.from(output.data);
  } catch (error) {
    console.error('[EmbeddingService] Error generating embedding:', error);
    return null;
  }
}

/**
 * Computes the cosine similarity between two vectors.
 * @param {Array<number>} vecA 
 * @param {Array<number>} vecB 
 * @returns {number} similarity score (between -1 and 1)
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Saves/Updates an item embedding in the database.
 * @param {number} itemId 
 * @param {Array<number>} embedding 
 */
export async function saveItemEmbedding(itemId, embedding) {
  if (!itemId || !embedding) return;
  const embeddingJson = JSON.stringify(embedding);
  
  try {
    const existing = await query('SELECT id FROM item_embeddings WHERE item_id = ?', [itemId]);
    if (existing.length > 0) {
      await query('UPDATE item_embeddings SET embedding = ? WHERE item_id = ?', [embeddingJson, itemId]);
    } else {
      await query('INSERT INTO item_embeddings (item_id, embedding) VALUES (?, ?)', [itemId, embeddingJson]);
    }
  } catch (error) {
    console.error(`[EmbeddingService] Error saving embedding for item ID ${itemId}:`, error);
  }
}

/**
 * Performs semantic search against items for a specific user.
 * @param {number} userId 
 * @param {string} queryText 
 * @param {number} limit 
 * @returns {Promise<Array<object>|null>} null if embedding model is not loaded, array of items with similarity score otherwise
 */
export async function searchSemanticItems(userId, queryText, limit = 15) {
  const queryVec = await generateEmbedding(queryText);
  if (!queryVec) {
    console.warn('[EmbeddingService] Query embedding generation failed or model not ready.');
    return null;
  }

  try {
    // Retrieve all embeddings for this user's items
    // Join with items and notes to get details
    const rows = await query(`
      SELECT 
        ie.item_id,
        ie.embedding,
        i.title,
        i.description,
        i.type,
        i.file_url,
        i.tags,
        i.is_private,
        i.requires_verification,
        i.category_id,
        i.created_at,
        c.name as category_name
      FROM item_embeddings ie
      JOIN items i ON ie.item_id = i.id
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE i.user_id = ?
    `, [userId]);

    if (rows.length === 0) return [];

    // Map rows and compute cosine similarity
    const matches = rows.map(row => {
      let embeddingVec;
      try {
        embeddingVec = typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding;
      } catch (err) {
        return null;
      }
      
      const similarity = cosineSimilarity(queryVec, embeddingVec);
      
      return {
        id: row.item_id,
        title: row.title,
        description: row.description,
        type: row.type,
        file_url: row.file_url,
        tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
        is_private: !!row.is_private,
        requires_verification: !!row.requires_verification,
        category_id: row.category_id,
        category_name: row.category_name,
        created_at: row.created_at,
        score: similarity
      };
    })
    .filter(item => item !== null && item.score > 0.35) // Filter out weak matches
    .sort((a, b) => b.score - a.score) // Sort descending
    .slice(0, limit);

    return matches;
  } catch (error) {
    console.error('[EmbeddingService] Error executing semantic search query:', error);
    return null;
  }
}
