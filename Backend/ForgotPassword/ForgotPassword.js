//Configuration
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { pool } = require('../Database/Database');

// Reset password route
router.post('/reset', async (req, res) => {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'Username and new password are required'
        });
    }

    try {
        // Check if password meets requirements
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,16}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'Password does not meet requirements'
            });
        }

        // Check if user exists
        const userCheck = await pool.request()
            .input('username', username)
            .query(`
                SELECT COUNT(*) as count 
                FROM personalcreds 
                WHERE username = @username
            `);

        if (userCheck.recordset[0].count === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Hash the new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update the password in the database
        await pool.request()
            .input('username', username)
            .input('passkey', hashedPassword)
            .query(`
                UPDATE personalcreds 
                SET passkey = @passkey 
                WHERE username = @username
            `);

        // Return success response
        res.json({
            success: true,
            message: 'Password reset successful'
        });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred during password reset'
        });
    }
});

module.exports = router;
