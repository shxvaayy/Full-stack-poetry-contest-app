import { connectDatabase, client } from './db.js';

async function fixSubmissionsTable() {
  try {
    console.log('🔧 Fixing submissions table...');
    
    await connectDatabase();
    
    // Check current table structure
    console.log('📋 Checking current table structure...');
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'submissions'
      ORDER BY ordinal_position
    `);
    
    console.log('Current columns:', columns.rows);
    
    // Check if status column exists
    const statusColumn = columns.rows.find(col => col.column_name === 'status');
    
    if (!statusColumn) {
      console.log('❌ Status column missing, adding it...');
      
      await client.query(`
        ALTER TABLE submissions 
        ADD COLUMN status VARCHAR(50) DEFAULT 'pending' NOT NULL
      `);
      
      console.log('✅ Status column added');
    } else {
      console.log('✅ Status column already exists');
    }
    
    // Update any NULL status values
    const updateResult = await client.query(`
      UPDATE submissions 
      SET status = 'pending' 
      WHERE status IS NULL
    `);
    
    console.log(`✅ Updated ${updateResult.rowCount} rows with pending status`);
    
    // Verify the fix
    const testQuery = await client.query('SELECT id, status FROM submissions LIMIT 1');
    console.log('✅ Test query successful:', testQuery.rows);
    
    console.log('🎉 Submissions table fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing submissions table:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

fixSubmissionsTable();
