
import { client, connectDatabase } from './db.js';

async function migrateEvaluationFields() {
  try {
    console.log('🔧 Adding evaluation fields to submissions table...');
    
    await connectDatabase();
    
    // Add evaluation columns if they don't exist
    const columnsToAdd = [
      'score INTEGER DEFAULT 0',
      'type VARCHAR(50) DEFAULT \'Human\'',
      'status VARCHAR(50) DEFAULT \'Pending\'',
      'score_breakdown JSONB'
    ];
    
    for (const column of columnsToAdd) {
      try {
        await client.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ${column}`);
        console.log(`✅ Added column: ${column}`);
      } catch (error) {
        console.log(`Column might already exist: ${column}`);
      }
    }
    
    // Update existing submissions to have default values
    await client.query(`
      UPDATE submissions 
      SET 
        score = COALESCE(score, 0),
        type = COALESCE(type, 'Human'),
        status = COALESCE(status, 'Pending')
      WHERE score IS NULL OR type IS NULL OR status IS NULL
    `);
    
    console.log('🎉 Evaluation fields migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrateEvaluationFields().then(() => {
    console.log('✅ Migration completed');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
}

export { migrateEvaluationFields };
