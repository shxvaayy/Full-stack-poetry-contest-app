import { client, connectDatabase, isConnected } from './db.js';

async function createTables() {
  try {
    console.log('🔧 Starting database migration...');
    
    // Only connect if not already connected
    if (!isConnected) {
      await connectDatabase();
    }

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        uid TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        name TEXT,
        phone TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Users table created/verified');

    // Create submissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS submissions (
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
    console.log('✅ Submissions table created/verified');

    // Create contacts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        message TEXT NOT NULL,
        subject TEXT,
        submitted_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Contacts table created/verified');

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
      CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions(email);
    `);
    console.log('✅ Database indexes created/verified');

    // Verify tables exist
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'submissions', 'contacts')
      ORDER BY table_name;
    `);
    
    console.log(`✅ Verified ${result.rows.length} tables exist:`, result.rows.map(row => row.table_name));
    
    if (result.rows.length !== 3) {
      throw new Error(`Expected 3 tables, found ${result.rows.length}`);
    }
    
    console.log('🎉 Database migration completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
}

// Export for use in other files
export { createTables };

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createTables()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}