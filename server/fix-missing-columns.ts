
import { connectDatabase, client } from './db.js';

async function addPoemIndexColumns() {
  try {
    console.log('🔧 Adding poem_index and related columns...');
    
    await connectDatabase();
    
    // Check which columns are missing
    const columnsCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'submissions' 
      AND column_name IN ('poem_index', 'submission_uuid', 'total_poems')
    `);
    
    const existingColumns = columnsCheck.rows.map(row => row.column_name);
    console.log('🔍 Existing columns:', existingColumns);
    
    // Add missing columns one by one
    const columnsToAdd = [
      { name: 'poem_index', sql: 'ALTER TABLE submissions ADD COLUMN poem_index INTEGER DEFAULT 0 NOT NULL' },
      { name: 'submission_uuid', sql: 'ALTER TABLE submissions ADD COLUMN submission_uuid VARCHAR(255)' },
      { name: 'total_poems', sql: 'ALTER TABLE submissions ADD COLUMN total_poems INTEGER DEFAULT 1 NOT NULL' }
    ];
    
    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        console.log(`📝 Adding column: ${column.name}`);
        await client.query(column.sql);
        console.log(`✅ Added column: ${column.name}`);
      } else {
        console.log(`✅ Column ${column.name} already exists`);
      }
    }
    
    // Update existing submissions to have proper values
    console.log('🔄 Updating existing submissions...');
    await client.query(`
      UPDATE submissions 
      SET 
        submission_uuid = COALESCE(submission_uuid, 'legacy_' || id::text),
        poem_index = COALESCE(poem_index, 0),
        total_poems = COALESCE(total_poems, 1)
      WHERE submission_uuid IS NULL OR poem_index IS NULL OR total_poems IS NULL
    `);
    
    console.log('✅ All poem index columns added and updated successfully');
    
    // Verify the table structure
    const finalCheck = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'submissions'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Final table structure:');
    finalCheck.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Error adding poem index columns:', error);
    throw error;
  } finally {
    await client.end();
    process.exit(0);
  }
}

addPoemIndexColumns().catch(console.error);
