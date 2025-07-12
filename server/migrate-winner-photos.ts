import { pool } from './db.js';

export async function createWinnerPhotosTable() {
  try {
    // Check if table already exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'winner_photos'
      );
    `);
    if (tableExists.rows[0].exists) {
      // Add score column if it does not exist
      const scoreCol = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name='winner_photos' AND column_name='score'
      `);
      if (scoreCol.rows.length === 0) {
        await pool.query(`ALTER TABLE winner_photos ADD COLUMN score INTEGER`);
      }
      return true;
    }
    // Create the winner_photos table
    await pool.query(`
      CREATE TABLE winner_photos (
        id SERIAL PRIMARY KEY,
        position INTEGER NOT NULL,
        contest_month VARCHAR(7) NOT NULL,
        contest_year INTEGER NOT NULL,
        photo_url VARCHAR(500) NOT NULL,
        winner_name VARCHAR(255),
        score INTEGER,
        is_active BOOLEAN DEFAULT true NOT NULL,
        uploaded_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    // Add indexes for better performance
    await pool.query(`
      CREATE INDEX idx_winner_photos_contest_month ON winner_photos(contest_month);
      CREATE INDEX idx_winner_photos_position ON winner_photos(position);
      CREATE INDEX idx_winner_photos_active ON winner_photos(is_active);
    `);
    return true;
  } catch (error) {
    return false;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createWinnerPhotosTable()
    .then((success) => {
      if (success) {
        console.log('🎉 Winner photos migration completed successfully');
        process.exit(0);
      } else {
        console.error('💥 Winner photos migration failed');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 Migration error:', error);
      process.exit(1);
    });
} 