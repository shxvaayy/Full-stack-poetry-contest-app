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

// Enhanced initialization function with proper error handling
async function initializeApp() {
  try {
    console.log('🚀 Initializing application...');
    
    // Step 1: Connect to database with timeout
    console.log('🔌 Step 1: Connecting to database...');
    const dbTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database connection timeout')), 45000)
    );
    
    await Promise.race([connectDatabase(), dbTimeout]);
    console.log('✅ Step 1 completed: Database connected');
    
    // Step 2: Run migrations with enhanced error handling
    console.log('🔧 Step 2: Running database migrations...');
    const migrationTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Migration timeout')), 60000)
    );
    
    try {
      const migrationResult = await Promise.race([createTables(), migrationTimeout]);
      if (migrationResult) {
        console.log('✅ Step 2 completed: Database migrations successful');
      } else {
        throw new Error('Migration returned false');
      }
    } catch (migrationError: any) {
      console.error('❌ MIGRATION ERROR:', migrationError);
      console.error('❌ Migration error message:', migrationError?.message);
      console.error('❌ Migration error stack:', migrationError?.stack);
      
      // Don't exit - attempt to continue without migrations if tables might exist
      console.log('⚠️ Continuing without migrations - tables might already exist');
    }
    
    // Step 3: Register routes with detailed error handling
    console.log('🛣️ Step 3: Starting route registration...');
    try {
      console.log('🛣️ Calling registerRoutes function...');
      registerRoutes(app);
      console.log('✅ Step 3 completed: Routes registered successfully');
    } catch (routeError: any) {
      console.error('❌ ROUTE REGISTRATION FAILED:', routeError);
      console.error('❌ Route error message:', routeError?.message);
      console.error('❌ Route error stack:', routeError?.stack);
      throw new Error(`Route registration failed: ${routeError?.message}`);
    }
    
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

    // Step 4: Start server
    console.log('🚀 Step 4: Starting server...');
    console.log(`🔌 Attempting to bind to 0.0.0.0:${PORT}...`);
    
    return new Promise((resolve, reject) => {
      const server = app.listen(PORT, '0.0.0.0', () => {
        console.log('🎉 SERVER STARTED SUCCESSFULLY!');
        console.log(`📱 Application: http://0.0.0.0:${PORT}`);
        console.log(`🔧 API: http://0.0.0.0:${PORT}/api`);
        console.log(`💓 Health: http://0.0.0.0:${PORT}/health`);
        console.log(`🌐 External URL: https://writory.onrender.com`);
        console.log('✅ Step 4 completed: Server listening');
        console.log('🔥 RENDER: Server is now accepting connections!');
        console.log('🎯 CRITICAL: PORT IS OPEN AND READY');
        resolve(server);
      });

      server.on('error', (error: any) => {
        console.error('❌ Server failed to start:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        reject(error);
      });

      server.on('listening', () => {
        console.log('🎯 Server listening event fired');
        console.log('🎯 Server address:', server.address());
        console.log('🎯 RENDER SHOULD DETECT THIS PORT NOW');
      });

      // Server startup timeout
      setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 30000);
    });

  } catch (error: any) {
    console.error('❌ APPLICATION STARTUP FAILED:', error);
    console.error('❌ Error stack:', error?.stack);
    console.error('❌ Error message:', error?.message);
    
    // If it's a migration error, try to continue
    if (error?.message?.includes('Migration') || error?.message?.includes('migration')) {
      console.log('⚠️ Migration failed, but attempting to start server anyway...');
      // Continue with server startup
    } else {
      process.exit(1);
    }
  }
}

// Start the application with proper error handling
console.log('🏁 Starting application initialization...');
initializeApp()
  .then((server) => {
    console.log('🎉 Application started successfully');
  })
  .catch((error) => {
    console.error('🔴 Fatal error during initialization:', error);
    
    // Give Render a bit more time before exiting
    setTimeout(() => {
      process.exit(1);
    }, 5000);
  });

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  setTimeout(() => process.exit(0), 5000);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  setTimeout(() => process.exit(0), 5000);
});

// Enhanced error handling
process.on('uncaughtException', (error) => {
  console.error('🔴 Uncaught Exception:', error);
  console.error('🔴 Stack:', error.stack);
  
  // Don't exit immediately, give server time to start
  setTimeout(() => {
    process.exit(1);
  }, 10000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔴 Unhandled Rejection at:', promise, 'reason:', reason);
  
  // Don't exit immediately for unhandled rejections
  console.log('⚠️ Continuing despite unhandled rejection...');
});

console.log('🚀 END OF FILE REACHED - All code loaded successfully');