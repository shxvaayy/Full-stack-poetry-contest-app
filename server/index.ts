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
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

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

// Serve static files
const publicPath = path.join(__dirname, '../dist/public');
app.use(express.static(publicPath));

// Single initialization function
async function initializeApp() {
  try {
    console.log('🚀 Initializing application...');
    
    // Connect to database
    await connectDatabase();
    
    // Run migrations
    await createTables();
    
    // Register routes
    registerRoutes(app);
    
    // Error handling
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

    // Start server - FIXED: Bind to 0.0.0.0 for Render
    app.listen(PORT, '0.0.0.0', () => {
      console.log('🎉 Server started successfully!');
      console.log(`📱 Application: http://0.0.0.0:${PORT}`);
      console.log(`🔧 API: http://0.0.0.0:${PORT}/api`);
      console.log(`💓 Health: http://0.0.0.0:${PORT}/health`);
      console.log(`🌐 External URL: https://writory.onrender.com`);
    });

  } catch (error) {
    console.error('❌ Application startup failed:', error);
    process.exit(1);
  }
}

// Start the application
initializeApp();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});