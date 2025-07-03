
import { client, connectDatabase } from './db.js';

export interface AdminUser {
  id: number;
  email: string;
  role: string;
  created_at: Date;
  updated_at: Date;
}

// Initialize admin users table
export async function initializeAdminUsers() {
  try {
    await connectDatabase();
    
    // Create admin_users table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(50) DEFAULT 'admin' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Insert default admin users
    const adminEmails = [
      'shiningbhavya.seth@gmail.com',
      // Add your original admin email here
    ];

    for (const email of adminEmails) {
      await client.query(`
        INSERT INTO admin_users (email, role)
        VALUES ($1, 'admin')
        ON CONFLICT (email) DO NOTHING
      `, [email]);
    }

    console.log('✅ Admin users initialized');
  } catch (error) {
    console.error('❌ Error initializing admin users:', error);
    throw error;
  }
}

// Check if user is admin
export async function isAdmin(email: string): Promise<boolean> {
  try {
    const result = await client.query(
      'SELECT id FROM admin_users WHERE email = $1 AND role = $2',
      [email, 'admin']
    );
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('❌ Error checking admin status:', error);
    return false;
  }
}

// Add admin user
export async function addAdminUser(email: string, role: string = 'admin'): Promise<boolean> {
  try {
    await client.query(`
      INSERT INTO admin_users (email, role, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (email) 
      DO UPDATE SET role = $2, updated_at = NOW()
    `, [email, role]);
    
    console.log(`✅ Added admin user: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error adding admin user:', error);
    return false;
  }
}

// Remove admin user
export async function removeAdminUser(email: string): Promise<boolean> {
  try {
    await client.query('DELETE FROM admin_users WHERE email = $1', [email]);
    
    console.log(`✅ Removed admin user: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error removing admin user:', error);
    return false;
  }
}

// Get all admin users
export async function getAllAdminUsers(): Promise<AdminUser[]> {
  try {
    const result = await client.query('SELECT * FROM admin_users ORDER BY created_at');
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting admin users:', error);
    return [];
  }
}
