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

// Enhanced connection with error handling
async function connectDatabase() {
  try {
    if (!client._connected) {
      console.log('🔌 Connecting to database...');
      await client.connect();
      console.log('✅ Database connected successfully');
      
      // Test the connection
      const result = await client.query('SELECT NOW()');
      console.log('✅ Database test query successful:', result.rows[0].now);
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Connect immediately
connectDatabase().catch(console.error);

// Handle connection errors
client.on('error', (err) => {
  console.error('❌ Database client error:', err);
});

client.on('end', () => {
  console.log('🔌 Database connection ended');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Closing database connection...');
  await client.end();
});

process.on('SIGINT', async () => {
  console.log('🛑 Closing database connection...');
  await client.end();
});

export const db = drizzle(client);
export { client, connectDatabase };