// index.ts
console.log('🚀 SERVER STARTING - First line executed');

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { registerRoutes } from './routes.js';
import { connectDatabase, client } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Environment validation
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://writory.onrender.com'] 
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// NUCLEAR OPTION: Complete database recreation
async function forceFixDatabase() {
  try {
    console.log('💥 FORCING DATABASE RECREATION...');
    
    await connectDatabase();
    
    // Step 1: Drop the problematic table completely
    console.log('🗑️ Dropping submissions table completely...');
    await client.query('DROP TABLE IF EXISTS submissions CASCADE;');
    console.log('✅ Submissions table dropped');
    
    // Step 2: Recreate with ALL columns
    console.log('🔨 Creating new submissions table with ALL columns...');
    await client.query(`
      CREATE TABLE submissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100),
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        age VARCHAR(10),
        poem_title VARCHAR(255) NOT NULL,
        tier VARCHAR(50) NOT NULL,
        price DECIMAL(10,2) DEFAULT 0.00,
        poem_file_url TEXT,
        photo_url TEXT,
        payment_id VARCHAR(255),
        payment_method VARCHAR(50),
        submission_uuid VARCHAR(255) NOT NULL DEFAULT gen_random_uuid(),
        poem_index INTEGER DEFAULT 0 NOT NULL,
        total_poems_in_submission INTEGER DEFAULT 1 NOT NULL,
        submitted_at TIMESTAMP DEFAULT NOW() NOT NULL,
        status VARCHAR(50) DEFAULT 'pending' NOT NULL,
        score INTEGER,
        type VARCHAR(50) DEFAULT 'Human',
        score_breakdown TEXT,
        is_winner BOOLEAN DEFAULT FALSE,
        winner_position INTEGER
      );
    `);
    console.log('✅ New submissions table created with ALL columns');
    
    // Step 3: Create users table if it doesn't exist
    console.log('👥 Ensuring users table exists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        uid TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        name TEXT,
        phone TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Users table ready');
    
    // Step 4: Create contacts table if it doesn't exist
    console.log('📞 Ensuring contacts table exists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        message TEXT NOT NULL,
        subject TEXT,
        submitted_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Contacts table ready');
    
    // Step 5: Add foreign key constraint
    console.log('🔗 Adding foreign key constraint...');
    try {
      await client.query(`
        ALTER TABLE submissions 
        ADD CONSTRAINT fk_submissions_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id);
      `);
      console.log('✅ Foreign key constraint added');
    } catch (error) {
      console.log('⚠️ Foreign key constraint already exists or failed:', error.message);
    }
    
    // Step 6: Verify the structure
    console.log('🔍 Verifying table structure...');
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'submissions'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Final submissions table columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Step 7: Test insertion
    console.log('🧪 Testing submission creation...');
    const testResult = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'submissions' 
      AND column_name IN ('poem_index', 'submission_uuid', 'total_poems_in_submission')
    `);
    
    if (testResult.rows.length === 3) {
      console.log('🎉 DATABASE FORCE FIX SUCCESSFUL!');
      console.log('✅ All required columns exist');
      return true;
    } else {
      console.error('❌ Some columns still missing:', testResult.rows);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Force database fix failed:', error);
    return false;
  }
}

// Initialize everything
async function initializeApp() {
  try {
    console.log('🚀 Initializing application...');
    
    // Step 1: Force fix database (nuclear option)
    const dbFixed = await forceFixDatabase();
    if (!dbFixed) {
      console.error('❌ Database force fix failed, server may not work properly');
    } else {
      console.log('🎉 Database is now ready for submissions!');
    }
    
    // Step 2: Register API routes FIRST
    registerRoutes(app);
    console.log('✅ API routes registered');
    
    // Step 3: Serve static files with proper configuration
    const publicPath = path.join(__dirname, '../dist/public');
    console.log('📂 Public path:', publicPath);
    console.log('📂 Directory exists:', fs.existsSync(publicPath));
    
    // List files in public directory for debugging
    if (fs.existsSync(publicPath)) {
      const files = fs.readdirSync(publicPath);
      console.log('📁 Files in public directory:', files);
    }
    
    // Serve static files with proper MIME types and caching
    app.use(express.static(publicPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
          res.set('Content-Type', 'application/javascript');
          res.set('Cache-Control', 'public, max-age=31536000'); // 1 year for JS files
        } else if (filePath.endsWith('.css')) {
          res.set('Content-Type', 'text/css');
          res.set('Cache-Control', 'public, max-age=31536000'); // 1 year for CSS files
        } else if (filePath.endsWith('.html')) {
          res.set('Content-Type', 'text/html');
          res.set('Cache-Control', 'no-cache, no-store, must-revalidate'); // No cache for HTML
        } else if (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') || filePath.endsWith('.gif') || filePath.endsWith('.svg')) {
          res.set('Cache-Control', 'public, max-age=31536000'); // 1 year for images
        }
      }
    }));
    console.log('✅ Static files configured');
    
    // Step 4: Enhanced catch-all handler for React SPA routing
    app.get('*', (req, res) => {
      // Don't serve index.html for API routes
      if (req.path.startsWith('/api/')) {
        console.log('🚫 API route not found:', req.path);
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      
      const indexPath = path.join(publicPath, 'index.html');
      console.log('📄 Serving React app for path:', req.path);
      console.log('📂 Index file path:', indexPath);
      
      // Check if index.html exists
      if (fs.existsSync(indexPath)) {
        // Set proper headers for HTML to ensure fresh load
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Send the React app
        res.sendFile(indexPath, (err) => {
          if (err) {
            console.error('❌ Error serving index.html:', err);
            res.status(500).send('Error loading the application');
          } else {
            console.log('✅ Successfully served React app for:', req.path);
          }
        });
      } else {
        console.error('❌ index.html not found at:', indexPath);
        
        // Show debugging information
        const publicExists = fs.existsSync(publicPath);
        const files = publicExists ? fs.readdirSync(publicPath) : [];
        
        res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Frontend Not Found</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .error { color: #d32f2f; }
              .info { color: #1976d2; }
              .files { background: #f5f5f5; padding: 10px; margin: 10px 0; }
            </style>
          </head>
          <body>
            <h1 class="error">Frontend Build Not Found</h1>
            <p>The React app needs to be built properly.</p>
            <div class="info">
              <p><strong>Expected index.html at:</strong> ${indexPath}</p>
              <p><strong>Public directory exists:</strong> ${publicExists}</p>
              <p><strong>Available files:</strong></p>
              <div class="files">${files.length > 0 ? files.join(', ') : 'No files found'}</div>
            </div>
            <p>Please check your build configuration and ensure the React app is built to the correct directory.</p>
          </body>
          </html>
        `);
      }
    });
    
    // Step 5: Start server
    app.listen(PORT, () => {
      console.log('🎉 SERVER RUNNING SUCCESSFULLY!');
      console.log(`🌐 Server running on port ${PORT}`);
      console.log(`🔗 URL: ${process.env.NODE_ENV === 'production' ? 'https://writory.onrender.com' : `http://localhost:${PORT}`}`);
      console.log('💥 Database was forcefully recreated');
      console.log('✅ Ready to accept poem submissions!');
      console.log('🎯 React SPA routing configured');
    });
    
  } catch (error) {
    console.error('❌ Application initialization failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 Received SIGINT, shutting down gracefully');
  process.exit(0);
});

// Start the application
initializeApp();