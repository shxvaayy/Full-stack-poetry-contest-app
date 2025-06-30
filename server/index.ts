console.log('🚀 SERVER STARTING - First line executed');
console.log('🚀 Node version:', process.version);
console.log('🚀 Working directory:', process.cwd());
console.log('🚀 Environment:', process.env.NODE_ENV);
console.log('🚀 Port from env:', process.env.PORT);

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

console.log('🚀 Basic imports successful');

import { registerRoutes } from './routes.js';
import { connectDatabase, client } from './db.js';
import { createTables } from './migrate.js';

console.log('🚀 All imports successful');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Express app created, PORT:', PORT);

// Environment validation
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

console.log('🚀 Environment validation passed');

// Environment check
console.log('🔍 Environment Check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', PORT);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://writory.onrender.com'] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

console.log('🚀 Middleware configured');

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

console.log('🚀 Health check route configured');

// Serve static files
const publicPath = path.join(__dirname, '../dist/public');
app.use(express.static(publicPath));

console.log('🚀 Static files configured, path:', publicPath);

// Database fix function
async function fixDatabaseSchema() {
  try {
    console.log('🔧 Fixing database schema...');
    
    // Add status column if it doesn't exist
    try {
      await client.query(`
        ALTER TABLE submissions 
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'
      `);
      console.log('✅ Status column added/verified');
    } catch (error) {
      console.log('Status column handling:', error.message);
    }
    
    // Add other missing columns that might be needed
    const columnsToAdd = [
      { name: 'author_bio', type: 'TEXT' },
      { name: 'contest_month', type: 'TEXT DEFAULT \'current\'' },
      { name: 'payment_screenshot_url', type: 'TEXT' }
    ];
    
    for (const column of columnsToAdd) {
      try {
        await client.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`);
        console.log(`✅ Added/verified column: ${column.name}`);
      } catch (error) {
        console.log(`Column ${column.name} handling:`, error.message);
      }
    }
    
    // Update existing submissions to have pending status
    try {
      const result = await client.query(`
        UPDATE submissions 
        SET status = 'pending' 
        WHERE status IS NULL
      `);
      console.log(`✅ Updated ${result.rowCount} submissions with pending status`);
    } catch (error) {
      console.log('Status update handling:', error.message);
    }
    
    // Verify table structure
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'submissions'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Current submissions table structure:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    console.log('🎉 Database schema fix completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Database schema fix failed:', error);
    return false;
  }
}

// FINAL FIX: Simple, direct initialization
async function initializeApp() {
  try {
    console.log('🚀 Initializing application...');
    
    // Step 1: Connect to database
    console.log('🔌 Step 1: Connecting to database...');
    await connectDatabase();
    console.log('✅ Step 1 completed: Database connected');
    
    // Step 1.5: Fix database schema
    console.log('🔧 Step 1.5: Fixing database schema...');
    const schemaFixed = await fixDatabaseSchema();
    if (schemaFixed) {
      console.log('✅ Step 1.5 completed: Database schema fixed');
    } else {
      console.log('⚠️ Step 1.5: Schema fix had issues, but continuing...');
    }
    
    // Step 2: Run migrations with timeout
    console.log('🔧 Step 2: Running database migrations...');
    console.log('🎯 CRITICAL: About to call createTables()...');
    
    const migrationPromise = createTables();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Migration timeout')), 30000)
    );
    
    const migrationResult = await Promise.race([migrationPromise, timeoutPromise]);
    
    console.log('🎯 CRITICAL: createTables() returned:', migrationResult);
    console.log('✅ Step 2 completed: Database migrations done');
    
    // FORCE LOG TO CONFIRM WE GET HERE
    console.log('🎯 CRITICAL CHECKPOINT: Migration phase completed, proceeding to routes...');
    
    // Step 3: Register routes
    console.log('🛣️ Step 3: Starting route registration...');
    registerRoutes(app);
    console.log('✅ Step 3 completed: Routes registered successfully');
    
    // Error handling middleware
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('❌ Unhandled error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
      });
    });

    // SPA fallback
    app.get('*', (req, res) => {
      const indexPath = path.join(publicPath, 'index.html');
      res.sendFile(indexPath);
    });

    console.log('🎯 CRITICAL CHECKPOINT: About to start server...');

    // Step 4: Start server
    console.log('🚀 Step 4: Starting server...');
    console.log(`🔌 Attempting to bind to 0.0.0.0:${PORT}...`);
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('🎉 SERVER STARTED SUCCESSFULLY!');
      console.log(`📱 Application: http://0.0.0.0:${PORT}`);
      console.log(`🔧 API: http://0.0.0.0:${PORT}/api`);
      console.log(`💓 Health: http://0.0.0.0:${PORT}/health`);
      console.log(`🌐 External URL: https://writory.onrender.com`);
      console.log('✅ Step 4 completed: Server listening');
      console.log('🔥 RENDER: Server is now accepting connections!');
      console.log('🎯 CRITICAL: PORT IS OPEN AND READY');
    });

    server.on('error', (error: any) => {
      console.error('❌ Server failed to start:', error);
      throw error;
    });

    server.on('listening', () => {
      console.log('🎯 Server listening event fired');
      console.log('🎯 RENDER SHOULD DETECT THIS PORT NOW');
    });

    return server;

  } catch (error: any) {
    console.error('❌ APPLICATION STARTUP FAILED:', error);
    console.error('❌ Error stack:', error?.stack);
    throw error;
  }
}

// Start the application
console.log('🏁 Starting application initialization...');
console.log('🎯 CRITICAL: About to call initializeApp()...');

initializeApp()
  .then((server) => {
    console.log('🎉 Application started successfully');
  })
  .catch((error) => {
    console.error('🔴 Fatal error during initialization:', error);
    process.exit(1);
  });

console.log('🚀 END OF FILE REACHED - All code loaded successfully');