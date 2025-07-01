// migrate.ts
import { client, connectDatabase } from './db.js';

async function createTables() {
  try {
    console.log('🔧 Starting comprehensive database migration...');
    
    await connectDatabase();

    // Drop and recreate tables to ensure clean schema
    console.log('🗑️ Dropping existing tables...');
    await client.query('DROP TABLE IF EXISTS submissions CASCADE;');
    await client.query('DROP TABLE IF EXISTS contacts CASCADE;');
    await client.query('DROP TABLE IF EXISTS users CASCADE;');

    console.log('🔨 Creating users table...');
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        uid TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        name TEXT,
        phone TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('🔨 Creating submissions table with ALL required columns...');
    await client.query(`
      CREATE TABLE submissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100),
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        age VARCHAR(10),
        poem_title VARCHAR(255) NOT NULL,
        tier VARCHAR(50) NOT NULL,
        price DECIMAL(10,2) DEFAULT 0.00,
        poem_file_url TEXT,
        photo_url TEXT,
        payment_id VARCHAR(255),
        payment_method VARCHAR(50),
        submission_uuid VARCHAR(255) NOT NULL DEFAULT gen_random_uuid(),
        poem_index INTEGER DEFAULT 0 NOT NULL,
        total_poems_in_submission INTEGER DEFAULT 1 NOT NULL,
        submitted_at TIMESTAMP DEFAULT NOW() NOT NULL,
        status VARCHAR(50) DEFAULT 'pending' NOT NULL,
        score INTEGER,
        type VARCHAR(50) DEFAULT 'Human',
        score_breakdown JSONB,
        is_winner BOOLEAN DEFAULT FALSE,
        winner_position INTEGER
      );
    `);

    console.log('🔨 Creating contacts table...');
    await client.query(`
      CREATE TABLE contacts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        message TEXT NOT NULL,
        subject TEXT,
        submitted_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('📊 Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
      CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions(email);
      CREATE INDEX IF NOT EXISTS idx_submissions_uuid ON submissions(submission_uuid);
    `);

    console.log('✅ Database migration completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    return false;
  }
}

export { createTables };