const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const router = express.Router();
const ADMIN_CODE = 'ADMIN';

// Register
router.post('/register', async (req, res) => {
    const { name, email, password, role = 'customer', adminCode = '' } = req.body;
    const normalizedRole = role === 'admin' ? 'admin' : 'customer';
    const normalizedAdminCode = typeof adminCode === 'string' ? adminCode.trim() : '';

    if (normalizedRole === 'admin' && normalizedAdminCode !== ADMIN_CODE) {
        return res.status(403).json({ message: 'Invalid admin code' });
    }

    const assignedRole = normalizedRole === 'admin' ? 'admin' : 'customer';

    try {
        // Check if user exists
        const [existing] = await db.promise().query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const [result] = await db.promise().query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, assignedRole]
        );

        // If customer, create customer profile
        if (assignedRole === 'customer') {
            await db.promise().query('INSERT INTO customers (user_id) VALUES (?)', [result.insertId]);
        }

        const message = assignedRole === 'admin'
            ? 'Admin account registered successfully'
            : 'Registration successful';

        res.status(201).json({ message, role: assignedRole });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [users] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const user = users[0];
        if (Boolean(user.is_blocked)) {
            console.warn(`[AUTH] Blocked login attempt for user email: ${email}`);
            return res.status(403).json({
                message: 'You are blocked due to suspicious activities'
            });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your_jwt_secret',
            { expiresIn: '24h' }
        );

        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Forgot password (simplified - in production, send email)
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    // Implementation would send reset email
    res.json({ message: 'Password reset email sent' });
});

module.exports = router;