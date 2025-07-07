import { client, connectDatabase } from './db.js';
import { Request, Response } from 'express';

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
      VALUES 
        ('free_tier_enabled', 'true'),
        ('free_tier_reset_timestamp', $1)
      ON CONFLICT (setting_key) DO NOTHING
    `, [new Date().toISOString()]);

    console.log('✅ Admin settings initialized');
  } catch (error) {
    console.error('❌ Error initializing admin settings:', error);
    throw error;
  }
}

// Get the last free tier reset timestamp
export async function getFreeTierResetTimestamp(): Promise<Date | null> {
  try {
    const result = await client.query(
      'SELECT setting_value FROM admin_settings WHERE setting_key = $1',
      ['free_tier_reset_timestamp']
    );

    if (result.rows.length > 0) {
      return new Date(result.rows[0].setting_value);
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting free tier reset timestamp:', error);
    return null;
  }
}

// Get a setting value
export async function getSetting(key: string): Promise<string | null> {
  try {
    // Check if database is connected
    if (!process.env.DATABASE_URL) {
      console.log('⚠️ DATABASE_URL not configured, cannot get setting:', key);
      return null;
    }

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

    // Special handling for free tier toggle - track reset timestamp
    if (key === 'free_tier_enabled' && value === 'true') {
      // When re-enabling free tier, set a reset timestamp
      await client.query(`
        INSERT INTO admin_settings (setting_key, setting_value, updated_at)
        VALUES ('free_tier_reset_timestamp', $1, NOW())
        ON CONFLICT (setting_key) 
        DO UPDATE SET setting_value = $1, updated_at = NOW()
      `, [new Date().toISOString()]);

      console.log(`✅ Free tier reset timestamp updated: ${new Date().toISOString()}`);
    }

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

export async function updateAdminSettings(req: Request, res: Response) {
  try {
    const { freeTierEnabled } = req.body;

    console.log('Received admin settings update:', { freeTierEnabled });

    if (typeof freeTierEnabled !== 'boolean') {
      return res.status(400).json({ error: 'Invalid settings data - freeTierEnabled must be boolean' });
    }

    // Update or insert the free tier setting
    const success = await updateSetting('free_tier_enabled', freeTierEnabled.toString());

    if (success) {
      console.log('Admin settings updated successfully');
      res.json({ success: true, message: 'Settings updated successfully' });
    } else {
      res.status(500).json({ error: 'Failed to update settings' });
    }
  } catch (error) {
    console.error('Error updating admin settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
}