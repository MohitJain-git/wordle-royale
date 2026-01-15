const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool (better performance than single client)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase/Heroku connections
  }
});

// Event listener for errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};