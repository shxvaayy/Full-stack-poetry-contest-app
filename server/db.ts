import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';

// Enhanced database configuration
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

console.log('🔍 Database Configuration:');
console.log('- DATABASE_URL exists:', !!connectionString);
console.log('- Environment:', process.env.NODE_ENV);

const client = new Client({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { 
    rejectUnauthorized: false 
  } : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  query_timeout: 60000,
});

// Track connection state
let isConnected = false;

// Enhanced connection with error handling
async function connectDatabase() {
  try {
    if (!isConnected && !client._connected) {
      console.log('🔌 Connecting to database...');
      await client.connect();
      isConnected = true;
      console.log('✅ Database connected successfully');
      
      // Test the connection
      const result = await client.query('SELECT NOW()');
      console.log('✅ Database test query successful:', result.rows[0].now);
    } else {
      console.log('✅ Database already connected');
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Handle connection errors
client.on('error', (err) => {
  console.error('❌ Database client error:', err);
  isConnected = false;
});

client.on('end', () => {
  console.log('🔌 Database connection ended');
  isConnected = false;
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (isConnected) {
    console.log('🛑 Closing database connection...');
    await client.end();
    isConnected = false;
  }
});

process.on('SIGINT', async () => {
  if (isConnected) {
    console.log('🛑 Closing database connection...');
    await client.end();
    isConnected = false;
  }
});

export const db = drizzle(client);
export { client, connectDatabase, isConnected };