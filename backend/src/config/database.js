const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'travel_costs',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
});

// Handle connection errors
pool.on('error', (err) => {
  console.error('❌ Database pool error:', err.message);
  console.error('⚠️ Database connection error occurred, but server will continue running');
  // Don't exit - let the server continue and handle errors gracefully
  // The connection will be retried on next query
});

// Test connection on startup
pool.query('SELECT NOW()')
  .then(() => {
    console.log('✅ Database connected successfully');
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
    console.error('💡 Make sure PostgreSQL is running and database is created');
    console.error('💡 Run: createdb travel_costs');
    console.error('💡 Then: psql -U postgres -d travel_costs -f database/schema.sql');
  });

module.exports = pool;

