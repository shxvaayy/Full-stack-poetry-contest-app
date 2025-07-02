import { client } from './db.js';

export async function migrateCouponTable() {
  try {
    console.log('🔄 Starting coupon table migration...');

    // First, check if the coupons table exists and create it if it doesn't
    await client.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        discount_amount INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Check if discount_amount column exists, if not add it
    const columnExists = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'coupons' AND column_name = 'discount_amount'
    `);

    if (columnExists.rows.length === 0) {
      console.log('Adding discount_amount column to coupons table...');
      await client.query(`
        ALTER TABLE coupons ADD COLUMN discount_amount INTEGER NOT NULL DEFAULT 0
      `);
    }

    // Insert sample coupon codes
    await client.query(`
      INSERT INTO coupons (code, discount_amount, is_active, created_at, updated_at) 
      VALUES 
        ('FREEENTRY', 0, true, NOW(), NOW()),
        ('DISCOUNT10', 10, true, NOW(), NOW()),
        ('DISCOUNT20', 20, true, NOW(), NOW()),
        ('STUDENT50', 50, true, NOW(), NOW())
      ON CONFLICT (code) DO NOTHING
    `);

    console.log('✅ Coupon table migration completed successfully');
  } catch (error) {
    console.error('❌ Coupon table migration failed:', error);
    throw error;
  }
}