import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// Database configuration
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.error('💡 Please check your Secrets configuration in Replit');
  throw new Error('DATABASE_URL environment variable is required');
}

console.log('🔍 Database Configuration:');
console.log('- DATABASE_URL exists:', !!connectionString);
console.log('- Environment:', process.env.NODE_ENV);

// Create connection pool for high concurrency
const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { 
    rejectUnauthorized: false 
  } : false,
  // Pool configuration for 2000+ concurrent users
  max: 50, // Maximum number of connections in the pool
  min: 10, // Minimum number of connections in the pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection could not be established
  acquireTimeoutMillis: 10000, // Return an error after 10 seconds if a connection could not be acquired
  reapIntervalMillis: 1000, // Check for dead connections every second
  createTimeoutMillis: 5000, // Return an error after 5 seconds if a connection could not be created
  destroyTimeoutMillis: 5000, // Return an error after 5 seconds if a connection could not be destroyed
  createRetryIntervalMillis: 200, // Wait 200ms before retrying connection creation
  propagateCreateError: false, // Don't propagate connection creation errors
});

// Global connection state
let isConnected = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;

// Single connection function with retry logic
async function connectDatabase() {
  if (isConnected) {
    // Test connection to make sure it's still alive
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('✅ Database pool already connected and verified');
      return;
    } catch (error) {
      console.log('⚠️ Existing pool connection dead, reconnecting...');
      isConnected = false;
    }
  }

  let lastError;

  for (let attempt = 1; attempt <= MAX_CONNECTION_ATTEMPTS; attempt++) {
    try {
      console.log(`🔌 Connecting to database pool (attempt ${attempt}/${MAX_CONNECTION_ATTEMPTS})...`);
      
      // Test the pool connection
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      
      isConnected = true;
      connectionAttempts = 0;
      console.log('✅ Database pool connected successfully');
      console.log('✅ Database test query successful:', result.rows[0].now);
      console.log(`📊 Pool stats: ${pool.totalCount} total connections, ${pool.idleCount} idle, ${pool.waitingCount} waiting`);
      return;
    } catch (error) {
      lastError = error;
      console.error(`❌ Database pool connection attempt ${attempt} failed:`, error);

      if (attempt < MAX_CONNECTION_ATTEMPTS) {
        console.log(`⏳ Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  // All attempts failed
  throw new Error(`Database pool connection failed after ${MAX_CONNECTION_ATTEMPTS} attempts: ${lastError?.message}`);
}

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ Database pool error:', err);
  isConnected = false;
});

pool.on('connect', (client) => {
  console.log('🔌 New client connected to pool');
});

pool.on('acquire', (client) => {
  console.log('🔌 Client acquired from pool');
});

pool.on('release', (client) => {
  console.log('🔌 Client released back to pool');
});

// Graceful shutdown
const cleanup = async () => {
  if (isConnected) {
    console.log('🛑 Closing database pool...');
    try {
      await pool.end();
    } catch (error) {
      console.error('Error closing database pool:', error);
    }
    isConnected = false;
  }
};

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

// Create drizzle instance with pool
export const db = drizzle(pool);

// Export pool for direct access when needed
export { pool, connectDatabase, isConnected };