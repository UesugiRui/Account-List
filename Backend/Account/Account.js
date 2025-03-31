//Configuration
const express = require('express');
const router = express.Router();
const { pool } = require('../Database/Database');
const sql = require('mssql');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const IV_LENGTH = 16;

// Function to derive a 32-byte key from a shorter key
function deriveKey(userKey) {
  // Use SHA-256 to derive a 32-byte key from the user's key
  return crypto.createHash('sha256').update(String(userKey)).digest();
}

// Function to retrieve the encryption key from the database
async function getEncryptionKey() {
  try {
    // Ensure we have a connection
    if (!pool.connected) {
      await pool.connect();
    }
    // Query to retrieve the encryption key
    const result = await pool.request()
      .query('SELECT pnkey FROM personalcreds');
    
    if (result.recordset.length === 0) {
      throw new Error('Encryption key not found in database');
    }
    // Get the key from the database
    const storedKey = result.recordset[0].pnkey;

    //Derive the key from the stored key using the SHA-256 hash function
    return deriveKey(storedKey);
  } catch (error) {
    console.error('Error retrieving encryption key:', error);
    throw error;
  }
}

// Encryption function using the derived key
async function encrypt(text) {
  try {
    // Get the encryption key (properly derived to 32 bytes)
    const key = await getEncryptionKey();
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
}

// Decryption function using the derived key
async function decrypt(text) {
  try {
    // Get the encryption key (properly derived to 32 bytes)
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

// Create a new table
router.post('/createTable', async (req, res) => {
    const { tableName } = req.body;

    if (!tableName) {
        return res.status(400).json({ message: 'Table name is required' });
    }

    // Sanitize table name to prevent SQL injection
    const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    
    if (sanitizedTableName !== tableName) {
        return res.status(400).json({ message: 'Table name can only contain letters, numbers, and underscores' });
    }

    try {
        // Ensure we have a connection
        if (!pool.connected) {
            await pool.connect();
        }

        // Check if table already exists
        const checkTableQuery = `
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'dbo' 
            AND TABLE_NAME = @tableName
        `;
        
        const checkResult = await pool.request()
            .input('tableName', sql.VarChar, sanitizedTableName)
            .query(checkTableQuery);
        
        if (checkResult.recordset.length > 0) {
            return res.status(400).json({ message: 'Table already exists' });
        }

        // Create the table
        const createTableQuery = `
            CREATE TABLE ${sanitizedTableName} (
                id INT IDENTITY(1,1) PRIMARY KEY,
                username NVARCHAR(255) NOT NULL,
                passkey NVARCHAR(255) NOT NULL,
                description NVARCHAR(255),
                created_at DATETIME DEFAULT GETDATE()
            )
        `;

        await pool.request().query(createTableQuery);
        
        res.status(201).json({ 
            message: 'Table created successfully',
            tableName: sanitizedTableName
        });
    } catch (error) {
        console.error('Error creating table:', error);
        res.status(500).json({ 
            message: 'Failed to create table',
            error: error.message 
        });
    }
});

// Get all tables
router.get('/tables', async (req, res) => {
    try {
        // Ensure we have a connection
        if (!pool.connected) {
            await pool.connect();
        }

        // More specific query for MSSQL user tables
        const query = `
            SELECT t.name as table_name
            FROM sys.tables t
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = 'dbo'
            AND t.name != 'personalcreds'
            AND t.is_ms_shipped = 0
            ORDER BY t.name;
        `;
        
        const result = await pool.request().query(query);

        // Send the table names array in the response
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching tables:', error);
        res.status(500).json({ 
            message: 'Failed to fetch tables',
            error: error.message
        });
    }
});

// Delete a table
router.delete('/table/:tableName', async (req, res) => {
    const { tableName } = req.params;

    if (!tableName) {
        return res.status(400).json({ message: 'Table name is required' });
    }

    // Sanitize table name
    const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    
    if (sanitizedTableName !== tableName) {
        return res.status(400).json({ message: 'Invalid table name' });
    }

    try {
        // Ensure we have a connection
        if (!pool.connected) {
            await pool.connect();
        }

        // Check if table exists
        const checkTableQuery = `
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'dbo' 
            AND TABLE_NAME = @tableName
        `;
        
        const checkResult = await pool.request()
            .input('tableName', sql.VarChar, sanitizedTableName)
            .query(checkTableQuery);
        
        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Table not found' });
        }

        // Delete the table
        const dropTableQuery = `DROP TABLE ${sanitizedTableName}`;
        await pool.request().query(dropTableQuery);
        
        res.json({ 
            success: true,
            message: 'Table deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting table:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete table',
            error: error.message 
        });
    }
});

// Get accounts from a specific table
router.get('/table/:tableName/accounts', async (req, res) => {
    const { tableName } = req.params;

    if (!tableName) {
        return res.status(400).json({ message: 'Table name is required' });
    }

    // Sanitize table name
    const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    
    if (sanitizedTableName !== tableName) {
        return res.status(400).json({ message: 'Invalid table name' });
    }

    try {
        // Simplified query to get all accounts from the specified table
        const query = `SELECT * FROM ${sanitizedTableName}`;
        
        const result = await pool.request().query(query);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching accounts:', error);
        res.status(500).json({ message: 'Failed to fetch accounts' });
    }
});

// Add account to a specific table usinng encryption for passkey
router.post('/table/:tableName/add-account', async (req, res) => {
    const { tableName } = req.params;
    const { username, password, description } = req.body;

    if (!tableName || !username || !password || !description) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    // Sanitize table name
    const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    
    if (sanitizedTableName !== tableName) {
        return res.status(400).json({ message: 'Invalid table name' });
    }

    try {
        // Ensure proper connection to the database
        if (!pool.connected) {
            await pool.connect();
        }

        // Check if table exists
        const checkTableQuery = `
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'dbo' 
            AND TABLE_NAME = @tableName
        `;
        
        const checkResult = await pool.request()
            .input('tableName', sql.VarChar, sanitizedTableName)
            .query(checkTableQuery);
        
        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Table not found' });
        }

        // Encrypt the password using the key from personal credentials table
        const encryptedPassword = await encrypt(password);
        console.log('Original password:', password);
        console.log('Encrypted password:', encryptedPassword);

        // Add the account to the table
        const insertQuery = `
            INSERT INTO ${sanitizedTableName} (username, passkey, description)
            VALUES (@username, @password, @description)
        `;

        await pool.request()
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, encryptedPassword)
            .input('description', sql.NVarChar, description)
            .query(insertQuery);

        res.status(201).json({ 
            success: true,
            message: 'Account added successfully' 
        });
    } catch (error) {
        console.error('Error adding account:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to add account',
            error: error.message 
        });
    }
});

// Verify unique key before deletion
router.post('/verify-unique-key', async (req, res) => {
    const { uniqueKey } = req.body;

    if (!uniqueKey) {
        return res.status(400).json({ 
            success: false,
            message: 'Unique key is required' 
        });
    }

    try {
        // Ensure we have a connection
        if (!pool.connected) {
            await pool.connect();
        }

        // Get all credentials since we know there's only one user
        const result = await pool.request()
            .query('SELECT TOP 1 * FROM personalcreds');

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No credentials found in database'
            });
        }

        // Get the stored hashed key
        const storedHashedKey = result.recordset[0].pnkey;

        // Compare the provided key with the stored hashed key
        const isMatch = await bcrypt.compare(uniqueKey, storedHashedKey);

        if (isMatch) {
            res.json({
                success: true,
                message: 'Unique key verified successfully'
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Invalid unique key'
            });
        }
    } catch (error) {
        console.error('Error verifying unique key:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify unique key',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Delete an account from a specific table
router.delete('/table/:tableName/account/:accountId', async (req, res) => {
    const { tableName, accountId } = req.params;

    if (!tableName || !accountId) {
        return res.status(400).json({ message: 'Table name and account ID are required' });
    }

    // Sanitize table name
    const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    
    if (sanitizedTableName !== tableName) {
        return res.status(400).json({ message: 'Invalid table name' });
    }

    try {
        // Ensure we have a connection
        if (!pool.connected) {
            await pool.connect();
        }

        // Check if table exists
        const checkTableQuery = `
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'dbo' 
            AND TABLE_NAME = @tableName
        `;
        
        const checkResult = await pool.request()
            .input('tableName', sql.VarChar, sanitizedTableName)
            .query(checkTableQuery);
        
        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Table not found' });
        }

        // Delete the account
        const deleteQuery = `
            DELETE FROM ${sanitizedTableName}
            WHERE id = @accountId
        `;

        const result = await pool.request()
            .input('accountId', sql.Int, accountId)
            .query(deleteQuery);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Account not found' });
        }

        res.json({ 
            success: true,
            message: 'Account deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete account',
            error: error.message 
        });
    }
});

// Route to rename a table
router.put('/table/:tableName/rename', async (req, res) => {
  const { tableName } = req.params;
  const { newName } = req.body;

  if (!tableName || !newName) {
    return res.status(400).json({ message: 'Table name and new name are required' });
  }

  // Sanitize table names
  const sanitizedOldName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
  const sanitizedNewName = newName.replace(/[^a-zA-Z0-9_]/g, '');

  try {
    // Ensure we have a connection
    if (!pool.connected) {
      await pool.connect();
    }

    // Check if old table exists
    const checkTableQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' 
      AND TABLE_NAME = @tableName
    `;
    
    const checkResult = await pool.request()
      .input('tableName', sql.VarChar, sanitizedOldName)
      .query(checkTableQuery);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Table not found' });
    }

    // Check if new table name already exists
    const checkNewResult = await pool.request()
      .input('tableName', sql.VarChar, sanitizedNewName)
      .query(checkTableQuery);

    if (checkNewResult.recordset.length > 0) {
      return res.status(400).json({ message: 'A table with this name already exists' });
    }

    // Rename the table using MSSQL syntax
    const renameQuery = `EXEC sp_rename '${sanitizedOldName}', '${sanitizedNewName}'`;
    await pool.request().query(renameQuery);

    res.json({ message: 'Table renamed successfully' });
  } catch (err) {
    console.error('Error renaming table:', err);
    res.status(500).json({ message: 'Failed to rename table' });
  }
});

// Update account route - use encryption instead of hashing
router.put('/table/:tableName/account/:accountId', async (req, res) => {
  const { tableName, accountId } = req.params;
  const { username, password, description } = req.body;

  // Validate required fields
  if (!tableName || !accountId || !username || !description) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Sanitize table name
  const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
  
  if (sanitizedTableName !== tableName) {
    return res.status(400).json({ message: 'Invalid table name' });
  }

  try {
    // Ensure we have a connection
    if (!pool.connected) {
      await pool.connect();
    }

    // Check if table exists
    const checkTableQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' 
      AND TABLE_NAME = @tableName
    `;
    
    const checkResult = await pool.request()
      .input('tableName', sql.VarChar, sanitizedTableName)
      .query(checkTableQuery);
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Table not found' });
    }

    // Update account
    let updateQuery;
    let request = pool.request()
      .input('username', sql.NVarChar, username)
      .input('description', sql.NVarChar, description)
      .input('accountId', sql.Int, accountId);

    if (password) {
      // Encrypt the password using the key from the personal credentials table
      const encryptedPassword = await encrypt(password);
      
      console.log('Updating with encrypted password:', encryptedPassword);
      
      updateQuery = `
        UPDATE ${sanitizedTableName}
        SET username = @username,
            passkey = @passkey,
            description = @description
        OUTPUT 
            inserted.id,
            inserted.username,
            inserted.passkey,
            inserted.description,
            inserted.created_at
        WHERE id = @accountId;
      `;
      request.input('passkey', sql.NVarChar, encryptedPassword); 
    } else {
      updateQuery = `
        UPDATE ${sanitizedTableName}
        SET username = @username,
            description = @description
        OUTPUT 
            inserted.id,
            inserted.username,
            inserted.passkey,
            inserted.description,
            inserted.created_at
        WHERE id = @accountId;
      `;
    }

    const result = await request.query(updateQuery);

    if (!result.rowsAffected || result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Return updated account
    const updatedAccount = result.recordset[0];
    res.json({ 
      success: true,
      message: 'Account updated successfully',
      account: {
        ...updatedAccount,
        password: '••••••••' // Masking the password for security
      }
    });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update account',
      error: error.message 
    });
  }
});

// Add a new endpoint to get the decrypted password
router.get('/table/:tableName/account/:accountId/password', async (req, res) => {
    const { tableName, accountId } = req.params;
    
    // Sanitize table name
    const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    
    if (sanitizedTableName !== tableName) {
        return res.status(400).json({ message: 'Invalid table name' });
    }

    try {
        // Ensure we have a connection
        if (!pool.connected) {
            await pool.connect();
        }

        // Get the encrypted password
        const query = `
            SELECT passkey
            FROM ${sanitizedTableName}
            WHERE id = @accountId
        `;
        
        const result = await pool.request()
            .input('accountId', sql.Int, accountId)
            .query(query);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Account not found' });
        }

        const encryptedPassword = result.recordset[0].passkey;
        
        /* Decrypt the password using the key from the personal credentials table. 
        If it fails, try decrypting it with the old format.*/
        try {
            const decryptedPassword = await decrypt(encryptedPassword);
            res.json({ password: decryptedPassword });
        } catch (error) {
            console.error('Error decrypting password:', error);
            res.status(400).json({ 
                message: 'Unable to decrypt password. It may be in an older format.',
                error: error.message
            });
        }
    } catch (error) {
        console.error('Error retrieving password:', error);
        res.status(500).json({ 
            message: 'Failed to retrieve password', 
            error: error.message 
        });
    }
});

module.exports = router;