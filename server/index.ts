import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import router from './routes.js';
import { createCouponTrackingTable } from './create-coupon-tracking.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] // Replace with your actual domain
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Enhanced body parsing with larger limits for file uploads
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      console.error('❌ Invalid JSON received:', e);
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb',
  parameterLimit: 1000
}));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Only set HTTPS headers in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const userAgent = req.get('User-Agent') || 'Unknown';
  
  console.log(`[${timestamp}] ${method} ${url} - ${userAgent}`);
  
  // Log body for POST requests (excluding file uploads)
  if (method === 'POST' && !req.url.includes('/upload') && !req.url.includes('/submit')) {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/', router);

// Serve static files from client build
const clientBuildPath = join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath, {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
  etag: true,
  lastModified: true
}));

// Catch-all handler for SPA routing
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  res.sendFile(join(clientBuildPath, 'index.html'), (err) => {
    if (err) {
      console.error('❌ Error serving index.html:', err);
      res.status(500).send('Internal Server Error');
    }
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Global error handler:', error);
  
  // Handle specific error types
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON in request body',
      details: error.message
    });
  }
  
  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Request entity too large',
      details: 'File size exceeds the maximum allowed limit'
    });
  }
  
  // Default error response
  const statusCode = error.statusCode || error.status || 500;
  const message = error.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in production, just log
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit in production, just log
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

// Database initialization function
async function initializeDatabase() {
  try {
    console.log('🔧 Initializing database...');
    await createCouponTrackingTable();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.log('⚠️ Continuing without database initialization - some features may not work');
    // Don't exit - continue with startup for better resilience
  }
}

// Enhanced startup logging
console.log('🚀 Starting Writory Poetry Contest Server...');
console.log('📋 Configuration:');
console.log(`   - Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`   - Port: ${port}`);
console.log(`   - Database URL: ${process.env.DATABASE_URL ? '✅ Configured' : '❌ Missing'}`);
console.log(`   - Google Drive: ${process.env.GOOGLE_DRIVE_CREDENTIALS ? '✅ Configured' : '❌ Missing'}`);
console.log(`   - Email Service: ${process.env.EMAIL_USER && process.env.EMAIL_PASS ? '✅ Configured' : '❌ Missing'}`);
console.log(`   - Razorpay: ${process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET ? '✅ Configured' : '❌ Missing'}`);
console.log(`   - PayPal: ${process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET ? '✅ Configured' : '❌ Missing'}`);
console.log(`   - Stripe: ${process.env.STRIPE_SECRET_KEY ? '✅ Configured' : '❌ Missing'}`);

// Initialize database and start server
initializeDatabase().then(() => {
  const server = app.listen(port, () => {
    console.log('✅ Database setup completed');
    console.log(`🌟 Writory Poetry Contest Server running on port ${port}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📁 Serving static files from: ${clientBuildPath}`);
    console.log('🎯 Server is ready to accept submissions!');
    
    // Log available endpoints in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n📋 Available API endpoints:');
      console.log('   - GET  /health');
      console.log('   - GET  /api/test');
      console.log('   - POST /api/submit-poem');
      console.log('   - POST /api/submit-multiple-poems');
      console.log('   - POST /api/validate-coupon');
      console.log('   - POST /api/create-razorpay-order');
      console.log('   - POST /api/verify-payment');
      console.log('   - GET  /api/users/:uid');
      console.log('   - GET  /api/users/:uid/submissions');
      console.log('   - GET  /api/users/:uid/submission-status');
      console.log('   - POST /api/users');
      console.log('');
    }
  });

  // Store server reference for graceful shutdown
  global.server = server;

  // Set timeouts for better production performance
  server.timeout = 120000; // 2 minutes
  server.keepAliveTimeout = 65000; // 65 seconds
  server.headersTimeout = 66000; // 66 seconds

}).catch((error) => {
  console.error('💥 Failed to start server:', error);
  process.exit(1);
});

// Export app for testing
export default app;