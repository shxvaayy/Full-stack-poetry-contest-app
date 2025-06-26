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

// CORS Configuration - FIXED for Render deployment
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? [
          /\.onrender\.com$/, // Allow all Render subdomains
          origin // Allow same-origin requests
        ]
      : [
          'http://localhost:3000', 
          'http://localhost:5173', 
          'http://127.0.0.1:3000', 
          'http://127.0.0.1:5173'
        ];

    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      }
      // Handle regex patterns
      return allowedOrigin.test(origin);
    });

    if (isAllowed || process.env.NODE_ENV === 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
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
    'X-File-Name'
  ],
  optionsSuccessStatus: 200
}));

// Handle preflight OPTIONS requests explicitly
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Accept, Origin, Cache-Control, X-File-Name');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Validate required environment variables
    const requiredEnvVars = {
      'STRIPE_SECRET_KEY': process.env.STRIPE_SECRET_KEY,
      'GOOGLE_SERVICE_ACCOUNT_JSON': process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
      'GOOGLE_SHEET_ID': process.env.GOOGLE_SHEET_ID
    };

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars);
      process.exit(1);
    }

    // Register API routes
    registerRoutes(app);

    // Enhanced health check endpoint
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        stripe: !!process.env.STRIPE_SECRET_KEY,
        google: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
        cors: 'enabled',
        version: '1.0.2'
      });
    });

    // Test endpoint to verify CORS
    app.get('/api/test-cors', (req, res) => {
      res.json({
        message: 'CORS is working',
        origin: req.headers.origin,
        timestamp: new Date().toISOString()
      });
    });

    // API-specific error handling
    app.use('/api/*', (err: any, req: Request, res: Response, next: NextFunction) => {
      console.error('API Error:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ 
        error: message,
        timestamp: new Date().toISOString(),
        path: req.path,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      });
    });

    // Setup Vite in development or serve static files in production
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, undefined);
    } else {
      serveStatic(app);
      
      // Serve frontend for all non-API routes
      app.get("*", (req, res) => {
        if (!req.path.startsWith('/api')) {
          const indexPath = path.join(process.cwd(), "client/dist/index.html");
          if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
          } else {
            res.status(404).json({ error: 'Frontend not found' });
          }
        } else {
          res.status(404).json({ error: 'API endpoint not found' });
        }
      });
    }

    // Use PORT from environment (Render sets this automatically)
    const port = process.env.PORT || 5005;
    
    // Create and start the server
    const server = app.listen(port, '0.0.0.0', () => {
      log(`🚀 Server running on port ${port}`);
      log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      log(`💳 Stripe configured: ${!!process.env.STRIPE_SECRET_KEY}`);
      log(`🔑 Google configured: ${!!process.env.GOOGLE_SERVICE_ACCOUNT_JSON}`);
      log(`🌐 CORS configured for: ${process.env.NODE_ENV === 'production' ? 'Render domains' : 'localhost'}`);
    });

    // Handle graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`\n${signal} received, shutting down gracefully`);
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();