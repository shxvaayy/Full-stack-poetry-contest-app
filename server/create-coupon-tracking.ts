// server/create-coupon-tracking.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(connectionString);
const db = drizzle(client);

async function createCouponTrackingTable() {
  try {
    console.log('🗄️ Creating coupon_usage table...');
    
    // Create the table with proper structure
    await client`
      CREATE TABLE IF NOT EXISTS coupon_usage (
        id SERIAL PRIMARY KEY,
        coupon_code VARCHAR(255) NOT NULL,
        user_uid VARCHAR(255) NOT NULL,
        submission_id INTEGER,
        discount_amount DECIMAL(10,2),
        used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_coupon_per_user UNIQUE(coupon_code, user_uid)
      );
    `;
    
    console.log('✅ coupon_usage table created successfully');
    
    // Create index for performance
    await client`
      CREATE INDEX IF NOT EXISTS idx_coupon_usage_user_uid ON coupon_usage(user_uid);
    `;
    
    console.log('✅ Index created successfully');
    
  } catch (error) {
    console.error('❌ Error creating coupon_usage table:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run if called directly
if (require.main === module) {
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

export { createCouponTrackingTable };