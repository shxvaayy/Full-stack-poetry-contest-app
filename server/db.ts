
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';

// Database configuration
const connectionString = process.env.DATABASE_URL;

// Create mock client for development mode
const createMockClient = () => ({
  query: async (...args: any[]) => {
    console.log('⚠️ Mock database query (no DATABASE_URL):', args[0]);
    return { rows: [] };
  },
  end: async () => {},
  on: () => {},
  removeListener: () => {}
} as any);

// Initialize client and database connection
let client: any;
let db: any;
let connectDatabase: () => Promise<void>;
let isConnected = false;

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable not found');
  console.log('💡 Please check your Secrets configuration in Replit');
  console.log('💡 Server will continue in development mode - database features disabled');
  console.log('🔄 Running in development mode without database');

  // Export mock client for development
  client = createMockClient();
  
  connectDatabase = async () => {
    console.log('⚠️ Mock database connection (no DATABASE_URL)');
    return Promise.resolve();
  };

  db = null; // No drizzle instance in mock mode
} else {
  console.log('🔍 Database Configuration:');
  console.log('- DATABASE_URL exists:', !!connectionString);
  console.log('- Environment:', process.env.NODE_ENV);

  // Create real client
  client = new Client({
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
  let connectionAttempts = 0;
  const MAX_CONNECTION_ATTEMPTS = 3;

  // Single connection function with retry logic
  connectDatabase = async () => {
    if (isConnected) {
      // Test connection to make sure it's still alive
      try {
        await client.query('SELECT 1');
        console.log('✅ Database already connected and verified');
        return;
      } catch (error) {
        console.log('⚠️ Existing connection dead, reconnecting...');
        isConnected = false;
        connectionPromise = null;
      }
    }

    if (connectionPromise) {
      console.log('⏳ Database connection in progress, waiting...');
      try {
        return await connectionPromise;
      } catch (error) {
        // Reset promise if it failed
        connectionPromise = null;
        throw error;
      }
    }

    connectionPromise = (async () => {
      let lastError;

      for (let attempt = 1; attempt <= MAX_CONNECTION_ATTEMPTS; attempt++) {
        try {
          console.log(`🔌 Connecting to database (attempt ${attempt}/${MAX_CONNECTION_ATTEMPTS})...`);
          await client.connect();
          isConnected = true;
          connectionAttempts = 0;
          console.log('✅ Database connected successfully');

          // Test the connection
          const result = await client.query('SELECT NOW()');
          console.log('✅ Database test query successful:', result.rows[0].now);
          return;
        } catch (error) {
          lastError = error;
          console.error(`❌ Database connection attempt ${attempt} failed:`, error);

          if (attempt < MAX_CONNECTION_ATTEMPTS) {
            console.log(`⏳ Retrying in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      // All attempts failed
      connectionPromise = null;
      throw new Error(`Database connection failed after ${MAX_CONNECTION_ATTEMPTS} attempts: ${lastError?.message}`);
    })();

    return connectionPromise;
  };

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

  db = drizzle(client);
}

// Export everything consistently
export { client, connectDatabase, isConnected, db };
