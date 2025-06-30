
import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { 
    rejectUnauthorized: false 
  } : false,
});

async function updateSchema() {
  try {
    console.log('🔄 Updating database schema...');

    // Drop the existing submissions table and recreate it
    await db.execute(`
      DROP TABLE IF EXISTS submissions CASCADE;
    `);

    // Create the new submissions table with all required columns
    await db.execute(`
      CREATE TABLE submissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100),
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        age VARCHAR(10),
        poem_title VARCHAR(255) NOT NULL,
        tier VARCHAR(50) NOT NULL,
        price DECIMAL(10,2) DEFAULT 0.00,
        poem_file_url TEXT,
        photo_url TEXT,
        payment_id VARCHAR(255),
        payment_method VARCHAR(50),
        submitted_at TIMESTAMP DEFAULT NOW() NOT NULL,
        status VARCHAR(50) DEFAULT 'pending' NOT NULL,
        score INTEGER,
        type VARCHAR(50),
        score_breakdown JSON,
        is_winner BOOLEAN DEFAULT FALSE,
        winner_position INTEGER
      );
    `);

    console.log('✅ Database schema updated successfully!');
    
  } catch (error) {
    console.error('❌ Schema update failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

updateSchema();