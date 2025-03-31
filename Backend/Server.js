//Configurations
const express = require('express');
const session = require('express-session');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
require('dotenv').config();

// Database Configurations
const app = express();
const port = process.env.PORT || 3000; 
const { pool } = require('./Database/Database');

//Routes Configurations
const loginRouter = require('./Login/Login');
const credentialsRouter = require('./Credentials/Credentials');
const accountRouter = require('./Account/Account');
const tablesRouter = require('./Tables/Tables');
const backupRouter = require('./Backup/Backup');
const passwordRouter = require('./ForgotPassword/ForgotPassword');

// Middleware pipeline
app.use(morgan('dev'));
app.use(
  cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
  })
);

// Enable pre-flight requests for all routes
app.options('*', cors());
// Session Configuration
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  createParentPath: true,
  limits: { 
    fileSize: 50 * 1024 * 1024
  },
}));

//Routes - Remove duplicates and mount tables router correctly
app.use('/api/login', loginRouter);
app.use('/api/credentials', credentialsRouter);
app.use('/api/account', accountRouter);
app.use('/api/tables', tablesRouter);
app.use('/api/backup', backupRouter);
app.use('/api/password', passwordRouter);

// Add a 404 handler that returns JSON
app.use((req, res) => {
  res.status(404).json({ 
    error: `Route ${req.method} ${req.originalUrl} not found`,
    status: 404
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Database connection and server startup
const startServer = (portNumber) => {
  const server = app.listen(portNumber, () => {
    process.env.PORT = portNumber;
    console.log(`Server running on port ${portNumber}`);
  });

  server.on('error', error => {
    if (error.code === 'EADDRINUSE') {
      const newPort = portNumber + 1;
      console.log(`\x1b[33m%s\x1b[0m`, `⚠ Port ${portNumber} is in use, trying ${newPort}...`);
      startServer(newPort);
    } else {
      console.error(`\x1b[31m%s\x1b[0m`, `✗ Server error: ${error.message}`);
      process.exit(1);
    }
  });
};

// Start application after database connection
pool.connect()
    .then(() => {
        console.log(`Connecting to database...`);
        startServer(port);
    })
    .catch(err => {
        console.error(`\x1b[31m%s\x1b[0m`, `✗ Database connection error: ${err.message}`);
        process.exit(1);
    });