//Configuration
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { pool } = require('../Database/Database');

// Login route
router.post('/', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Query to get user credentials from the database
        const result = await pool.request()
            .input('username', username)
            .query(`
                SELECT passkey 
                FROM personalcreds 
                WHERE username = @username
            `);

        if (result.recordset.length > 0) {
            const hashedPassword = result.recordset[0].passkey;
            
            // Compare the provided password with the hashed password
            const isMatch = await bcrypt.compare(password, hashedPassword);

            if (isMatch) {
                // Login successful
                res.json({
                    success: true,
                    message: 'Login successful'
                });
            } else {
                // Login failed
                res.status(401).json({
                    success: false,
                    message: 'Invalid username or password'
                });
            }
        } else {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred during login'
        });
    }
});

// Key verification route
router.post('/verify', async (req, res) => {
    const { username, uniqueKey } = req.body;

    try {
        // Query to get the hashed pnkey from the database
        const result = await pool.request()
            .input('username', username)
            .query(`
                SELECT pnkey 
                FROM personalcreds 
                WHERE username = @username
            `);

        if (result.recordset.length > 0) {
            const hashedPnkey = result.recordset[0].pnkey;
            
            // Compare the provided uniqueKey with the hashed pnkey
            const isMatch = await bcrypt.compare(uniqueKey, hashedPnkey);

            if (isMatch) {
                // Key verification successful
                res.json({
                    success: true,
                    message: 'Key verification successful'
                });
            } else {
                // Key verification failed
                res.status(401).json({
                    success: false,
                    message: 'Invalid unique key'
                });
            }
        } else {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred during key verification'
        });
    }
});

module.exports = router;