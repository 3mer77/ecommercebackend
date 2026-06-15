const { Pool } = require('pg');

// Create a connection pool to PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ecommerce',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Fail if can't connect in 2 seconds
});

// Test the connection when the app starts
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

// Log any pool errors
pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err.message);
  process.exit(-1);
});

// Export the query function
module.exports = {
  query: (text, params) => pool.query(text, params),
  
  // For transactions (multiple queries that must all succeed or all fail)
  transaction: async (callback) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
  
  // Health check function
  healthCheck: async () => {
    try {
      await pool.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }
};