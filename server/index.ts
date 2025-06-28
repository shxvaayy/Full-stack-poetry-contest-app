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
import { connectDatabase } from './db.js';
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

// CRITICAL FIX: Simplified initialization
async function initializeApp() {
  try {
    console.log('🚀 Initializing application...');
    
    // Step 1: Connect to database
    console.log('🔌 Step 1: Connecting to database...');
    await connectDatabase();
    console.log('✅ Step 1 completed: Database connected');
    
    // Step 2: Run migrations with explicit debugging
    console.log('🔧 Step 2: Running database migrations...');
    console.log('🎯 CRITICAL: About to call createTables()...');
    
    const migrationResult = await createTables();
    
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