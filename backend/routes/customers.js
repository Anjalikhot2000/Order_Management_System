const express = require('express');
const db = require('../config/database');

const router = express.Router();

// Get all customers (admin/manager)
router.get('/', async (req, res) => {
    if (!['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        const [customers] = await db.promise().query(`
            SELECT c.*, u.name, u.email
            FROM customers c
            JOIN users u ON c.user_id = u.id
            ORDER BY u.created_at DESC
        `);
        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get customer by ID
router.get('/:id', async (req, res) => {
    try {
        const [customers] = await db.promise().query(`
            SELECT c.*, u.name, u.email
            FROM customers c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        `, [req.params.id]);

        if (customers.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        // Get customer orders
        const [orders] = await db.promise().query('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC', [req.params.id]);

        res.json({ ...customers[0], orders });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update customer details
router.put('/:id', async (req, res) => {
    const { phone, address, city, state, zip_code, country } = req.body;

    try {
        await db.promise().query(
            'UPDATE customers SET phone = ?, address = ?, city = ?, state = ?, zip_code = ?, country = ? WHERE id = ?',
            [phone, address, city, state, zip_code, country, req.params.id]
        );

        res.json({ message: 'Customer updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;