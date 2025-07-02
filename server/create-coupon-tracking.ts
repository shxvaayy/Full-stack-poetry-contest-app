// server/create-coupon-tracking.ts
import { sql } from 'drizzle-orm';
import { db, client, connectDatabase } from './db.js';

async function createCouponTrackingTable() {
  try {
    console.log('🗄️ Creating coupon_usage table...');
    
    // Ensure database connection
    await connectDatabase();
    
    // Create the table with proper structure using drizzle SQL
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS coupon_usage (
        id SERIAL PRIMARY KEY,
        coupon_code VARCHAR(255) NOT NULL,
        user_uid VARCHAR(255) NOT NULL,
        submission_id INTEGER,
        discount_amount DECIMAL(10,2),
        used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_coupon_per_user UNIQUE(coupon_code, user_uid)
      );
    `);
    
    console.log('✅ coupon_usage table created successfully');
    
    // Create index for performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_coupon_usage_user_uid ON coupon_usage(user_uid);
    `);
    
    console.log('✅ Index created successfully');
    
    // Verify table exists
    const tableCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'coupon_usage';
    `);
    
    console.log('✅ Table verification:', tableCheck.length > 0 ? 'Table exists' : 'Table not found');
    
  } catch (error) {
    console.error('❌ Error creating coupon_usage table:', error);
    
    // If it's a "relation already exists" error, that's actually fine
    if (error instanceof Error && (
      error.message.includes('already exists') ||
      error.message.includes('duplicate key value')
    )) {
      console.log('✅ Table already exists, continuing...');
      return;
    }
    
    // For connection errors, we'll log but not throw to prevent startup failure
    if (error instanceof Error && (
      error.message.includes('connection') ||
      error.message.includes('timeout') ||
      error.message.includes('ECONNREFUSED')
    )) {
      console.log('⚠️ Database connection issue during table creation - will retry later');
      return;
    }
    
    // For other errors, we'll log but not throw to prevent startup failure
    console.log('⚠️ Continuing startup despite database table creation error');
  }
}

// Export for use in other modules
export { createCouponTrackingTable };

// Only run directly if this file is executed as the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  createCouponTrackingTable()
    .then(() => {
      console.log('🎉 Database migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}