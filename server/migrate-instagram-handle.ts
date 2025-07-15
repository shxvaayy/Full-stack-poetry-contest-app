import { pool, connectDatabase } from './db.js';

export async function addInstagramHandleColumn() {
  try {
    await connectDatabase();
    console.log('🔧 Adding instagram_handle column to submissions table...');
    await pool.query(`
      ALTER TABLE submissions
      ADD COLUMN IF NOT EXISTS instagram_handle VARCHAR(255)
    `);
    console.log('✅ instagram_handle column added!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Only call process.exit() if run directly (standalone)
if (import.meta.url === `file://${process.argv[1]}`) {
  addInstagramHandleColumn()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} 