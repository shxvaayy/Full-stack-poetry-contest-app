import { client, connectDatabase } from './db.js';

export async function fixUsersTable() {
  try {
    console.log('🔧 Checking and fixing users table structure...');

    // Connect to database
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
      console.log('❌ Users table does not exist');
      return false;
    }

    console.log('✅ Users table already exists');

    // Check if profile_picture_url column exists
    const profilePictureColumnExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'profile_picture_url'
      );
    `);

    if (!profilePictureColumnExists.rows[0].exists) {
      console.log('➕ Adding profile_picture_url column...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN profile_picture_url VARCHAR(255);
      `);
      console.log('✅ profile_picture_url column added');
    } else {
      console.log('✅ profile_picture_url column already exists');
    }

    // Check if updated_at column exists
    const updatedAtColumnExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'updated_at'
      );
    `);

    if (!updatedAtColumnExists.rows[0].exists) {
      console.log('➕ Adding updated_at column...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
      `);
      console.log('✅ updated_at column added');
    } else {
      console.log('✅ updated_at column already exists');
    }

    console.log('🎉 Users table structure verified and fixed!');
    return true;

  } catch (error) {
    console.error('❌ Error fixing users table:', error);
    return false;
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

//The duplicate export has been removed