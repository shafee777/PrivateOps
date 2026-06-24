import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool;

export async function initializeDatabase() {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const port = parseInt(process.env.DB_PORT || '3306');
  const database = process.env.DB_NAME || 'privateops';

  try {
    // Connect without specifying database to ensure it exists
    const tempConnection = await mysql.createConnection({ host, user, password, port });
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    await tempConnection.end();
    
    // Initialize pool
    pool = mysql.createPool({
      host,
      user,
      password,
      database,
      port,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: 'Z'
    });

    console.log(`Database pool connected to MySQL at ${host}:${port}/${database}`);
    return pool;
  } catch (error) {
    console.error('Failed to initialize MySQL Database Pool:', error);
    throw error;
  }
}

export async function query(sql, params) {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDatabase first.');
  }
  const [results] = await pool.execute(sql, params);
  return results;
}

export function getPool() {
  return pool;
}
