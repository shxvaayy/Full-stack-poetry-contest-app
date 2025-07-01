// migrate.ts
import { client, connectDatabase } from './db.js';

async function createTables() {
  try {
    console.log('🔧 Starting comprehensive database migration...');
    
    await connectDatabase();

    // Drop and recreate tables to ensure clean schema
    console.log('🗑️ Dropping existing tables...');
    await client.query('DROP TABLE IF EXISTS coupon_usage CASCADE;');
    await client.query('DROP TABLE IF EXISTS admin_logs CASCADE;');
    await client.query('DROP TABLE IF EXISTS contest_settings CASCADE;');
    await client.query('DROP TABLE IF EXISTS coupons CASCADE;');
    await client.query('DROP TABLE IF EXISTS submissions CASCADE;');
    await client.query('DROP TABLE IF EXISTS contacts CASCADE;');
    await client.query('DROP TABLE IF EXISTS users CASCADE;');

    console.log('🔨 Creating users table with ALL required columns...');
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        uid VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255),
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    console.log('🔨 Creating submissions table with ALL required columns...');
    await client.query(`
      CREATE TABLE submissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255),
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        age INTEGER,
        poem_title VARCHAR(255) NOT NULL,
        poem_content TEXT,
        tier VARCHAR(50) NOT NULL,
        price DECIMAL(10,2),
        payment_id VARCHAR(255),
        payment_method VARCHAR(50),
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
        score INTEGER,
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

    console.log('🔨 Creating contacts table...');
    await client.query(`
      CREATE TABLE contacts (
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

    console.log('🔨 Creating coupons table...');
    await client.query(`
      CREATE TABLE coupons (
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

    console.log('📊 Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
      CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions(email);
      CREATE INDEX IF NOT EXISTS idx_submissions_uuid ON submissions(submission_uuid);
      CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
      CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
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

    // Create triggers for all tables with updated_at
    console.log('🎯 Creating triggers for updated_at columns...');
    const tablesWithUpdatedAt = ['users', 'submissions', 'contacts', 'coupons', 'contest_settings'];
    
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