import { pool } from './db.js';

export async function createWinnerPhotosTable() {
  try {
    console.log('🏆 Creating winner_photos table...');

    // Check if table already exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'winner_photos'
      );
    `);

    if (tableExists.rows[0].exists) {
      console.log('✅ winner_photos table already exists');
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

    console.log('✅ winner_photos table created successfully');
    return true;

  } catch (error) {
    console.error('❌ Error creating winner_photos table:', error);
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