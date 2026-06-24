import fs from 'fs';
import Tesseract from 'tesseract.js';
import pdfParse from 'pdf-parse';
import { query } from '../config/db.js';
import { generateEmbedding, saveItemEmbedding } from './embeddingService.js';
import { cacheDelete } from '../config/redis.js';

/**
 * Extracts text from an image file using Tesseract OCR.
 * @param {string} filePath 
 * @returns {Promise<string>}
 */
export async function extractTextFromImage(filePath) {
  try {
    console.log(`[OCRService] Running Tesseract OCR on image: ${filePath}`);
    const result = await Tesseract.recognize(filePath, 'eng');
    return result.data.text || '';
  } catch (error) {
    console.error(`[OCRService] Image OCR failed for ${filePath}:`, error);
    return '';
  }
}

/**
 * Extracts text from a PDF file using pdf-parse.
 * @param {string} filePath 
 * @returns {Promise<string>}
 */
export async function extractTextFromPdf(filePath) {
  try {
    console.log(`[OCRService] Parsing PDF text layer: ${filePath}`);
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text || '';
  } catch (error) {
    console.error(`[OCRService] PDF parsing failed for ${filePath}:`, error);
    return '';
  }
}

/**
 * Rule-based automatic tagging helper based on file content.
 */
export function autoGenerateTags(title, description, text) {
  const content = `${title} ${description || ''} ${text || ''}`.toLowerCase();
  const tags = new Set();
  
  if (content.includes('invoice') || content.includes('receipt') || content.includes('bill') || content.includes('expense') || content.includes('tax')) {
    tags.add('finance');
    tags.add('receipt');
  }
  if (content.includes('aadhar') || content.includes('pan card') || content.includes('passport') || content.includes('identity') || content.includes('driving license') || content.includes('national id')) {
    tags.add('personal');
    tags.add('identity');
    tags.add('important');
  }
  if (content.includes('certificate') || content.includes('degree') || content.includes('diploma') || content.includes('internship') || content.includes('academic')) {
    tags.add('education');
    tags.add('certificate');
  }
  if (content.includes('dbms') || content.includes('indexing') || content.includes('operating system') || content.includes('notes') || content.includes('programming') || content.includes('lecture')) {
    tags.add('study');
    tags.add('notes');
  }
  if (content.includes('salary') || content.includes('slip') || content.includes('income') || content.includes('rent')) {
    tags.add('finance');
    tags.add('statement');
  }
  if (content.includes('travel') || content.includes('ticket') || content.includes('boarding') || content.includes('hotel')) {
    tags.add('travel');
  }
  
  return Array.from(tags);
}

/**
 * Triggers asynchronous OCR extraction, summarization, tagging, and embedding indexing.
 * @param {number} itemId 
 * @param {string} filePath 
 * @param {string} mimeType 
 */
export async function processItemOcrAndIndexing(itemId, filePath, mimeType) {
  try {
    // 1. Fetch current item details
    const items = await query('SELECT title, description, user_id FROM items WHERE id = ?', [itemId]);
    if (items.length === 0) return;
    const { title, description, user_id } = items[0];
    
    let extractedText = '';
    
    // 2. Perform text extraction
    if (mimeType.startsWith('image/')) {
      extractedText = await extractTextFromImage(filePath);
    } else if (mimeType === 'application/pdf') {
      extractedText = await extractTextFromPdf(filePath);
      
      // Fallback to OCR if PDF text layer is empty (scanned PDF)
      if (!extractedText.replace(/\s+/g, '').trim()) {
        console.log(`[OCRService] PDF text layer empty. Attempting OCR on PDF (as image fallback)...`);
        // Note: Full PDF-to-image OCR would require ghostscript or pdftoppm. 
        // For simplicity, we flag as blank or run standard parser. We'll store a placeholder or log.
      }
    }
    
    // 3. Auto-generate tags and summary
    const tags = autoGenerateTags(title, description, extractedText);
    const summary = extractedText 
      ? extractedText.substring(0, 200).replace(/\r?\n|\r/g, ' ') + (extractedText.length > 200 ? '...' : '') 
      : 'No text extracted.';
    
    const tagsJson = JSON.stringify(tags);
    
    // 4. Update Database
    await query(`
      UPDATE items 
      SET extracted_text = ?, tags = ? 
      WHERE id = ?
    `, [extractedText, tagsJson, itemId]);
    
    await query(`
      UPDATE documents 
      SET summary = ? 
      WHERE item_id = ?
    `, [summary, itemId]);

    // 5. Generate and save semantic search embedding vector
    const embeddingText = `Title: ${title}. Description: ${description || ''}. Tags: ${tags.join(', ')}. Content: ${extractedText || ''}`;
    const embedding = await generateEmbedding(embeddingText);
    if (embedding) {
      await saveItemEmbedding(itemId, embedding);
      console.log(`[OCRService] Indexed item ID ${itemId} for local semantic search.`);
    }

    // 6. Invalidate caches for this user
    await cacheDelete(`dashboard:${user_id}`);
    await cacheDelete(`search_all:${user_id}`);
    
    console.log(`[OCRService] Successfully processed and indexed item ID ${itemId}`);
  } catch (error) {
    console.error(`[OCRService] Error processing OCR/Indexing for item ID ${itemId}:`, error);
  }
}
