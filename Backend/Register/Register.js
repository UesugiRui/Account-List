const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { pool } = require('../Database/Database');

// Password validation function
const validatePassword = (password) => {
    if (password.length < 8 || password.length > 16) {
        return { isValid: false, message: 'Password must be between 8 and 16 characters' };
    }
    if (!/[A-Z]/.test(password)) {
        return { isValid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
        return { isValid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!/[0-9]/.test(password)) {
        return { isValid: false, message: 'Password must contain at least one number' };
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return { isValid: false, message: 'Password must contain at least one special character' };
    }
    return { isValid: true };
};

router.post('/register', async (req, res) => {
    const { username, password, uniqueKey } = req.body;

    try {
        // Validate password
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({ success: false, message: passwordValidation.message });
        }

        // First check if username already exists
        const checkUser = await pool.request()
            .input('username', username)
            .query('SELECT username FROM personalcreds WHERE username = @username');

        if (checkUser.recordset.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Username already exists'
            });
        }

        // Hash password and unique key with salt rounds of 17
        const saltRounds = 17;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const hashedUniqueKey = await bcrypt.hash(uniqueKey, saltRounds);

        // Insert new user into database
        const result = await pool.request()
            .input('username', username)
            .input('passkey', hashedPassword)
            .input('pnkey', hashedUniqueKey)
            .query(`
                INSERT INTO personalcreds (username, passkey, pnkey)
                VALUES (@username, @passkey, @pnkey);
                SELECT SCOPE_IDENTITY() AS id;
            `);

        // Log successful registration
        console.log(`User registered successfully: ${username}`);

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            userId: result.recordset[0].id
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred during registration',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router; 