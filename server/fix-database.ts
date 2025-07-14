import { client, connectDatabase, isConnected } from './db.js';

async function quickFix() {
  try {
    console.log('🔧 Starting quick database fix...');
    
    // Only connect if not already connected
    if (!isConnected) {
      console.log('📊 Connecting to database...');
      await connectDatabase();
    }
    
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
        submission_uuid TEXT,
        poem_index INTEGER DEFAULT 0,
        total_poems_in_submission INTEGER DEFAULT 1,
        submitted_at TIMESTAMP DEFAULT NOW(),
        status TEXT DEFAULT 'pending',
        score INTEGER,
        is_winner BOOLEAN DEFAULT FALSE,
        winner_position INTEGERTAMP DEFAULT NOW(),
        is_winner BOOLEAN DEFAULT FALSE,
        winner_position INTEGER,
        instagram_handle TEXT
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
    
    // Don't close connection here since it might be used by other parts
    console.log('✅ Database fix completed, keeping connection open for server');
    
  } catch (error) {
    console.error('❌ Database fix failed:', error);
    console.error('Error details:', error);
    throw error;
  }
}

// Export for use in other files
export { quickFix };

// Run the fix if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  quickFix()
    .then(() => {
      console.log('✅ Fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fix failed:', error);
      process.exit(1);
    });
}