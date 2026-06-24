import { query } from '../config/db.js';

export async function setupSchema() {
  console.log('Ensuring database schema exists...');
  try {
    // 1. Users Table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        vault_pin_hash VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // 2. Categories Table
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        parent_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_category (user_id, name, parent_id)
      ) ENGINE=InnoDB;
    `);

    // 3. Items Table
    await query(`
      CREATE TABLE IF NOT EXISTS items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        category_id INT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        type ENUM('NOTE', 'PDF', 'IMAGE', 'VOICE', 'LINK', 'CERTIFICATE', 'RECEIPT', 'DOCUMENT') NOT NULL,
        file_url VARCHAR(1024) NULL,
        extracted_text TEXT NULL,
        tags JSON NULL,
        is_private BOOLEAN DEFAULT FALSE,
        requires_verification BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FULLTEXT INDEX item_search_idx (title, description, extracted_text)
      ) ENGINE=InnoDB;
    `);

    // 4. Item Embeddings Table (For local semantic search vectors)
    await query(`
      CREATE TABLE IF NOT EXISTS item_embeddings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_id INT NOT NULL,
        embedding JSON NOT NULL,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 5. Notes Table
    await query(`
      CREATE TABLE IF NOT EXISTS notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_id INT NOT NULL UNIQUE,
        content TEXT NOT NULL,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
        FULLTEXT INDEX notes_content_idx (content)
      ) ENGINE=InnoDB;
    `);

    // 6. Note Locks Table
    await query(`
      CREATE TABLE IF NOT EXISTS note_locks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        note_id INT NOT NULL UNIQUE,
        lock_hash VARCHAR(255) NOT NULL,
        auto_lock_seconds INT DEFAULT 60,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 7. Documents Table
    await query(`
      CREATE TABLE IF NOT EXISTS documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_id INT NOT NULL UNIQUE,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(1024) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        summary TEXT NULL,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 8. Voice Notes Table
    await query(`
      CREATE TABLE IF NOT EXISTS voice_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_id INT NOT NULL UNIQUE,
        transcript TEXT NULL,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
        FULLTEXT INDEX voice_transcript_idx (transcript)
      ) ENGINE=InnoDB;
    `);

    // 9. Finance Transactions Table
    await query(`
      CREATE TABLE IF NOT EXISTS finance_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('INCOME', 'EXPENSE') NOT NULL,
        category VARCHAR(100) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        note TEXT NULL,
        transaction_date DATE NOT NULL,
        receipt_document_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receipt_document_id) REFERENCES documents(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    // 10. Activity Logs Table
    await query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        action_type VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id INT NOT NULL,
        metadata JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    console.log('MySQL Schema verification complete.');
  } catch (error) {
    console.error('Error verifying MySQL schema:', error);
    throw error;
  }
}
