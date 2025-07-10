
import { client } from './db.js';

export async function migrateContestFields() {
  console.log('🔄 Adding contest fields to submissions table...');

  try {
    // Add contest type column
    try {
      await client.query(`
        ALTER TABLE submissions 
        ADD COLUMN contest_type VARCHAR(50)
      `);
      console.log('✅ Added contest_type column');
    } catch (error: any) {
      if (error.code === '42701') {
        console.log('✅ contest_type column already exists');
      } else {
        throw error;
      }
    }

    // Add challenge title column
    try {
      await client.query(`
        ALTER TABLE submissions 
        ADD COLUMN challenge_title VARCHAR(255)
      `);
      console.log('✅ Added challenge_title column');
    } catch (error: any) {
      if (error.code === '42701') {
        console.log('✅ challenge_title column already exists');
      } else {
        throw error;
      }
    }

    // Add challenge description column
    try {
      await client.query(`
        ALTER TABLE submissions 
        ADD COLUMN challenge_description TEXT
      `);
      console.log('✅ Added challenge_description column');
    } catch (error: any) {
      if (error.code === '42701') {
        console.log('✅ challenge_description column already exists');
      } else {
        throw error;
      }
    }

    // Add poem text column
    try {
      await client.query(`
        ALTER TABLE submissions 
        ADD COLUMN poem_text TEXT
      `);
      console.log('✅ Added poem_text column');
    } catch (error: any) {
      if (error.code === '42701') {
        console.log('✅ poem_text column already exists');
      } else {
        throw error;
      }
    }

    console.log('✅ Contest fields migration completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Contest fields migration failed:', error);
    return false;
  }
}

