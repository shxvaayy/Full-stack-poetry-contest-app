import { client, connectDatabase } from './db.js';

export async function addInstagramHandleColumn() {
  try {
    await connectDatabase();
    console.log('🔧 Adding instagram_handle column to submissions table...');
    await client.query(`
      ALTER TABLE submissions
      ADD COLUMN IF NOT EXISTS instagram_handle VARCHAR(255)
    `);
    console.log('✅ instagram_handle column added!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// For standalone script usage (ESM compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  addInstagramHandleColumn().then(() => process.exit(0));
} 