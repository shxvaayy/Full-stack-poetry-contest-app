
import { db } from './db.js';

async function addStatusColumn() {
  try {
    console.log('🔧 Adding status column to submissions table...');
    
    // Add the status column with default value
    await db.execute(`
      ALTER TABLE submissions 
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Submitted'
    `);
    
    console.log('✅ Status column added successfully!');
    
    // Update existing records to have 'Submitted' status
    await db.execute(`
      UPDATE submissions 
      SET status = 'Submitted' 
      WHERE status IS NULL
    `);
    
    console.log('✅ Updated existing records with default status');
    
  } catch (error) {
    console.error('❌ Error adding status column:', error);
    throw error;
  }
}

// Run the migration
addStatusColumn()
  .then(() => {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
