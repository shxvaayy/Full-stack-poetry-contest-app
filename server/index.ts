import dotenv from 'dotenv';
dotenv.config();

import fs from "fs";
import path from "path";

const jsonString = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

if (!jsonString) {
  throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON in env");
}

// Decode base64 and save the JSON to a file so google.auth can read it
const decodedJson = Buffer.from(jsonString, 'base64').toString('utf-8');
fs.writeFileSync("poem-submission-service.json", decodedJson);

import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Enhanced CORS Configuration - FIXED for Render deployment
app.use(cors({
  origin: function (origin, callback) {
    console.log('🔍 CORS check for origin:', origin);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('✅ Allowing request with no origin');
      return callback(null, true);
    }
    
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? [
          /\.onrender\.com$/, // Allow all Render subdomains
          /https:\/\/.*\.onrender\.com$/, // Explicit HTTPS Render domains
          origin // Allow same-origin requests in production
        ]
      : [
          'http://localhost:3000', 
          'http://localhost:5173', 
          'http://127.0.0.1:3000', 
          'http://127.0.0.1:5173',
          'http://localhost:5005',
          'http://127.0.0.1:5005'
        ];

    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      }
      // Handle regex patterns
      return allowedOrigin.test(origin);
    });

    if (isAllowed) {
      console.log('✅ Origin allowed:', origin);
      callback(null, true);
    } else {
      console.log('❌ Origin not allowed:', origin);
      // In production, be more permissive to avoid blocking legitimate requests
      if (process.env.NODE_ENV === 'production') {
        console.log('🔓 Allowing in production mode');
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name',
    'X-Forwarded-Proto',
    'X-Forwarded-Host'
  ],
  optionsSuccessStatus: 200
}));

// Handle preflight OPTIONS requests explicitly
app.options('*', (req, res) => {
  console.log('🔧 Handling OPTIONS request for:', req.path);
  
  const origin = req.headers.origin;
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Accept, Origin, Cache-Control, X-File-Name, X-Forwarded-Proto, X-Forwarded-Host');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Body parsing middleware with increased limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware with better error tracking
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Log incoming requests
  if (path.startsWith("/api")) {
    console.log(`📥 ${req.method} ${path} - Origin: ${req.headers.origin || 'none'}`);
    
    // Log body for non-file uploads (to avoid logging huge file data)
    if (req.method === 'POST' && !req.headers['content-type']?.includes('multipart/form-data')) {
      console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    }
  }

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `📤 ${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Log response for errors
      if (res.statusCode >= 400 && capturedJsonResponse) {
        console.log('❌ Error response:', JSON.stringify(capturedJsonResponse, null, 2));
      } else if (capturedJsonResponse && Object.keys(capturedJsonResponse).length > 0) {
        // Only log non-empty success responses
        const responsePreview = JSON.stringify(capturedJsonResponse).slice(0, 100);
        logLine += ` :: ${responsePreview}${JSON.stringify(capturedJsonResponse).length > 100 ? '...' : ''}`;
      }

      log(logLine);
    }
  });

  next();
});

// Error handling middleware for better debugging
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('🚨 Middleware Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    headers: req.headers
  });
  
  next(err);
});

(async () => {
  try {
    console.log('🚀 Starting server initialization...');
    
    // Validate required environment variables
    const requiredEnvVars = {
      'RAZORPAY_KEY_ID': process.env.RAZORPAY_KEY_ID,
      'RAZORPAY_KEY_SECRET': process.env.RAZORPAY_KEY_SECRET,
      'GOOGLE_SERVICE_ACCOUNT_JSON': process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
      'GOOGLE_SHEET_ID': process.env.GOOGLE_SHEET_ID
    };

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars);
      console.error('🔧 Please check your environment configuration');
      process.exit(1);
    }

    console.log('✅ All required environment variables are present');

    // Test Razorpay configuration
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      try {
        const Razorpay = require('razorpay');
        const razorpay = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        
        console.log('✅ Razorpay configuration successful');
      } catch (razorpayError: any) {
        console.error('❌ Razorpay configuration error:', razorpayError.message);
        console.error('🔧 Please check your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
      }
    }

    // Register API routes
    console.log('📝 Registering API routes...');
    registerRoutes(app);

    // Enhanced health check endpoint
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        razorpay: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
        google: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
        cors: 'enabled',
        version: '1.0.3',
        host: req.headers.host,
        origin: req.headers.origin
      });
    });

    // Test endpoint to verify CORS and environment
    app.get('/api/test-cors', (req, res) => {
      res.json({
        message: 'CORS is working',
        origin: req.headers.origin,
        host: req.headers.host,
        protocol: req.protocol,
        forwarded_proto: req.headers['x-forwarded-proto'],
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV
      });
    });

    // Debug endpoint for troubleshooting
    app.get('/api/debug', (req, res) => {
      res.json({
        headers: req.headers,
        method: req.method,
        url: req.url,
        protocol: req.protocol,
        secure: req.secure,
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
    });

    // API-specific error handling
    app.use('/api/*', (err: any, req: Request, res: Response, next: NextFunction) => {
      console.error('🚨 API Error:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });
      
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ 
        error: message,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        ...(process.env.NODE_ENV === 'development' && { 
          stack: err.stack,
          details: err.details || 'No additional details'
        })
      });
    });

    // Setup Vite in development or serve static files in production
    if (process.env.NODE_ENV === "development") {
      console.log('🛠️ Setting up Vite for development...');
      await setupVite(app, undefined);
    } else {
      console.log('📦 Setting up static file serving for production...');
      serveStatic(app);
      
      // Serve frontend for all non-API routes
      app.get("*", (req, res) => {
        if (!req.path.startsWith('/api')) {
          const indexPath = path.join(process.cwd(), "client/dist/index.html");
          if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
          } else {
            console.error('❌ Frontend index.html not found at:', indexPath);
            res.status(404).json({ 
              error: 'Frontend not found',
              path: indexPath,
              exists: fs.existsSync(indexPath)
            });
          }
        } else {
          res.status(404).json({ 
            error: 'API endpoint not found',
            path: req.path,
            method: req.method
          });
        }
      });
    }

    // Use PORT from environment (Render sets this automatically)
    const port = process.env.PORT || 5005;
    
    // Create and start the server
    const server = app.listen(port, '0.0.0.0', () => {
      console.log('\n🎉 Server started successfully!');
      log(`🚀 Server running on port ${port}`);
      log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      log(`💳 Razorpay configured: ${!!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)}`);
      log(`🔑 Google configured: ${!!process.env.GOOGLE_SERVICE_ACCOUNT_JSON}`);
      log(`🌐 CORS configured for: ${process.env.NODE_ENV === 'production' ? 'Render domains' : 'localhost'}`);
      
      if (process.env.NODE_ENV === 'production') {
        log(`🔗 Access your app at: https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'your-app'}.onrender.com`);
      } else {
        log(`🔗 Access your app at: http://localhost:${port}`);
      }
      
      console.log('\n✅ Server is ready to handle requests!');
    });

    // Enhanced error handling for server startup
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
        process.exit(1);
      }
    });

    // Handle graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`\n${signal} received, shutting down gracefully...`);
      server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.log('❌ Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions with better logging
    process.on('uncaughtException', (error) => {
      console.error('🚨 Uncaught Exception:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 Unhandled Rejection:', {
        reason: reason,
        promise: promise,
        timestamp: new Date().toISOString()
      });
      process.exit(1);
    });

  } catch (error: any) {
    console.error('❌ Failed to start server:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    process.exit(1);
  }
})();