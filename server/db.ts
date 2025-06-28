import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';

// Database configuration
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

console.log('🔍 Database Configuration:');
console.log('- DATABASE_URL exists:', !!connectionString);
console.log('- Environment:', process.env.NODE_ENV);

// Create client but don't connect yet
const client = new Client({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { 
    rejectUnauthorized: false 
  } : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  query_timeout: 60000,
});

// Global connection state
let connectionPromise: Promise<void> | null = null;
let isConnected = false;

// Single connection function
async function connectDatabase() {
  if (isConnected) {
    console.log('✅ Database already connected');
    return;
  }
  
  if (connectionPromise) {
    console.log('⏳ Database connection in progress, waiting...');
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      console.log('🔌 Connecting to database...');
      await client.connect();
      isConnected = true;
      console.log('✅ Database connected successfully');
      
      // Test the connection
      const result = await client.query('SELECT NOW()');
      console.log('✅ Database test query successful:', result.rows[0].now);
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      connectionPromise = null;
      throw error;
    }
  })();

  return connectionPromise;
}

// Handle connection errors
client.on('error', (err) => {
  console.error('❌ Database client error:', err);
  isConnected = false;
  connectionPromise = null;
});

client.on('end', () => {
  console.log('🔌 Database connection ended');
  isConnected = false;
  connectionPromise = null;
});

// Graceful shutdown
const cleanup = async () => {
  if (isConnected) {
    console.log('🛑 Closing database connection...');
    try {
      await client.end();
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
    isConnected = false;
    connectionPromise = null;
  }
};

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

export const db = drizzle(client);
export { client, connectDatabase, isConnected };