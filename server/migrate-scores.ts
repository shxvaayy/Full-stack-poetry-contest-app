
import { client, connectDatabase } from './db.js';

async function migrateScoreColumns() {
  try {
    console.log('🔧 Starting score columns migration...');
    
    await connectDatabase();
    
    // Check if score columns exist
    const columnsCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'submissions' 
      AND column_name IN ('score', 'type', 'status', 'originality_score', 'emotion_score', 'structure_score', 'language_score', 'theme_score')
    `);
    
    const existingColumns = columnsCheck.rows.map(row => row.column_name);
    const requiredColumns = [
      { name: 'score', type: 'INTEGER' },
      { name: 'type', type: 'TEXT' },
      { name: 'status', type: 'TEXT DEFAULT \'Pending\'' },
      { name: 'originality_score', type: 'INTEGER' },
      { name: 'emotion_score', type: 'INTEGER' },
      { name: 'structure_score', type: 'INTEGER' },
      { name: 'language_score', type: 'INTEGER' },
      { name: 'theme_score', type: 'INTEGER' }
    ];
    
    let added = 0;
    for (const column of requiredColumns) {
      if (!existingColumns.includes(column.name)) {
        console.log(`Adding column: ${column.name}`);
        await client.query(`ALTER TABLE submissions ADD COLUMN ${column.name} ${column.type}`);
        added++;
      }
    }
    
    if (added === 0) {
      console.log('✅ All score columns already exist');
    } else {
      console.log(`✅ Added ${added} new columns successfully`);
    }
    
    // Update existing submissions to have Pending status if null
    await client.query(`
      UPDATE submissions 
      SET status = 'Pending' 
      WHERE status IS NULL
    `);
    
    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateScoreColumns()
    .then(() => {
      console.log('✅ Score columns migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export { migrateScoreColumns };