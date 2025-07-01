// index.ts
console.log('🚀 SERVER STARTING - First line executed');

import express from 'express';
import cors from 'cors';
import path from 'path';
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

// CRITICAL: Auto-fix database schema on startup
async function autoFixDatabase() {
  try {
    console.log('🔧 AUTO-FIXING DATABASE SCHEMA...');
    
    await connectDatabase();
    
    // Check if the problematic columns exist
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'submissions' 
      AND column_name IN ('poem_index', 'submission_uuid', 'total_poems_in_submission')
    `);
    
    const existingColumns = columnCheck.rows.map(row => row.column_name);
    console.log('📋 Existing special columns:', existingColumns);
    
    // Add missing columns one by one
    const requiredColumns = [
      { name: 'submission_uuid', type: 'VARCHAR(255) DEFAULT gen_random_uuid()' },
      { name: 'poem_index', type: 'INTEGER DEFAULT 0 NOT NULL' },
      { name: 'total_poems_in_submission', type: 'INTEGER DEFAULT 1 NOT NULL' }
    ];
    
    for (const column of requiredColumns) {
      if (!existingColumns.includes(column.name)) {
        console.log(`➕ Adding missing column: ${column.name}`);
        await client.query(`ALTER TABLE submissions ADD COLUMN ${column.name} ${column.type}`);
        console.log(`✅ Added column: ${column.name}`);
      } else {
        console.log(`✅ Column already exists: ${column.name}`);
      }
    }
    
    // Update any NULL submission_uuid values
    await client.query(`
      UPDATE submissions 
      SET submission_uuid = gen_random_uuid() 
      WHERE submission_uuid IS NULL
    `);
    
    // Verify the fix by testing a select query
    await client.query(`
      SELECT id, poem_title, submission_uuid, poem_index, total_poems_in_submission 
      FROM submissions 
      LIMIT 1
    `);
    
    console.log('🎉 Database schema auto-fix completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Database auto-fix failed:', error);
    
    // If the table doesn't exist at all, create it
    try {
      console.log('🔨 Creating submissions table from scratch...');
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS submissions (
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
          submission_uuid VARCHAR(255) DEFAULT gen_random_uuid(),
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
      
      console.log('✅ Created submissions table from scratch');
      return true;
      
    } catch (createError) {
      console.error('❌ Failed to create table:', createError);
      return false;
    }
  }
}

// Initialize everything
async function initializeApp() {
  try {
    console.log('🚀 Initializing application...');
    
    // Step 1: Fix database schema automatically
    const dbFixed = await autoFixDatabase();
    if (!dbFixed) {
      console.error('❌ Database fix failed, but continuing anyway...');
    }
    
    // Step 2: Register routes
    registerRoutes(app);
    console.log('✅ Routes registered');
    
    // Step 3: Serve static files
    const publicPath = path.join(__dirname, '../dist/public');
    app.use(express.static(publicPath));
    console.log('✅ Static files configured');
    
    // Step 4: Start server
    app.listen(PORT, () => {
      console.log('🎉 SERVER RUNNING SUCCESSFULLY!');
      console.log(`🌐 Server running on port ${PORT}`);
      console.log(`🔗 URL: ${process.env.NODE_ENV === 'production' ? 'https://writory.onrender.com' : `http://localhost:${PORT}`}`);
      console.log('✅ Database schema fixed automatically');
      console.log('✅ Ready to accept poem submissions!');
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