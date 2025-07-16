import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const client = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function fixLikesColumn() {
  try {
    console.log('Altering wall_posts.likes column to INTEGER NOT NULL DEFAULT 0...');
    await client.query(`
      ALTER TABLE wall_posts ALTER COLUMN likes SET DEFAULT 0;
    `);
    await client.query(`
      ALTER TABLE wall_posts ALTER COLUMN likes SET NOT NULL;
    `);
    await client.query(`
      ALTER TABLE wall_posts ALTER COLUMN likes TYPE INTEGER USING likes::integer;
    `);
    console.log('✅ wall_posts.likes column fixed!');
  } catch (error) {
    console.error('❌ Error fixing wall_posts.likes column:', error);
  } finally {
    process.exit(0);
  }
}

fixLikesColumn(); 