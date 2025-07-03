import { client, connectDatabase } from './db.js';
import { Request, Response, NextFunction } from 'express';

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
    console.log('👤 Initializing admin users...');

    await connectDatabase();

    // Check if admin_users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_users'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ admin_users table does not exist, creating it...');
      await client.query(`
        CREATE TABLE admin_users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          role VARCHAR(50) DEFAULT 'admin' NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);
      console.log('✅ admin_users table created');
    }

    // Add default admin users
    const defaultAdmins = [
      'writorycontest@gmail.com',
      'admin@writory.com',
      'your-email@gmail.com',  // Add your actual email here
      'shivaaymehra@gmail.com',
      'shiningbhavya.seth@gmail.com'
    ];

    for (const email of defaultAdmins) {
      try {
        const result = await client.query(`
          INSERT INTO admin_users (email, role, created_at, updated_at)
          VALUES ($1, 'admin', NOW(), NOW())
          ON CONFLICT (email) DO NOTHING
          RETURNING id
        `, [email]);

        if (result.rows.length > 0) {
          console.log(`✅ Admin user added: ${email}`);
        } else {
          console.log(`ℹ️ Admin user already exists: ${email}`);
        }
      } catch (error) {
        console.error(`❌ Error adding admin ${email}:`, error);
      }
    }

    // Show all admin users
    const admins = await client.query('SELECT email, role, created_at FROM admin_users ORDER BY created_at');
    console.log('👥 Current admin users:', admins.rows);
    console.log(`📊 Total admin users: ${admins.rows.length}`);

  } catch (error) {
    console.error('❌ Error initializing admin users:', error);
    throw error;
  }
}

// Check if user is admin
export async function isAdmin(email: string): Promise<boolean> {
  try {
    console.log('🔍 Checking admin status for:', email);

    // Ensure database connection
    await connectDatabase();

    const result = await client.query(
      'SELECT * FROM admin_users WHERE email = $1',
      [email]
    );

    const isAdminUser = result.rows.length > 0;
    console.log('Admin check result:', { 
      email, 
      isAdmin: isAdminUser, 
      foundRecords: result.rows.length,
      adminData: result.rows[0] || 'none' 
    });

    return isAdminUser;
  } catch (error) {
    console.error('❌ Error checking admin status:', error);
    console.error('❌ Full error details:', error);
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

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string;
  const userEmail = req.headers['x-user-email'] as string;

  if (!userId || !userEmail) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Define admin emails - add your email here
  const adminEmails = [
    'admin@writory.com',
    'shiningbhavya.seth@gmail.com',
    'shivaaymehra2@gmail.com' // Replace with your actual admin email
  ];

  if (!adminEmails.includes(userEmail)) {
    console.log(`Access denied for email: ${userEmail}. Admin emails:`, adminEmails);
    return res.status(403).json({ error: 'Admin access required' });
  }

  console.log(`Admin access granted for: ${userEmail}`);
  next();
}