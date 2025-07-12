// index.ts
console.log('🚀 SERVER STARTING - First line executed');

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { registerRoutes } from './routes.js';
import { connectDatabase, pool } from './db.js';
import { migrateCouponTable } from './migrate-coupon-table.js';
import { initializeAdminSettings } from './admin-settings.js';
import { paypalRouter } from './paypal.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for correct rate limiting and IP detection
app.set('trust proxy', 1);

// Environment validation
console.log('🔍 Checking environment variables...');
console.log('🔍 Available environment keys:', Object.keys(process.env).filter(key => key.includes('DATABASE')));
console.log('🔍 DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('🔍 DATABASE_URL length:', process.env.DATABASE_URL?.length || 0);

// Check Razorpay credentials specifically
console.log('💳 Razorpay Environment Check:');
console.log('- RAZORPAY_KEY_ID exists:', !!process.env.RAZORPAY_KEY_ID);
console.log('- RAZORPAY_KEY_SECRET exists:', !!process.env.RAZORPAY_KEY_SECRET);
if (process.env.RAZORPAY_KEY_ID) {
  console.log('- RAZORPAY_KEY_ID preview:', process.env.RAZORPAY_KEY_ID.substring(0, 8) + '...');
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  if (process.env.NODE_ENV === 'production') {
    console.error('💥 FATAL: DATABASE_URL is required in production environment');
    console.error('💡 Please configure DATABASE_URL in your Render environment variables');
    process.exit(1);
  } else {
    console.error('💡 Using fallback local database URL for development');
    // Fallback for development only
    process.env.DATABASE_URL = 'postgresql://localhost:5432/writory_dev';
    console.log('⚠️ Using development database URL');
  }
}

// Check other services but don't fail startup
console.log('📊 Service Configuration Check:');
console.log('- Database URL: ✅ Available');
console.log('- Google Service Account:', process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? '✅ Configured' : '⚠️ Missing (non-critical)');
console.log('- PayPal Client ID:', process.env.PAYPAL_CLIENT_ID ? '✅ Configured' : '⚠️ Missing (non-critical)');
console.log('- Razorpay Key ID:', process.env.RAZORPAY_KEY_ID ? '✅ Configured' : '⚠️ Missing (non-critical)');
console.log('- Email User:', process.env.EMAIL_USER ? '✅ Configured' : '⚠️ Missing (non-critical)');

console.log('✅ Core environment variables validated');
console.log('📊 Environment:', process.env.NODE_ENV || 'development');

// Compression middleware for better performance
app.use(compression({
  level: 6, // Balanced compression level
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression for all other requests
    return compression.filter(req, res);
  }
}));

// Enhanced CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['www.writoryofficial.com', 'https://writory.com'] 
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5000', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-JSON'],
  maxAge: 86400 // 24 hours
}));

// Rate limiting for 5-10k concurrent users
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Increased from 1000 to 5000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

// Stricter rate limiting for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Increased from 50 to 200 payment requests per windowMs
  message: {
    error: 'Too many payment requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

// Stricter rate limiting for file uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Increased from 20 to 100 upload requests per windowMs
  message: {
    error: 'Too many file uploads from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

// Apply rate limiting
app.use(generalLimiter);
app.use('/api/create-razorpay-order', paymentLimiter);
app.use('/api/create-paypal-order', paymentLimiter);
app.use('/api/verify-payment', paymentLimiter);
app.use('/api/verify-paypal-payment', paymentLimiter);
app.use('/api/submit-poem', uploadLimiter);
app.use('/api/submit-multiple-poems', uploadLimiter);

// Enhanced middleware with better error handling
app.use(express.json({ 
  limit: '10mb', // Reduced from 50mb for better performance
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
  limit: '10mb', // Reduced from 50mb for better performance
  parameterLimit: 1000 // Reduced from 50000 for better performance
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

// Request queue management for 5-10k concurrent users
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 5000; // Increased from 1000 to 5000

// Request queue middleware
app.use((req, res, next) => {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    console.log(`⚠️ Request queue full (${activeRequests}/${MAX_CONCURRENT_REQUESTS}), rejecting request`);
    return res.status(503).json({
      error: 'Server is experiencing high load. Please try again in a few moments.',
      retryAfter: 30
    });
  }
  
  activeRequests++;
  
  // Log request start
  const startTime = Date.now();
  console.log(`📥 Request started: ${req.method} ${req.path} (${activeRequests}/${MAX_CONCURRENT_REQUESTS} active)`);
  
  // Log request end
  res.on('finish', () => {
    activeRequests--;
    const duration = Date.now() - startTime;
    console.log(`📤 Request finished: ${req.method} ${req.path} - ${res.statusCode} (${duration}ms) - (${activeRequests}/${MAX_CONCURRENT_REQUESTS} active)`);
  });
  
  next();
});

// Enhanced health check with system info and pool stats
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
    performance: {
      activeRequests: activeRequests,
      maxConcurrentRequests: MAX_CONCURRENT_REQUESTS,
      requestQueueStatus: activeRequests >= MAX_CONCURRENT_REQUESTS ? 'full' : 'available'
    },
    database: {
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingConnections: pool.waitingCount
    },
    version: process.version,
    platform: process.platform
  });
});

// Database status endpoint
app.get('/api/db-status', async (req, res) => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ Database connection test successful');
    res.json({
      status: 'connected',
      timestamp: new Date().toISOString(),
      message: 'Database connection is healthy',
      poolStats: {
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingConnections: pool.waitingCount
      }
    });
  } catch (error: unknown) {
    console.error('❌ Database connection test failed:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
      message: (typeof error === 'object' && error !== null && 'message' in error) ? (error as any).message : String(error)
    });
  }
});

// Initialize database and start server
async function initializeApp() {
  try {
    console.log('🟢 [INIT] initializeApp() started');
    console.log('🚀 Initializing application for 5-10k concurrent users...');
    console.log('📅 Start time:', new Date().toISOString());

    // Step 1: Connect to database
    console.log('🔌 [STEP] Connecting to database pool...');
    await connectDatabase();
    console.log('✅ [STEP] Database pool connected successfully');

    // Step 2: Check if this is first deployment or development
    console.log('🔍 [STEP] Checking for existing tables...');
    const tablesExist = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('users', 'submissions')
    `);
    console.log('✅ [STEP] Table check complete');

    const isFirstDeploy = tablesExist.rows.length === 0;
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isFirstDeploy || isDevelopment) {
      console.log('🔧 [STEP] Running database migrations...');
      await migrateCouponTable();
      console.log('✅ [STEP] Coupon table migration completed');
      const { createWinnerPhotosTable } = await import('./migrate-winner-photos.js');
      await createWinnerPhotosTable();
      console.log('✅ [STEP] Winner photos table migration completed');
      console.log('🎉 [STEP] Database schema synchronized successfully!');
      console.log('✅ [STEP] All tables created with proper updated_at columns');
    } else {
      console.log('✅ [STEP] Database already initialized, running essential migrations...');
      try {
        const { createWinnerPhotosTable } = await import('./migrate-winner-photos.js');
        await createWinnerPhotosTable();
        console.log('✅ [STEP] Winner photos table migration completed');
      } catch (error) {
        console.log('⚠️ [STEP] Winner photos migration skipped (non-critical):', error.message);
      }
      console.log('📊 [STEP] Preserving existing user data and submissions');
    }

    // Step 2.5: Quick users table verification (without hanging imports)
    console.log('🔧 [STEP] Quick users table verification...');
    try {
      const tableCheck = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name IN ('profile_picture_url', 'updated_at')
      `);
      console.log('✅ [STEP] Users table verification completed');
    } catch (error) {
      console.log('⚠️ [STEP] Users table verification skipped (non-critical)');
    }

    // Step 3: Initialize admin settings
    console.log('🔧 [STEP] Initializing admin settings...');
    await initializeAdminSettings();
    console.log('✅ [STEP] Admin settings initialized');

    // Step 4: Register routes
    console.log('🔧 [STEP] Registering routes...');
    registerRoutes(app);
    console.log('✅ [STEP] Routes registered successfully');

    // Step 4.5: Serve static files and SPA fallback (AFTER API routes)
    console.log('🔧 [STEP] Setting up static file serving and SPA fallback...');
    const publicPath = path.join(__dirname, '../dist/public');
    if (!fs.existsSync(publicPath)) {
      console.warn('⚠️ [WARNING] Static files directory does not exist:', publicPath);
    } else {
      console.log('✅ [STEP] Static files directory found:', publicPath);
    }
    app.use(express.static(publicPath));

    // React SPA fallback: serve index.html for all non-API routes
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(publicPath, 'index.html'));
      } else {
        res.status(404).json({ error: 'API endpoint not found' });
      }
    });
    console.log('✅ [STEP] Static file serving and SPA fallback configured - FIXED ROUTE ORDER');

    // Step 5: Start server with optimized settings for 5-10k users
    console.log('🟢 [STEP] About to start server on port', PORT);
    const server = app.listen(PORT, () => {
      console.log('🎉 [SERVER] Server started successfully!');
      console.log(`🌐 [SERVER] Server running on port ${PORT}`);
      console.log(`📊 [SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🚀 [SERVER] Ready for 5-10k concurrent users!`);
    });
    server.maxConnections = 10000;
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
    console.log('🟢 [INIT] initializeApp() completed - server should be running');
  } catch (error) {
    console.error('❌ [FATAL] Failed to initialize application:', error);
    if (typeof error === 'object' && error !== null && 'message' in error) {
      console.error('💡 [FATAL] Error details:', (error as any).message);
    }
    if (typeof error === 'object' && error !== null && 'stack' in error) {
      console.error('💡 [FATAL] Stack trace:', (error as any).stack);
    }
    process.exit(1);
  }
}

// Removed the problematic fixUserSubmissionLinks function that was causing server hangs

// Enhanced graceful shutdown handling
const gracefulShutdown = (signal: string) => {
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
process.on('uncaughtException', (error: unknown) => {
  console.error('🚨 UNCAUGHT EXCEPTION:', error);
  if (typeof error === 'object' && error !== null && 'stack' in error) {
    console.error('Stack:', (error as any).stack);
  }
  console.error('💥 Process will exit...');
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise) => {
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

// Add profile picture column to users table if it doesn't exist
async function addProfilePictureColumn() {
  try {
    const checkColumnExists = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'profile_picture_url'
    `);

    if (checkColumnExists.rows.length === 0) {
      console.log('➕ Adding profile_picture_url column to users table...');
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN profile_picture_url VARCHAR(255);
      `);
      console.log('✅ profile_picture_url column added successfully');
    } else {
      console.log('✅ profile_picture_url column already exists in users table');
    }
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'message' in error) {
      console.error('❌ Error adding profile_picture_url column:', (error as any).message);
    } else {
      console.error('❌ Error adding profile_picture_url column:', String(error));
    }
  }
}

// CRITICAL: Add poem_text column directly to submissions table
async function addPoemTextColumnDirectly() {
  try {
    console.log('🔧 Checking poem_text column in submissions table...');
    
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'submissions' AND column_name = 'poem_text'
    `);

    if (checkColumn.rows.length === 0) {
      console.log('📝 Adding poem_text column to submissions table...');
      await pool.query(`
        ALTER TABLE submissions 
        ADD COLUMN poem_text TEXT
      `);
      console.log('✅ poem_text column added successfully');
      
      // Verify the column was added
      const verify = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'submissions' AND column_name = 'poem_text'
      `);
      console.log('📋 poem_text column verified:', verify.rows[0]);
      
    } else {
      console.log('✅ poem_text column already exists in submissions table');
    }
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'message' in error) {
      console.error('❌ Error checking/adding poem_text column:', (error as any).message);
    } else {
      console.error('❌ Error checking/adding poem_text column:', String(error));
    }
    // Don't throw - continue with server startup
  }
}
