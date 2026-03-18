// ============================================================================
// File: src/config/db.js
// ============================================================================

const { Pool } = require('pg');
require('dotenv').config(); // Pulls the secure passwords from your .env file

// Creating  connection pool using the secure environment variables
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// A helpful listener that logs exactly when the database successfully connects
pool.on('connect', () => {
    console.log('✅ Connected to the HeriNjema PostgreSQL Database');
});

// A safety net to catch any random disconnects so the server doesn't crash silently
pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle database client', err);
    process.exit(-1);
});

// Export the pool so other files (like your controllers) can use it
module.exports = pool;