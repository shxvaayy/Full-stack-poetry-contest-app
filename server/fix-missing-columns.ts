
import { connectDatabase, client } from './db.js';

async function addMissingColumns() {
  console.log('🔧 Adding missing columns to submissions table...');
  
  try {
    await connectDatabase();
    
    // Add poem_index column
    await client.query(`
      ALTER TABLE submissions 
      ADD COLUMN IF NOT EXISTS poem_index INTEGER DEFAULT 0
    `);
    
    // Add total_poems_in_submission column
    await client.query(`
      ALTER TABLE submissions 
      ADD COLUMN IF NOT EXISTS total_poems_in_submission INTEGER DEFAULT 1
    `);
    
    // Add submission_uuid column if it doesn't exist
    await client.query(`
      ALTER TABLE submissions 
      ADD COLUMN IF NOT EXISTS submission_uuid VARCHAR(255)
    `);
    
    console.log('✅ Missing columns added successfully!');
    
    // Verify the columns exist
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'submissions' 
      AND column_name IN ('poem_index', 'total_poems_in_submission', 'submission_uuid')
      ORDER BY column_name
    `);
    
    console.log('📊 Current columns:', result.rows);
    
  } catch (error) {
    console.error('❌ Error adding columns:', error);
  } finally {
    await client.end();
  }
}

// Run the fix if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addMissingColumns()
    .then(() => {
      console.log('✅ Column fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Column fix failed:', error);
      process.exit(1);
    });
}

export { addMissingColumns };