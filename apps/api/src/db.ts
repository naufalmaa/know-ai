import { Pool } from 'pg'
import { mockDb } from './mockDb'

// PostgreSQL connection configuration
const POSTGRES_URL = process.env.POSTGRES_URL || 'postgresql://postgres:a@localhost:5432/know_ai'

console.log('[DB] Connecting to:', POSTGRES_URL.replace(/\/\/.*@/, '//***@'))

const pgPool = new Pool({ 
  connectionString: POSTGRES_URL,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10
})

// Test PostgreSQL connection and fallback to mock if needed
let usePostgreSQL = false;

async function testConnection() {
  try {
    const client = await pgPool.connect();
    await client.query('SELECT 1');
    client.release();
    usePostgreSQL = true;
    console.log('[DB] ✅ PostgreSQL connection successful!');
    return true;
  } catch (error: any) {
    console.log('[DB] ❌ PostgreSQL connection failed, using mock database');
    console.log('[DB] Error:', error.message);
    console.log('[DB] To use PostgreSQL: ensure database is running and credentials are correct');
    return false;
  }
}

// Initialize connection test
testConnection();

// Database interface that switches between PostgreSQL and mock
export const db = {
  async query(text: string, params: any[] = []) {
    if (usePostgreSQL) {
      try {
        return await pgPool.query(text, params);
      } catch (error: any) {
        console.error('[DB] PostgreSQL query failed:', error.message);
        console.log('[DB] Falling back to mock database');
        return await mockDb.query(text, params);
      }
    } else {
      return await mockDb.query(text, params);
    }
  },
  
  // Health check method
  async isConnected() {
    return usePostgreSQL;
  },
  
  // Force retry PostgreSQL connection
  async reconnect() {
    return await testConnection();
  }
};