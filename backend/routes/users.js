const express = require('express');
const db = require('../config/database');

const router = express.Router();

// Get all users (admin only)
router.get('/', async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }

    try {
        const [users] = await db.promise().query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get user profile
router.get('/profile', async (req, res) => {
    try {
        const [users] = await db.promise().query('SELECT id, name, email, role FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get customer details if customer
        let customerDetails = null;
        if (users[0].role === 'customer') {
            const [customers] = await db.promise().query('SELECT * FROM customers WHERE user_id = ?', [req.user.id]);
            customerDetails = customers[0] || null;
        }

        res.json({ ...users[0], customerDetails });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update user profile
router.put('/profile', async (req, res) => {
    const { name, phone, address, city, state, zip_code, country } = req.body;

    try {
        // Update user
        await db.promise().query('UPDATE users SET name = ? WHERE id = ?', [name, req.user.id]);

        // Update customer details if customer
        if (req.user.role === 'customer') {
            await db.promise().query(
                'UPDATE customers SET phone = ?, address = ?, city = ?, state = ?, zip_code = ?, country = ? WHERE user_id = ?',
                [phone, address, city, state, zip_code, country, req.user.id]
            );
        }

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update user role (admin only)
router.put('/:id/role', async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }

    const { role } = req.body;

    try {
        await db.promise().query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
        res.json({ message: 'User role updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete user (admin only)
router.delete('/:id', async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }

    try {
        await db.promise().query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;