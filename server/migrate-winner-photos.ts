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
      // Add missing columns if they do not exist
      const columnsToAdd = [
        { name: 'score', type: 'INTEGER' },
        { name: 'poem_title', type: 'VARCHAR(255)' },
        { name: 'poem_text', type: 'TEXT' },
        { name: 'instagram_handle', type: 'VARCHAR(255)' }
      ];
      for (const col of columnsToAdd) {
        const colRes = await pool.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name='winner_photos' AND column_name='${col.name}'
        `);
        if (colRes.rows.length === 0) {
          await pool.query(`ALTER TABLE winner_photos ADD COLUMN ${col.name} ${col.type}`);
        }
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
        poem_title VARCHAR(255),
        poem_text TEXT,
        instagram_handle VARCHAR(255),
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