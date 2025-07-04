
import { client } from './db.js';

async function addProfilePictureColumn() {
  try {
    console.log('🔄 Adding profile_picture_url column to users table...');

    // Check if column already exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'profile_picture_url'
    `);

    if (checkColumn.rows.length === 0) {
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN profile_picture_url TEXT
      `);
      console.log('✅ Successfully added profile_picture_url column');
    } else {
      console.log('✅ profile_picture_url column already exists');
    }

  } catch (error) {
    console.error('❌ Error adding profile_picture_url column:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addProfilePictureColumn()
    .then(() => {
      console.log('✅ Profile picture column migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export { addProfilePictureColumn };
