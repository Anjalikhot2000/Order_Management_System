const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

const router = express.Router();

const findCustomerByIdentifier = async (identifier) => {
    const [rows] = await db.promise().query(
        'SELECT id, user_id FROM customers WHERE id = ? OR user_id = ? LIMIT 1',
        [identifier, identifier]
    );
    return rows[0] || null;
};

// Create customer account (admin only)
router.post('/', async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized' });
    }

    const { name, email, password, phone, address, city, state, zip_code, country } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Name is required' });
    }

    if (!email || !email.trim()) {
        return res.status(400).json({ message: 'Email is required' });
    }

    if (!password) {
        return res.status(400).json({ message: 'Password is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();
    const normalizedPhone = typeof phone === 'string' && phone.trim() ? phone.trim() : null;
    const normalizedAddress = typeof address === 'string' && address.trim() ? address.trim() : null;
    const normalizedCity = typeof city === 'string' && city.trim() ? city.trim() : null;
    const normalizedState = typeof state === 'string' && state.trim() ? state.trim() : null;
    const normalizedZipCode = typeof zip_code === 'string' && zip_code.trim() ? zip_code.trim() : null;
    const normalizedCountry = typeof country === 'string' && country.trim() ? country.trim() : null;

    let transactionStarted = false;

    try {
        const [existing] = await db.promise().query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.promise().beginTransaction();
        transactionStarted = true;

        const [userResult] = await db.promise().query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [normalizedName, normalizedEmail, hashedPassword, 'customer']
        );

        const [customerResult] = await db.promise().query(
            'INSERT INTO customers (user_id, phone, address, city, state, zip_code, country) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userResult.insertId, normalizedPhone, normalizedAddress, normalizedCity, normalizedState, normalizedZipCode, normalizedCountry]
        );

        await db.promise().commit();

        res.status(201).json({
            message: 'Customer added successfully',
            customer: {
                id: customerResult.insertId,
                user_id: userResult.insertId,
                name: normalizedName,
                email: normalizedEmail,
                phone: normalizedPhone,
                address: normalizedAddress,
                city: normalizedCity,
                state: normalizedState,
                zip_code: normalizedZipCode,
                country: normalizedCountry,
                role: 'customer',
                is_blocked: false,
                status: 'active',
            }
        });
    } catch (error) {
        if (transactionStarted) {
            await db.promise().rollback();
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all customers with order count and status (admin only)
router.get('/', async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        const [customers] = await db.promise().query(`
            SELECT c.id, c.user_id, c.phone, c.city, c.state, c.country, c.address, c.zip_code,
                                     u.name, u.email, u.role, u.is_blocked,
                                     CASE WHEN COALESCE(u.is_blocked, 0) = 1 THEN 'blocked' ELSE 'active' END AS status,
                                     u.created_at,
                   COUNT(DISTINCT o.id) AS total_orders
            FROM customers c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN orders o ON o.customer_id = c.id
            GROUP BY c.id, c.user_id, c.phone, c.city, c.state, c.country, c.address, c.zip_code,
                                         u.name, u.email, u.role, u.is_blocked, u.created_at
            ORDER BY u.created_at DESC
        `);
        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get customer by ID with order history
router.get('/:id', async (req, res) => {
    try {
        const customerRef = await findCustomerByIdentifier(req.params.id);
        if (!customerRef) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        const [customers] = await db.promise().query(`
            SELECT c.*, u.name, u.email, u.role, u.is_blocked,
                   CASE WHEN COALESCE(u.is_blocked, 0) = 1 THEN 'blocked' ELSE 'active' END AS status,
                   u.created_at
            FROM customers c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        `, [customerRef.id]);

        if (customers.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        const [orders] = await db.promise().query(
            'SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC',
            [customerRef.id]
        );

        res.json({ ...customers[0], orders });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update customer details — name, email + profile fields (admin only)
router.put('/:id', async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }

    const { name, email, phone, address, city, state, zip_code, country } = req.body;

    try {
        const customerRef = await findCustomerByIdentifier(req.params.id);
        if (!customerRef) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        const userId = customerRef.user_id;

        // Guard against duplicate email
        if (email) {
            const [dup] = await db.promise().query(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email, userId]
            );
            if (dup.length > 0) {
                return res.status(400).json({ message: 'Email already in use by another account' });
            }
        }

        if (name || email) {
            await db.promise().query(
                'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?',
                [name || null, email || null, userId]
            );
        }

        await db.promise().query(
            'UPDATE customers SET phone = ?, address = ?, city = ?, state = ?, zip_code = ?, country = ? WHERE id = ?',
            [phone, address, city, state, zip_code, country, customerRef.id]
        );

        res.json({ message: 'Customer updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Block / Unblock customer (admin only)
router.put('/:id/block', async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }

    const { status, is_blocked } = req.body;
    let blockedValue = null;

    if (typeof is_blocked === 'boolean') {
        blockedValue = is_blocked;
    } else if (status === 'active' || status === 'blocked') {
        blockedValue = status === 'blocked';
    }

    if (blockedValue === null) {
        return res.status(400).json({ message: 'Invalid block value' });
    }

    try {
        const identifier = Number.parseInt(req.params.id, 10);
        if (Number.isNaN(identifier)) {
            return res.status(400).json({ message: 'Invalid customer identifier' });
        }

        const [result] = await db.promise().query(
            `UPDATE users u
             INNER JOIN customers c ON c.user_id = u.id
             SET u.is_blocked = ?
             WHERE c.id = ? OR c.user_id = ?`,
            [blockedValue ? 1 : 0, identifier, identifier]
        );

        if ((result.affectedRows || 0) === 0) {
            const customerRef = await findCustomerByIdentifier(identifier);
            if (!customerRef) {
                return res.status(404).json({ message: 'Customer not found' });
            }
            return res.json({ message: `Customer ${blockedValue ? 'blocked' : 'unblocked'} successfully` });
        }

        res.json({ message: `Customer ${blockedValue ? 'blocked' : 'unblocked'} successfully` });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete customer (admin only) — removes user record; cascades to customers table
router.delete('/:id', async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }

    try {
        const identifier = Number.parseInt(req.params.id, 10);
        if (Number.isNaN(identifier)) {
            return res.status(400).json({ message: 'Invalid customer identifier' });
        }

        const [result] = await db.promise().query(
            `DELETE u FROM users u
             INNER JOIN customers c ON c.user_id = u.id
             WHERE c.id = ? OR c.user_id = ?`,
            [identifier, identifier]
        );

        if ((result.affectedRows || 0) === 0) {
            const customerRef = await findCustomerByIdentifier(identifier);
            if (!customerRef) {
                return res.status(404).json({ message: 'Customer not found' });
            }
            await db.promise().query('DELETE FROM users WHERE id = ?', [customerRef.user_id]);
        }

        res.json({ message: 'Customer deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;