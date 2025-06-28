import { client, connectDatabase } from './db.js';

// Track migration state to prevent multiple runs
let migrationCompleted = false;
let migrationInProgress = false;

async function createTables() {
  // Prevent multiple simultaneous migrations
  if (migrationInProgress) {
    console.log('⏳ Migration already in progress, waiting...');
    // CRITICAL FIX: Don't wait indefinitely, return after timeout
    let waitTime = 0;
    while (migrationInProgress && waitTime < 30000) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      waitTime += 1000;
    }
    console.log('✅ Migration wait completed, returning status:', migrationCompleted);
    return migrationCompleted;
  }

  if (migrationCompleted) {
    console.log('✅ Migration already completed, skipping...');
    return true;
  }

  migrationInProgress = true;
  console.log('🔧 Migration started, setting inProgress = true');

  try {
    console.log('🔧 Starting database migration...');
    
    // Ensure connection
    await connectDatabase();

    // Check if tables already exist to avoid conflicts
    console.log('🔍 Checking existing tables...');
    const existingTables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'submissions', 'contacts')
      ORDER BY table_name;
    `);

    if (existingTables.rows.length === 3) {
      console.log('✅ All tables already exist, migration not needed');
      migrationCompleted = true;
      migrationInProgress = false;
      console.log('🎯 CRITICAL: Migration flags reset, returning true');
      return true;
    }

    console.log(`📊 Found ${existingTables.rows.length}/3 tables, proceeding with migration...`);

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

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
      CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions(email);
    `);
    console.log('✅ Database indexes created/verified');

    // Final verification
    const finalCheck = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'submissions', 'contacts')
      ORDER BY table_name;
    `);
    
    console.log(`✅ Final verification: ${finalCheck.rows.length} tables exist:`, finalCheck.rows.map(row => row.table_name));
    
    if (finalCheck.rows.length !== 3) {
      throw new Error(`Migration verification failed: Expected 3 tables, found ${finalCheck.rows.length}`);
    }
    
    migrationCompleted = true;
    console.log('🎉 Database migration completed successfully!');
    console.log('🎯 CRITICAL: Setting migration flags and returning');
    return true;
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    migrationCompleted = false;
    throw error;
  } finally {
    // CRITICAL FIX: Always reset the inProgress flag
    migrationInProgress = false;
    console.log('🎯 CRITICAL: Migration inProgress flag reset to false');
  }
}

export { createTables };

// Only run if called directly
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