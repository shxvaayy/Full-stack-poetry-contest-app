
import { connectDatabase, client } from './db.js';

async function addStatusColumn() {
  try {
    console.log('🔧 Adding status column to submissions table...');
    
    await connectDatabase();
    
    // Check if status column already exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'submissions' 
      AND column_name = 'status'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ Status column already exists');
      return;
    }
    
    // Add the status column
    console.log('📝 Adding status column...');
    await client.query(`
      ALTER TABLE submissions 
      ADD COLUMN status VARCHAR(50) DEFAULT 'pending' NOT NULL
    `);
    
    console.log('✅ Status column added successfully');
    
    // Update existing submissions to have 'pending' status
    const updateResult = await client.query(`
      UPDATE submissions 
      SET status = 'pending' 
      WHERE status IS NULL
    `);
    
    console.log(`✅ Updated ${updateResult.rowCount} existing submissions with pending status`);
    
  } catch (error) {
    console.error('❌ Error adding status column:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

addStatusColumn();
