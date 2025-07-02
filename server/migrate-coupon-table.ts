
import { client, connectDatabase } from './db.js';

export async function migrateCouponTable() {
  try {
    console.log('🔧 Starting coupon table migration...');
    
    await connectDatabase();
    
    // Create coupons table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        discount_amount INTEGER NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        used_by_email TEXT,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('✅ Coupons table created successfully');
    
    // Insert default coupon codes if they don't exist
    const defaultCoupons = [
      { code: 'SAVE20', discount_amount: 20 },
      { code: 'WELCOME10', discount_amount: 10 },
      { code: 'POETRY50', discount_amount: 50 }
    ];
    
    for (const coupon of defaultCoupons) {
      await client.query(`
        INSERT INTO coupons (code, discount_amount) 
        VALUES ($1, $2) 
        ON CONFLICT (code) DO NOTHING
      `, [coupon.code, coupon.discount_amount]);
    }
    
    console.log('✅ Default coupon codes inserted');
    
  } catch (error) {
    console.error('❌ Coupon table migration failed:', error);
    throw error;
  }
}
