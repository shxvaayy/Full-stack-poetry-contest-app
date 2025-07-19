import { client, connectDatabase } from './db.js';

export async function migrateNotifications() {
  try {
    console.log('🔧 Creating notifications table...');
    
    await connectDatabase();
    
    // Create notifications table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_uid VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        is_read BOOLEAN DEFAULT FALSE NOT NULL
      );
    `);
    
    console.log('✅ Notifications table created/verified');
    
    // Add indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_uid ON notifications(user_uid);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
    `);
    
    console.log('✅ Notification indexes created');
    
    return true;
  } catch (error) {
    console.error('❌ Error creating notifications table:', error);
    return false;
  }
} 