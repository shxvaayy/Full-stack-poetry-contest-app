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
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
  // Register routes - this should not return a server, just register the routes
  registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup Vite in development or serve static files in production
  if (process.env.NODE_ENV === "development") {
    const server = await setupVite(app, undefined); // Pass undefined since we create server later
  } else {
    serveStatic(app);
    app.get("*", (_req, res) => {
      res.sendFile(path.join(process.cwd(), "client/dist/index.html"));
    });
  }

  // Use PORT from environment (Render sets this) or fallback to 5005
  const port = process.env.PORT || 5005;
  
  // Create and start the server
  const server = app.listen(port, () => {
    log(`Server running on port ${port}`);
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
    });
  });
})();