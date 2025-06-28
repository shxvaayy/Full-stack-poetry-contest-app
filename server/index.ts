import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { registerRoutes } from './routes.js';
import { connectDatabase } from './db.js';
import { createTables } from './migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Environment validation
const requiredEnvVars = ['DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// Environment check
console.log('🔍 Environment Check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', PORT);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('RAZORPAY_KEY_ID exists:', !!process.env.RAZORPAY_KEY_ID);
console.log('RAZORPAY_KEY_SECRET exists:', !!process.env.RAZORPAY_KEY_SECRET);
console.log('PAYPAL_CLIENT_ID exists:', !!process.env.PAYPAL_CLIENT_ID);
console.log('PAYPAL_CLIENT_SECRET exists:', !!process.env.PAYPAL_CLIENT_SECRET);
console.log('GOOGLE_SERVICE_ACCOUNT_JSON exists:', !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
console.log('EMAIL_USER exists:', !!process.env.EMAIL_USER);
console.log('EMAIL_PASS exists:', !!process.env.EMAIL_PASS);

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://writory.onrender.com', 'https://your-domain.com'] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'connected'
  });
});

// Database initialization function
async function initializeDatabase() {
  try {
    console.log('🚀 Initializing database...');
    
    // Step 1: Ensure database connection
    console.log('📊 Connecting to database...');
    await connectDatabase();
    
    // Step 2: Run migrations
    console.log('🔧 Running database migrations...');
    await createTables();
    
    console.log('✅ Database initialized successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Serve static files from dist/public
const publicPath = path.join(__dirname, '../dist/public');
console.log('📁 Serving static files from:', publicPath);
app.use(express.static(publicPath));

// Database initialization and startup
async function startServer() {
  try {
    console.log('🚀 Starting server initialization...');
    
    // Initialize database first
    await initializeDatabase();
    
    // Register API routes
    console.log('🔗 Registering API routes...');
    registerRoutes(app);
    
    // Error handling middleware
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('❌ Unhandled error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
      });
    });

    // Serve the React app for all other routes (SPA fallback)
    app.get('*', (req, res) => {
      const indexPath = path.join(publicPath, 'index.html');
      console.log('🎯 Serving React app from:', indexPath);
      res.sendFile(indexPath);
    });

    // Start server
    app.listen(PORT, () => {
      console.log('🎉 Server started successfully!');
      console.log(`📱 Frontend: http://localhost:${PORT}`);
      console.log(`🔧 API: http://localhost:${PORT}/api`);
      console.log(`💓 Health: http://localhost:${PORT}/health`);
      console.log(`🧪 PayPal Test: http://localhost:${PORT}/api/test-paypal`);
      console.log('⏰ Server time:', new Date().toISOString());
    });

  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});