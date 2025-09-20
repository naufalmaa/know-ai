// Test script for database operations
import { db } from './db'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function setupDatabase() {
  console.log('🏗️  Setting up database schema...')
  try {
    // First, let's make sure we have the basic schema
    await db.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
    `)
    
    // Create users table if not exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS users(
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)
    
    // Create folders table if not exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS folders(
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
        owner_id UUID REFERENCES users(id),
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)
    
    // Create files table if not exists  
    await db.query(`
      CREATE TABLE IF NOT EXISTS files(
        id UUID PRIMARY KEY,
        folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
        owner_id UUID REFERENCES users(id),
        filename TEXT NOT NULL,
        mime_type TEXT,
        size BIGINT,
        checksum TEXT,
        s3_key TEXT NOT NULL UNIQUE,
        version INT NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)
    
    // Insert demo user
    await db.query(`
      INSERT INTO users(id, email, role) VALUES ('550e8400-e29b-41d4-a716-446655440000', 'demo@example.com', 'user')
      ON CONFLICT (email) DO NOTHING;
    `)
    
    console.log('✅ Database schema setup complete')
  } catch (error) {
    console.error('❌ Database setup failed:', error)
    throw error
  }
}

async function testDatabase() {
  console.log('🧪 Starting Database Tests...')
  
  try {
    // Setup database first
    await setupDatabase()
    
    // Test 1: Database connection
    console.log('\n1. Testing database connection...')
    const connectionTest = await db.query('SELECT NOW() as current_time')
    console.log('✅ Connection successful:', connectionTest.rows[0])
    
    // Test 2: File insertion
    console.log('\n2. Testing file insertion...')
    const testFileId = '123e4567-e89b-12d3-a456-426614174000' // Valid UUID format
    const insertResult = await db.query(
      'INSERT INTO files(id, folder_id, owner_id, filename, mime_type, size, s3_key) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [testFileId, null, '550e8400-e29b-41d4-a716-446655440000', 'test.pdf', 'application/pdf', 0, 'test/key/test.pdf']
    )
    console.log('✅ File inserted:', insertResult.rows[0])
    
    // Test 3: File update
    console.log('\n3. Testing file update...')
    const updateResult = await db.query(
      'UPDATE files SET size=$1, checksum=$2 WHERE id=$3 RETURNING *',
      [1000, 'test-checksum', testFileId]
    )
    console.log('✅ File updated:', updateResult.rows[0])
    console.log('📊 Update row count:', updateResult.rowCount)
    
    // Test 4: File lookup
    console.log('\n4. Testing file lookup...')
    const lookupResult = await db.query('SELECT * FROM files WHERE id=$1', [testFileId])
    console.log('✅ File found:', lookupResult.rows[0])
    console.log('📊 Lookup row count:', lookupResult.rowCount)
    
    // Test 5: Test UUID generation
    console.log('\n5. Testing UUID generation...')
    const generatedUUID = crypto.randomUUID()
    console.log('📝 Generated UUID:', generatedUUID)
    const uuidInsertResult = await db.query(
      'INSERT INTO files(id, owner_id, filename, s3_key) VALUES($1, $2, $3, $4) RETURNING *',
      [generatedUUID, '550e8400-e29b-41d4-a716-446655440000', 'uuid-test.pdf', `test/uuid/${generatedUUID}/test.pdf`]
    )
    console.log('✅ UUID file inserted:', uuidInsertResult.rows[0])
    
    // Test 6: Clean up
    console.log('\n6. Cleaning up test data...')
    const deleteResult1 = await db.query('DELETE FROM files WHERE id=$1', [testFileId])
    const deleteResult2 = await db.query('DELETE FROM files WHERE id=$1', [generatedUUID])
    console.log('✅ Test files deleted, rows affected:', deleteResult1.rowCount + deleteResult2.rowCount)
    
    console.log('\n🎉 All database tests passed!')
    
  } catch (error) {
    console.error('❌ Database test failed:', error)
    process.exit(1)
  }
}

// Run the test
testDatabase().then(() => {
  console.log('🏁 Test completed successfully')
  process.exit(0)
})