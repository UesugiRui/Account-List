//Configuration
const express = require('express');
const router = express.Router();
const { pool } = require('../Database/Database');
const sql = require('mssql');

// Get all credentials for a user
router.get('/credentials/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const result = await pool.request()
            .input('username', username)
            .query('SELECT * FROM personalcreds WHERE username = @username');

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Error fetching credentials:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching credentials',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Update credentials
router.put('/credentials/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const { passkey, pnkey } = req.body;

        const result = await pool.request()
            .input('username', username)
            .input('passkey', passkey)
            .input('pnkey', pnkey)
            .query(`
                UPDATE personalcreds 
                SET passkey = @passkey, pnkey = @pnkey 
                WHERE username = @username
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'Credentials updated successfully'
        });
    } catch (error) {
        console.error('Error updating credentials:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while updating credentials',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Endpoint to decrypt a password (only accessible after verification)
router.get('/decrypt-password/:tableName/:accountId', async (req, res) => {
  const { tableName, accountId } = req.params;
  
  // Check if user is authenticated
  if (!req.session.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // Sanitize table name
  const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
  
  if (sanitizedTableName !== tableName) {
    return res.status(400).json({ message: 'Invalid table name' });
  }

  try {
    // Ensuring a proper connection
    if (!pool.connected) {
      await pool.connect();
    }

    // Get the account record
    const query = `SELECT passkey FROM ${sanitizedTableName} WHERE id = @accountId`;
    
    const result = await pool.request()
      .input('accountId', sql.Int, accountId)
      .query(query);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Get the encrypted password
    const storedPassword = result.recordset[0].passkey;
    
    // Return the password
    res.json({ password: storedPassword });
  } catch (error) {
    console.error('Error retrieving password:', error);
    res.status(500).json({ message: 'Failed to retrieve password' });
  }
});
module.exports = router;