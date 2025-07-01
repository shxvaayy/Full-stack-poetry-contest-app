
import { db } from './db.js';

async function addSubmissionUuidColumn() {
  try {
    console.log('🔄 Adding submission_uuid column to submissions table...');
    
    // Add the new column
    await db.execute(`
      ALTER TABLE submissions 
      ADD COLUMN IF NOT EXISTS submission_uuid VARCHAR(255) UNIQUE;
    `);
    
    console.log('✅ Added submission_uuid column');
    
    // Update existing records with UUIDs
    const { randomUUID } = await import('crypto');
    
    console.log('🔄 Updating existing submissions with UUIDs...');
    
    const existingSubmissions = await db.execute('SELECT id FROM submissions WHERE submission_uuid IS NULL');
    
    for (const submission of existingSubmissions.rows) {
      const uuid = randomUUID();
      await db.execute(
        'UPDATE submissions SET submission_uuid = $1 WHERE id = $2',
        [uuid, submission.id]
      );
    }
    
    console.log(`✅ Updated ${existingSubmissions.rows.length} existing submissions with UUIDs`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addSubmissionUuidColumn()
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { addSubmissionUuidColumn };

