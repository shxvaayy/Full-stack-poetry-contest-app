import { client, connectDatabase } from './db.js';

async function migrateNotifications() {
  try {
    console.log('🔧 Starting notifications migration...');
    await connectDatabase();

    // Create notifications table
    console.log('📝 Creating notifications table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        target_user_email VARCHAR(255),
        sent_by VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Create user_notifications table
    console.log('📝 Creating user_notifications table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_notifications (
        id SERIAL PRIMARY KEY,
        notification_id INTEGER NOT NULL REFERENCES notifications(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        user_email VARCHAR(255) NOT NULL,
        is_read BOOLEAN DEFAULT false NOT NULL,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Add indexes for better performance
    console.log('📝 Adding indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
      CREATE INDEX IF NOT EXISTS idx_notifications_sent_by ON notifications(sent_by);
      CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_user_notifications_notification_id ON user_notifications(notification_id);
    `);

    console.log('✅ Notifications migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateNotifications()
    .then(() => {
      console.log('🎉 Migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { migrateNotifications }; 