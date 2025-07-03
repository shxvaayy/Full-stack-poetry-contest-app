
import { client, connectDatabase } from './db.js';

export interface AdminSettings {
  id: number;
  setting_key: string;
  setting_value: string;
  updated_at: Date;
}

// Initialize admin settings table
export async function initializeAdminSettings() {
  try {
    await connectDatabase();
    
    // Create admin_settings table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(255) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Insert default settings if they don't exist
    await client.query(`
      INSERT INTO admin_settings (setting_key, setting_value)
      VALUES ('free_tier_enabled', 'true')
      ON CONFLICT (setting_key) DO NOTHING
    `);

    console.log('✅ Admin settings initialized');
  } catch (error) {
    console.error('❌ Error initializing admin settings:', error);
    throw error;
  }
}

// Get a setting value
export async function getSetting(key: string): Promise<string | null> {
  try {
    const result = await client.query(
      'SELECT setting_value FROM admin_settings WHERE setting_key = $1',
      [key]
    );
    
    return result.rows.length > 0 ? result.rows[0].setting_value : null;
  } catch (error) {
    console.error('❌ Error getting setting:', error);
    return null;
  }
}

// Update a setting value
export async function updateSetting(key: string, value: string): Promise<boolean> {
  try {
    await client.query(`
      INSERT INTO admin_settings (setting_key, setting_value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (setting_key) 
      DO UPDATE SET setting_value = $2, updated_at = NOW()
    `, [key, value]);
    
    console.log(`✅ Updated setting ${key} to ${value}`);
    return true;
  } catch (error) {
    console.error('❌ Error updating setting:', error);
    return false;
  }
}

// Get all settings
export async function getAllSettings(): Promise<AdminSettings[]> {
  try {
    const result = await client.query('SELECT * FROM admin_settings ORDER BY setting_key');
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting all settings:', error);
    return [];
  }
}
