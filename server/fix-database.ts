import { client, connectDatabase } from './db.js';

async function quickFix() {
  try {
    console.log('🔧 Starting quick database fix...');
    console.log('📊 Connecting to database...');
    
    await connectDatabase();
    
    console.log('🗑️ Dropping existing tables if they exist...');
    
    // Drop tables in correct order (submissions first due to foreign key)
    await client.query('DROP TABLE IF EXISTS submissions CASCADE;');
    await client.query('DROP TABLE IF EXISTS contacts CASCADE;');
    await client.query('DROP TABLE IF EXISTS users CASCADE;');
    
    console.log('✅ Existing tables dropped');
    
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
    
    console.log('🔨 Creating submissions table...');
    await client.query(`
      CREATE TABLE submissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        first_name TEXT NOT NULL,
        last_name TEXT,
        email TEXT NOT NULL,
        phone TEXT,
        age TEXT,
        poem_title TEXT NOT NULL,
        tier TEXT NOT NULL,
        price INTEGER DEFAULT 0,
        poem_file_url TEXT,
        photo_url TEXT,
        payment_id TEXT,
        payment_method TEXT,
        submitted_at TIMESTAMP DEFAULT NOW(),
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
    
    console.log('📊 Creating indexes for performance...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
      CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions(email);
    `);
    
    console.log('🔍 Verifying tables were created...');
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'submissions', 'contacts')
      ORDER BY table_name;
    `);
    
    console.log(`✅ Verified ${result.rows.length} tables exist:`, result.rows.map(row => row.table_name));
    
    if (result.rows.length === 3) {
      console.log('🎉 Database fix completed successfully!');
      console.log('✅ All tables created and ready to use');
    } else {
      throw new Error(`Expected 3 tables, but found ${result.rows.length}`);
    }
    
    await client.end();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database fix failed:', error);
    console.error('Error details:', error);
    process.exit(1);
  }
}

// Run the fix
quickFix();