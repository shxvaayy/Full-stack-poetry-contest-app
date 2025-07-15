import { pool } from './db.js';

export async function createWallPostsTable() {
  try {
    console.log('🔧 Creating wall_posts table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wall_posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        user_uid VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(100),
        author_name VARCHAR(255) NOT NULL,
        author_instagram VARCHAR(255),
        author_profile_picture VARCHAR(500),
        status VARCHAR(50) DEFAULT 'pending' NOT NULL,
        moderated_by VARCHAR(255),
        moderated_at TIMESTAMP,
        moderation_notes TEXT,
        likes INTEGER DEFAULT 0 NOT NULL,
        liked_by TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    // Add indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wall_posts_user_id ON wall_posts(user_id);
      CREATE INDEX IF NOT EXISTS idx_wall_posts_user_uid ON wall_posts(user_uid);
      CREATE INDEX IF NOT EXISTS idx_wall_posts_status ON wall_posts(status);
      CREATE INDEX IF NOT EXISTS idx_wall_posts_created_at ON wall_posts(created_at);
    `);
    
    console.log('✅ wall_posts table created successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error creating wall_posts table:', error);
    return false;
  }
}

// Only call process.exit() if run directly (standalone)
if (import.meta.url === `file://${process.argv[1]}`) {
  createWallPostsTable()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} 