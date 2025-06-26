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

// CORS Configuration - MUST be before other middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? true // Allow all origins in production
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Handle preflight OPTIONS requests
app.options('*', cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
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
    // Register API routes
    registerRoutes(app);

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        stripe: !!process.env.STRIPE_SECRET_KEY,
        google: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON
      });
    });

    // Error handling middleware
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      console.error('Error:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ 
        error: message,
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

    // Use PORT from environment (Render sets this) or fallback
    const port = process.env.PORT || 5005;
    
    // Create and start the server
    const server = app.listen(port, '0.0.0.0', () => {
      log(`🚀 Server running on port ${port}`);
      log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      log(`💳 Stripe configured: ${!!process.env.STRIPE_SECRET_KEY}`);
      log(`🔑 Google configured: ${!!process.env.GOOGLE_SERVICE_ACCOUNT_JSON}`);
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