// ============================================================================
// File: src/config/db.js
// ============================================================================

const { Pool } = require('pg');
require('dotenv').config(); 

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: String(process.env.DB_PASSWORD), 
    port: process.env.DB_PORT,
});

// Force a connection test immediately on startup
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Database Connection Failed! Check your .env passwords and ensure PostgreSQL is running.');
        console.error(err.message);
    } else {
        console.log('✅ Connected to the HeriNjema PostgreSQL Database');
        release(); // Puts the connection back in the pool for the app to use
    }
});

module.exports = pool;