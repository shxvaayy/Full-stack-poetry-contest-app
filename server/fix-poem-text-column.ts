
import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function addPoemTextColumn() {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check if poem_text column exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'submissions' AND column_name = 'poem_text'
    `);

    if (checkColumn.rows.length === 0) {
      console.log('📝 Adding poem_text column...');
      await client.query(`
        ALTER TABLE submissions 
        ADD COLUMN poem_text TEXT
      `);
      console.log('✅ poem_text column added successfully');
    } else {
      console.log('✅ poem_text column already exists');
    }

    // Verify the column was added
    const verify = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'submissions' AND column_name = 'poem_text'
    `);

    console.log('📋 poem_text column details:', verify.rows[0]);

  } catch (error) {
    console.error('❌ Error adding poem_text column:', error);
    throw error;
  } finally {
    await client.end();
  }
}

addPoemTextColumn().catch(console.error);
