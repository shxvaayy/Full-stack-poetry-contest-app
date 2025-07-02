import { client } from './db.js';

export async function migrateCouponTable() {
  try {
    console.log('🔄 Starting coupon table migration...');

    // Connect to database if not already connected
    if (!isConnected) {
      await connectDatabase();
    }

    // Check if discount_amount column exists
    const discountAmountResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'coupons' AND column_name = 'discount_amount'
    `);

    if (discountAmountResult.rows.length === 0) {
      console.log('Adding discount_amount column to coupons table...');
      await client.query(`
        ALTER TABLE coupons 
        ADD COLUMN discount_amount INTEGER DEFAULT 0
      `);
    }

    // Check if discount_type column exists
    const discountTypeResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'coupons' AND column_name = 'discount_type'
    `);

    if (discountTypeResult.rows.length === 0) {
      console.log('Adding discount_type column to coupons table...');

      // First add the column as nullable with default value
      await client.query(`
        ALTER TABLE coupons 
        ADD COLUMN discount_type TEXT DEFAULT 'percentage'
      `);

      // Update any NULL values to default
      console.log('Updating NULL discount_type values...');
      await client.query(`
        UPDATE coupons 
        SET discount_type = 'percentage' 
        WHERE discount_type IS NULL
      `);

      // Now make it NOT NULL
      console.log('Setting discount_type as NOT NULL...');
      await client.query(`
        ALTER TABLE coupons 
        ALTER COLUMN discount_type SET NOT NULL
      `);
    } else {
      // Column exists, but check if there are NULL values and fix them
      console.log('Checking for NULL discount_type values...');
      const nullValuesResult = await client.query(`
        SELECT COUNT(*) as count FROM coupons WHERE discount_type IS NULL
      `);

      if (parseInt(nullValuesResult.rows[0].count) > 0) {
        console.log('Fixing NULL discount_type values...');
        await client.query(`
          UPDATE coupons 
          SET discount_type = 'percentage' 
          WHERE discount_type IS NULL
        `);

        // Set NOT NULL constraint if it doesn't exist
        try {
          await client.query(`
            ALTER TABLE coupons 
            ALTER COLUMN discount_type SET NOT NULL
          `);
        } catch (error) {
          // Constraint might already exist, ignore this error
          console.log('NOT NULL constraint already exists or could not be added');
        }
      }
    }

    console.log('✅ Coupon table migration completed successfully');
  } catch (error) {
    console.error('❌ Coupon table migration failed:', error);
    throw error;
  }
}