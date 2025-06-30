import { client, connectDatabase } from './db.js';

async function fixDatabase() {
  try {
    console.log('🔧 Fixing database schema...');
    
    await connectDatabase();
    
    // Add status column if it doesn't exist
    try {
      await client.query(`
        ALTER TABLE submissions 
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'
      `);
      console.log('✅ Status column added');
    } catch (error) {
      console.log('Status column might already exist:', error.message);
    }
    
    // Add other missing columns that might be needed
    const columnsToAdd = [
      'author_bio TEXT',
      'contest_month TEXT DEFAULT \'current\'',
      'payment_screenshot_url TEXT'
    ];
    
    for (const column of columnsToAdd) {
      try {
        await client.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ${column}`);
        console.log(`✅ Added column: ${column}`);
      } catch (error) {
        console.log(`Column ${column} might already exist`);
      }
    }
    
    // Update existing submissions
    await client.query(`
      UPDATE submissions 
      SET status = 'pending' 
      WHERE status IS NULL
    `);
    
    console.log('🎉 Database fixed successfully!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    throw error;
  }
}

fixDatabase().then(() => {
  console.log('✅ Fix completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fix failed:', error);
  process.exit(1);
});