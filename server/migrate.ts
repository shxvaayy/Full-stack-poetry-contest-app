// migrate.ts
import { client, connectDatabase } from './db.js';

async function createTables() {
  try {
    console.log('🔧 Starting comprehensive database migration...');

    await connectDatabase();

    // Check if tables exist before creating
    const tablesExist = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    `);

    if (tablesExist.rows.length > 0) {
      console.log('✅ Tables already exist, skipping creation');
      return true;
    }

    console.log('🔧 Creating tables for first time...');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        uid VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255),
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create submissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255),
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        age INTEGER,
        poem_title VARCHAR(255) NOT NULL,
        poem_content TEXT,
        tier VARCHAR(50) NOT NULL DEFAULT 'free',
        price DECIMAL(10,2) DEFAULT 0.00,
        payment_id VARCHAR(255),
        payment_method VARCHAR(50) DEFAULT 'free',
        payment_status VARCHAR(50),
        session_id VARCHAR(255),
        terms_accepted BOOLEAN DEFAULT FALSE NOT NULL,
        poem_file_url VARCHAR(500),
        photo_file_url VARCHAR(500),
        drive_file_id VARCHAR(255),
        drive_photo_id VARCHAR(255),
        poem_index INTEGER DEFAULT 1 NOT NULL,
        submission_uuid VARCHAR(255),
        total_poems_in_submission INTEGER DEFAULT 1 NOT NULL,
        score INTEGER DEFAULT 0,
        type VARCHAR(50) DEFAULT 'Human',
        status VARCHAR(50) DEFAULT 'Pending',
        score_breakdown TEXT,
        is_winner BOOLEAN DEFAULT FALSE NOT NULL,
        winner_position INTEGER,
        winner_category VARCHAR(100),
        contest_month VARCHAR(7),
        contest_year INTEGER,
        submitted_at TIMESTAMP DEFAULT NOW() NOT NULL,
        evaluated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create contacts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(255),
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'new',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create coupons table
    await client.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        discount_type VARCHAR(20) NOT NULL,
        discount_value DECIMAL(10,2) NOT NULL,
        max_uses INTEGER,
        used_count INTEGER DEFAULT 0 NOT NULL,
        valid_from TIMESTAMP NOT NULL,
        valid_until TIMESTAMP NOT NULL,
        applicable_tiers VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    console.log('🔨 Creating coupon_usage table...');
    await client.query(`
      CREATE TABLE coupon_usage (
        id SERIAL PRIMARY KEY,
        coupon_id INTEGER REFERENCES coupons(id) NOT NULL,
        user_id INTEGER REFERENCES users(id),
        submission_id INTEGER REFERENCES submissions(id),
        user_uid VARCHAR(255),
        discount_amount DECIMAL(10,2) NOT NULL,
        used_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    console.log('🔨 Creating contest_settings table...');
    await client.query(`
      CREATE TABLE contest_settings (
        id SERIAL PRIMARY KEY,
        contest_month VARCHAR(7) NOT NULL,
        contest_year INTEGER NOT NULL,
        theme VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        submission_deadline TIMESTAMP,
        results_announcement_date TIMESTAMP,
        max_submissions_per_user INTEGER DEFAULT 10,
        free_submission_limit INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    console.log('🔨 Creating admin_logs table...');
    await client.query(`
      CREATE TABLE admin_logs (
        id SERIAL PRIMARY KEY,
        admin_email VARCHAR(255) NOT NULL,
        action VARCHAR(100) NOT NULL,
        description TEXT,
        affected_records INTEGER,
        metadata TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    console.log('🔨 Creating admin_settings table...');
    await client.query(`
      CREATE TABLE admin_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) NOT NULL UNIQUE,
        setting_value TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Insert default settings
    await client.query(`
      INSERT INTO admin_settings (setting_key, setting_value, description)
      VALUES 
        ('free_tier_enabled', 'true', 'Enable or disable free tier submissions')
      ON CONFLICT (setting_key) DO NOTHING;
    `);

    console.log('📊 Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
      CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions(email);
      CREATE INDEX IF NOT EXISTS idx_submissions_uuid ON submissions(submission_uuid);
      CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
      CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
      CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(setting_key);
    `);

    // Create trigger function for updating updated_at columns
    console.log('🔧 Creating updated_at trigger function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    console.log('🔨 Creating admin_users table...');
    await client.query(`
      CREATE TABLE admin_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(50) DEFAULT 'admin' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Insert default admin users
    await client.query(`
      INSERT INTO admin_users (email, role)
      VALUES 
        ('shiningbhavya.seth@gmail.com', 'admin')
      ON CONFLICT (email) DO NOTHING;
    `);

    // Create triggers for all tables with updated_at
    console.log('🎯 Creating triggers for updated_at columns...');
    const tablesWithUpdatedAt = ['users', 'submissions', 'contacts', 'coupons', 'contest_settings', 'admin_settings', 'admin_users'];

    for (const table of tablesWithUpdatedAt) {
      await client.query(`
        CREATE TRIGGER update_${table}_updated_at 
        BEFORE UPDATE ON ${table} 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    console.log('✅ Database migration completed successfully!');
    console.log('🎉 All tables created with proper schema matching Drizzle definitions');
    return true;

  } catch (error) {
    console.error('❌ Error during migration:', error);
    return false;
  }
}

export { createTables };