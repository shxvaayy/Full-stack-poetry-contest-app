
import { client, connectDatabase } from './db.js';

async function fixUsersTable() {
  try {
    console.log('🔧 Checking and fixing users table structure...');
    
    await connectDatabase();
    
    // Check if users table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('📊 Creating users table...');
      await client.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          uid VARCHAR(255) NOT NULL UNIQUE,
          email VARCHAR(255) NOT NULL UNIQUE,
          name VARCHAR(255),
          phone VARCHAR(20),
          profile_picture_url TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      console.log('✅ Users table created successfully');
    } else {
      console.log('✅ Users table already exists');
    }
    
    // Check if profile_picture_url column exists and add if missing
    const columnExists = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'profile_picture_url'
    `);
    
    if (columnExists.rows.length === 0) {
      console.log('➕ Adding profile_picture_url column...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN profile_picture_url TEXT;
      `);
      console.log('✅ profile_picture_url column added');
    } else {
      console.log('✅ profile_picture_url column already exists');
    }
    
    // Ensure updated_at column exists
    const updatedAtExists = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'updated_at'
    `);
    
    if (updatedAtExists.rows.length === 0) {
      console.log('➕ Adding updated_at column...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW();
      `);
      console.log('✅ updated_at column added');
    } else {
      console.log('✅ updated_at column already exists');
    }
    
    console.log('🎉 Users table structure verified and fixed!');
    
  } catch (error) {
    console.error('❌ Error fixing users table:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixUsersTable()
    .then(() => {
      console.log('✅ Users table fix completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Users table fix failed:', error);
      process.exit(1);
    });
}

export { fixUsersTable };
