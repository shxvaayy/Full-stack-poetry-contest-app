import { client, connectDatabase } from './db.js';

async function createTables() {
  try {
    console.log('🔧 Starting database migration...');
    
    // Ensure connection
    await connectDatabase();

    // Check if tables already exist
    console.log('🔍 Checking existing tables...');
    const existingTables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'submissions', 'contacts')
      ORDER BY table_name;
    `);

    if (existingTables.rows.length === 3) {
      console.log('✅ All tables already exist, migration not needed');
      console.log('🎯 CRITICAL: Returning true - tables exist');
      return true;
    }

    console.log(`📊 Found ${existingTables.rows.length}/3 tables, creating missing tables...`);

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
        status VARCHAR(50) DEFAULT 'pending' NOT NULL,
        score INTEGER,
        type VARCHAR(50),
        score_breakdown JSON,
        is_winner BOOLEAN DEFAULT FALSE,
        winner_position INTEGER
      );
    `);
    console.log('✅ Submissions table created/verified');

    // Check and add missing columns to existing submissions table
    console.log('🔍 Checking for missing columns in submissions table...');
    
    const missingColumns = [
      { name: 'status', type: 'VARCHAR(50) DEFAULT \'pending\' NOT NULL' },
      { name: 'score', type: 'INTEGER' },
      { name: 'type', type: 'VARCHAR(50)' },
      { name: 'score_breakdown', type: 'JSON' }
    ];

    for (const column of missingColumns) {
      try {
        const columnExists = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'submissions' 
          AND column_name = $1
        `, [column.name]);

        if (columnExists.rows.length === 0) {
          console.log(`➕ Adding missing column: ${column.name}`);
          await client.query(`ALTER TABLE submissions ADD COLUMN ${column.name} ${column.type}`);
          console.log(`✅ Added ${column.name} column`);
        } else {
          console.log(`✅ Column ${column.name} already exists`);
        }
      } catch (error) {
        console.error(`❌ Error checking/adding column ${column.name}:`, error);
      }
    }

    // Ensure all existing submissions have a status
    try {
      const updateResult = await client.query(`
        UPDATE submissions 
        SET status = 'pending' 
        WHERE status IS NULL OR status = ''
      `);
      console.log(`✅ Updated ${updateResult.rowCount} submissions with pending status`);
    } catch (error) {
      console.log('Note: Status update skipped (expected if column was just added)');
    }

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
    
    console.log(`✅ Final verification: ${finalCheck.rows.length} tables exist`);
    
    if (finalCheck.rows.length !== 3) {
      throw new Error(`Migration verification failed: Expected 3 tables, found ${finalCheck.rows.length}`);
    }
    
    console.log('🎉 Database migration completed successfully!');
    console.log('🎯 CRITICAL: Returning true - migration complete');
    return true;
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    console.log('🎯 CRITICAL: Returning false - migration failed');
    return false;
  }
}

export { createTables };