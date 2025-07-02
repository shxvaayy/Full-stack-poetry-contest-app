// index.ts
console.log('🚀 SERVER STARTING - First line executed');

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { registerRoutes } from './routes.js';
import { connectDatabase } from './db.js';
import { createTables } from './migrate.js';
import { migrateCouponTable } from './migrate-coupon-table.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Environment validation
console.log('🔍 Checking environment variables...');
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

console.log('✅ Environment variables validated');
console.log('📊 Environment:', process.env.NODE_ENV || 'development');

// Enhanced CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://writory.onrender.com', 'https://writory.com'] 
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5000', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-JSON'],
  maxAge: 86400 // 24 hours
}));

// Enhanced middleware with better error handling
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      console.error('❌ Invalid JSON in request body');
      res.status(400).json({ error: 'Invalid JSON format' });
      return;
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb',
  parameterLimit: 50000
}));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Enhanced request logging with more details
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const userAgent = req.get('user-agent') || 'unknown';
  const ip = req.ip || req.connection.remoteAddress || 'unknown';

  console.log(`${timestamp} - ${req.method} ${req.path} - IP: ${ip} - UA: ${userAgent.substring(0, 50)}`);

  // Log request body for POST/PUT requests (excluding sensitive data)
  if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
    const logBody = { ...req.body };
    // Remove sensitive fields from logs
    delete logBody.password;
    delete logBody.razorpay_signature;
    delete logBody.payment_id;
    console.log(`📝 Request body:`, JSON.stringify(logBody, null, 2));
  }

  next();
});

// Enhanced health check with system info
app.get('/health', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
    },
    version: process.version,
    platform: process.platform
  });
});

// Database status endpoint
app.get('/api/db-status', async (req, res) => {
  try {
    await connectDatabase();
    console.log('✅ Database connection test successful');
    res.json({
      status: 'connected',
      timestamp: new Date().toISOString(),
      message: 'Database connection is healthy'
    });
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
      message: error.message
    });
  }
});

// Initialize database and start server
async function initializeApp() {
  try {
    console.log('🚀 Initializing application...');
    console.log('📅 Start time:', new Date().toISOString());

    // Step 1: Connect to database
    console.log('🔌 Connecting to database...');
    await connectDatabase();
    console.log('✅ Database connected successfully');

    // Step 2: Run coupon table migration
    await migrateCouponTable();
    console.log('✅ Coupon table migration completed');

    // Step 3: Run migrations to fix schema
    console.log('🔧 Running database migrations...');
    console.log('⚠️  This will recreate all tables to fix schema issues...');

    const migrationSuccess = await createTables();

    if (!migrationSuccess) {
      console.error('❌ Database migration failed - cannot continue');
      console.error('💡 Please check your database connection and permissions');
      process.exit(1);
    }

    console.log('🎉 Database schema synchronized successfully!');
    console.log('✅ All tables created with proper updated_at columns');

    // Step 4: Register API routes FIRST (before static files)
    console.log('🛣️  Registering API routes...');
    registerRoutes(app);
    console.log('✅ API routes registered successfully');

    // Step 5: Configure static file serving
    const publicPath = path.join(__dirname, '../dist/public');
    console.log('📂 Static files configuration:');
    console.log('  - Public path:', publicPath);
    console.log('  - Directory exists:', fs.existsSync(publicPath));

    if (fs.existsSync(publicPath)) {
      const files = fs.readdirSync(publicPath);
      console.log('  - Files found:', files.length);
      console.log('  - File list:', files.slice(0, 10).join(', ') + (files.length > 10 ? '...' : ''));
    } else {
      console.warn('⚠️  Public directory not found - static files will not be served');
    }

    // Enhanced static file serving with better caching and MIME types
    app.use(express.static(publicPath, {
      setHeaders: (res, filePath, stat) => {
        const ext = path.extname(filePath).toLowerCase();

        // Set appropriate MIME types and caching
        switch (ext) {
          case '.js':
            res.set('Content-Type', 'application/javascript; charset=utf-8');
            res.set('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year
            break;
          case '.css':
            res.set('Content-Type', 'text/css; charset=utf-8');
            res.set('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year
            break;
          case '.html':
            res.set('Content-Type', 'text/html; charset=utf-8');
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
            break;
          case '.json':
            res.set('Content-Type', 'application/json; charset=utf-8');
            res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
            break;
          case '.png':
          case '.jpg':
          case '.jpeg':
          case '.gif':
          case '.webp':
            res.set('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year
            break;
          case '.svg':
            res.set('Content-Type', 'image/svg+xml; charset=utf-8');
            res.set('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year
            break;
          case '.ico':
            res.set('Content-Type', 'image/x-icon');
            res.set('Cache-Control', 'public, max-age=86400'); // 1 day
            break;
          case '.woff':
          case '.woff2':
          case '.ttf':
          case '.eot':
            res.set('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year
            break;
          default:
            res.set('Cache-Control', 'public, max-age=3600'); // 1 hour default
        }

        // Add security headers for all static files
        res.set('X-Content-Type-Options', 'nosniff');
      },
      // Enhanced options
      maxAge: 0, // We handle caching manually above
      etag: true,
      lastModified: true,
      index: false // Don't serve index.html automatically
    }));

    console.log('✅ Static file serving configured with enhanced caching');

    // Step 5: React SPA catch-all handler with better error handling
    app.get('*', (req, res) => {
      // Skip API routes - they should have been handled already
      if (req.path.startsWith('/api/')) {
        console.log('🚫 API route not found:', req.path);
        return res.status(404).json({ 
          error: 'API endpoint not found',
          path: req.path,
          method: req.method,
          timestamp: new Date().toISOString()
        });
      }

      const indexPath = path.join(publicPath, 'index.html');
      console.log('📄 Serving React SPA for route:', req.path);

      if (fs.existsSync(indexPath)) {
        // Set headers for HTML delivery
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // Send the React app
        res.sendFile(indexPath, (err) => {
          if (err) {
            console.error('❌ Error serving React app:', err);
            res.status(500).json({
              error: 'Failed to load application',
              message: 'The frontend application could not be served',
              timestamp: new Date().toISOString()
            });
          } else {
            console.log('✅ React app served successfully for:', req.path);
          }
        });
      } else {
        console.error('❌ React app index.html not found at:', indexPath);

        // Provide detailed error information
        const publicExists = fs.existsSync(publicPath);
        const files = publicExists ? fs.readdirSync(publicPath).slice(0, 20) : [];

        res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Frontend Not Found - Writory</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                margin: 0; padding: 40px; background: #f5f5f5; color: #333;
              }
              .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .error { color: #d32f2f; margin: 0 0 20px 0; }
              .info { color: #1976d2; margin: 20px 0; }
              .code { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 4px; font-family: monospace; font-size: 14px; }
              .files { background: #f0f0f0; padding: 15px; margin: 10px 0; border-radius: 4px; max-height: 200px; overflow-y: auto; }
              .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
              .status.error { background: #ffebee; color: #c62828; }
              .status.warning { background: #fff3e0; color: #ef6c00; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="error">Frontend Build Not Found</h1>
              <p><span class="status error">ERROR</span> The React application build files are missing.</p>

              <div class="info">
                <h3>Diagnostic Information:</h3>
                <div class="code">
                  <strong>Expected index.html location:</strong><br>
                  ${indexPath}
                  <br><br>
                  <strong>Public directory exists:</strong> ${publicExists ? '✅ Yes' : '❌ No'}<br>
                  <strong>Files in directory:</strong> ${files.length}
                </div>

                ${files.length > 0 ? `
                <div class="files">
                  <strong>Available files:</strong><br>
                  ${files.map(f => `• ${f}`).join('<br>')}
                  ${files.length === 20 ? '<br><em>... and more</em>' : ''}
                </div>
                ` : ''}
              </div>

              <div class="info">
                <h3>How to Fix:</h3>
                <ol>
                  <li>Ensure your React app is built with <code>npm run build</code></li>
                  <li>Check that build files are in the correct directory</li>
                  <li>Verify the build output includes an <code>index.html</code> file</li>
                  <li>Restart the server after building</li>
                </ol>
              </div>

              <div class="info">
                <p><strong>Server Status:</strong> <span class="status warning">RUNNING</span> (API endpoints are functional)</p>
                <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
              </div>
            </div>
          </body>
          </html>
        `);
      }
    });

    console.log('✅ React SPA routing configured with enhanced error handling');

    // Step 6: Error handling middleware (must be last)
    app.use((error, req, res, next) => {
      console.error('🚨 Unhandled application error:', error);

      if (res.headersSent) {
        return next(error);
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message,
        timestamp: new Date().toISOString(),
        path: req.path
      });
    });

    // Step 7: Start the server
    const server = app.listen(PORT, () => {
      console.log('\n🎉 SERVER STARTED SUCCESSFULLY!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🌐 Server URL: ${process.env.NODE_ENV === 'production' ? 'https://writory.onrender.com' : `http://localhost:${PORT}`}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🚀 Port: ${PORT}`);
      console.log(`📅 Started: ${new Date().toISOString()}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Database schema fixed - updated_at columns added');
      console.log('✅ API routes active and ready');
      console.log('✅ Static file serving configured');
      console.log('✅ React SPA routing enabled');
      console.log('🎯 Poetry contest platform is ready to accept submissions!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });

    // Server error handling
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`💥 Port ${PORT} is already in use. Please choose a different port.`);
        process.exit(1);
      }
    });

    return server;

  } catch (error) {
    console.error('❌ APPLICATION INITIALIZATION FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('💡 Check your environment variables and database connection');
    process.exit(1);
  }
}

// Enhanced graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n👋 Received ${signal}, initiating graceful shutdown...`);
  console.log('🔄 Closing server...');

  // Give ongoing requests time to complete
  setTimeout(() => {
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  }, 5000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('🚨 UNCAUGHT EXCEPTION:', error);
  console.error('Stack:', error.stack);
  console.error('💥 Process will exit...');
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 UNHANDLED PROMISE REJECTION at:', promise);
  console.error('Reason:', reason);
  console.error('💥 Process will exit...');
  process.exit(1);
});

// Start the application
console.log('🔄 Starting application initialization...');
initializeApp().catch((error) => {
  console.error('💥 Failed to start application:', error);
  process.exit(1);
});