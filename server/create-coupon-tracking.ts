
import { client, connectDatabase } from './db.js';

async function createCouponTrackingTable() {
  try {
    await connectDatabase();
    
    console.log('🔧 Creating coupon_usage table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS coupon_usage (
        id SERIAL PRIMARY KEY,
        coupon_code VARCHAR(50) NOT NULL,
        coupon_id INTEGER REFERENCES coupons(id),
        user_id INTEGER REFERENCES users(id),
        submission_id INTEGER REFERENCES submissions(id),
        user_uid VARCHAR(255) NOT NULL,
        discount_amount DECIMAL(10, 2) NOT NULL,
        used_at TIMESTAMP DEFAULT NOW() NOT NULL,
        
        -- Create index for fast lookups
        UNIQUE(coupon_code, user_uid)
      );
    `);
    
    console.log('✅ Coupon usage table created successfully');
    
    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_coupon_usage_code_uid ON coupon_usage(coupon_code, user_uid);
      CREATE INDEX IF NOT EXISTS idx_coupon_usage_uid ON coupon_usage(user_uid);
      CREATE INDEX IF NOT EXISTS idx_coupon_usage_submission ON coupon_usage(submission_id);
    `);
    
    console.log('✅ Coupon usage indexes created');
    
  } catch (error) {
    console.error('❌ Error creating coupon usage table:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createCouponTrackingTable()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export { createCouponTrackingTable };
