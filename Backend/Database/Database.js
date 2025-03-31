const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Create a new connection pool
const pool = new sql.ConnectionPool(config);

// Handle pool events
pool.on('error', err => {
    // Removed console.log statement
});

// Connect to database and export the pool
const connectDB = async () => {
    try {
        await pool.connect();
        // Removed console.log statement
    } catch (err) {
        // Removed console.log statement
        // Wait for 5 seconds before trying to reconnect
        setTimeout(connectDB, 5000);
    }
};

// Initial connection
connectDB();

module.exports = { pool };