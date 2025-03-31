const express = require('express');
const router = express.Router();
const { pool } = require('../Database/Database');
const sql = require('mssql');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

// Encryption configuration
const USER_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16; 

// Function to derive a 32-byte key from a shorter key
function deriveKey(userKey) {
  // Use SHA-256 to derive a 32-byte key from the user's key
  return crypto.createHash('sha256').update(String(userKey)).digest();
}

// Storing the deryved key after receiving it from the database
let ENCRYPTION_KEY = null;

// Function to retrieve the encryption key from the database
async function getEncryptionKey() {
  if (ENCRYPTION_KEY) return ENCRYPTION_KEY;
  
  try {
    // Ensuring a proper connection to the database
    if (!pool.connected) {
      await pool.connect();
    }
    
    // Query the personal credentials table to get the key
    const result = await pool.request()
      .query('SELECT pnkey FROM personalcreds');
    
    if (result.recordset.length === 0) {
      throw new Error('Encryption key not found in database');
    }
    
    // Get the hashed key from the database
    const hashedKey = result.recordset[0].pnkey;
    
    // Since the key is hashed, we'll use it directly as input to derive our encryption key
    ENCRYPTION_KEY = deriveKey(hashedKey);
    
    return ENCRYPTION_KEY;
  } catch (error) {
    console.error('Error retrieving encryption key:', error);
    throw error;
  }
}

// Modified decryption function to use the retrieved key
async function decrypt(text) {
  try {
    // Get the encryption key
    const key = await getEncryptionKey();
    
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

// Get all available tables (excluding personalcreds)
router.get('/', async (req, res) => {
  try {
    const result = await pool.request()
      .query(`
        SELECT t.name as table_name
        FROM sys.tables t
        INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
        WHERE s.name = 'dbo'
        AND t.name != 'personalcreds'
        AND t.is_ms_shipped = 0
        ORDER BY t.name;
      `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// Get data from a specific table
router.get('/get/:tableName', async (req, res) => {
  const { tableName } = req.params;
  
  try {
    // First verify if the table exists and is not personalcreds
    if (tableName.toLowerCase() === 'personalcreds') {
      return res.status(403).json({ error: 'Access to this table is not allowed' });
    }

    // First check if table exists
    const tableCheck = await pool.request()
      .input('tableName', sql.VarChar, tableName)
      .query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_name = @tableName 
        AND table_schema = 'dbo'
        AND table_type = 'BASE TABLE'
        AND table_catalog = 'accountlist'
      `);

    if (tableCheck.recordset[0].count === 0) {
      return res.status(404).json({ 
        error: `Table ${tableName} not found`,
        status: 404,
        path: req.originalUrl
      });
    }

    // If table exists, query its data
    const query = `SELECT * FROM [dbo].[${tableName}]`;
    
    try {
      const result = await pool.request().query(query);

      if (!result.recordset) {
        return res.status(500).json({ 
          error: 'No recordset returned from database',
          status: 500,
          path: req.originalUrl
        });
      }

      res.setHeader('Content-Type', 'application/json');
      return res.json(result.recordset.length === 0 ? [] : result.recordset);
    } catch (queryErr) {
      return res.status(500).json({ 
        error: 'Database query failed',
        details: queryErr.message,
        status: 500,
        path: req.originalUrl
      });
    }
  } catch (err) {
    return res.status(500).json({ 
      error: 'Failed to fetch table data',
      details: err.message,
      status: 500,
      path: req.originalUrl
    });
  }
});

// Get table structure
router.get('/structure/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;

    // First verify if the table exists and is not personal credentials table
    if (tableName.toLowerCase() === 'personalcreds') {
      return res.status(403).json({ error: 'Access to this table is not allowed' });
    }

    const tableCheck = await pool.request()
      .input('tableName', sql.VarChar, tableName)
      .query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_name = @tableName 
        AND table_schema = 'dbo'
        AND table_type = 'BASE TABLE'
      `);

    if (tableCheck.recordset[0].count === 0) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Get table structure
    const result = await pool.request()
      .input('tableName', sql.VarChar, tableName)
      .query(`
        SELECT 
          COLUMN_NAME as columnName,
          DATA_TYPE as dataType,
          CHARACTER_MAXIMUM_LENGTH as maxLength,
          IS_NULLABLE as isNullable
        FROM information_schema.columns
        WHERE table_name = @tableName
        AND table_schema = 'dbo'
        ORDER BY ORDINAL_POSITION
      `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch table structure' });
  }
});

// Verify unique key
router.post('/tables/verify-key', async (req, res) => {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ error: 'Key is required' });
    }

    // Query to verify the key against stored key in database
    const result = await pool.request()
      .input('key', sql.VarChar, key)
      .query('SELECT * FROM users WHERE unique_key = @key');

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid key' });
    }

    res.json({ message: 'Key verified successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify key' });
  }
});

// Add a new endpoint to decrypt a password
router.get('/:tableName/decrypt/:accountId', async (req, res) => {
  return handleDecryptRequest(req, res);
});

router.get('/table/:tableName/decrypt/:accountId', async (req, res) => {
  return handleDecryptRequest(req, res);
});

router.get('/account/table/:tableName/decrypt/:accountId', async (req, res) => {
  return handleDecryptRequest(req, res);
});

// Centralized decrypt handler function
async function handleDecryptRequest(req, res) {
  const { tableName, accountId } = req.params;
  
  console.log(`Decrypt request received for table: ${tableName}, account: ${accountId}`);
  
  // Sanitize table name
  const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
  
  if (sanitizedTableName !== tableName) {
    return res.status(400).json({ error: 'Invalid table name' });
  }

  try {
    // First verify if the table exists and is not personalcreds
    if (sanitizedTableName.toLowerCase() === 'personalcreds') {
      return res.status(403).json({ error: 'Access to this table is not allowed' });
    }

    // Check if table exists
    const tableCheck = await pool.request()
      .input('tableName', sql.VarChar, sanitizedTableName)
      .query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_name = @tableName 
        AND table_schema = 'dbo'
        AND table_type = 'BASE TABLE'
      `);

    if (tableCheck.recordset[0].count === 0) {
      return res.status(404).json({ error: 'Table not found' });
    }

    console.log(`Table ${sanitizedTableName} found, retrieving password for account ${accountId}`);

    // Get the encrypted password
    const result = await pool.request()
      .input('accountId', sql.Int, accountId)
      .query(`SELECT passkey FROM ${sanitizedTableName} WHERE id = @accountId`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const encryptedPassword = result.recordset[0].passkey;
    console.log(`Retrieved encrypted password: ${encryptedPassword.substring(0, 10)}...`);
    
    // Try to decrypt the password with the key from database
    const decryptedPassword = await decrypt(encryptedPassword);
    
    if (decryptedPassword === null) {
      console.error('Decryption failed');
      return res.status(400).json({ 
        error: 'Failed to decrypt password',
        message: 'The password may be in an older format or not encrypted properly'
      });
    }
    
    console.log('Password decrypted successfully');
    res.json({ password: decryptedPassword });
  } catch (error) {
    console.error('Error retrieving or decrypting password:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve password',
      details: error.message
    });
  }
}

// Existing decrypt-password endpoint can now just call the handler
router.get('/decrypt-password/:tableName/:accountId', async (req, res) => {
  return handleDecryptRequest(req, res);
});

module.exports = router;