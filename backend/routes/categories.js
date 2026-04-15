const express = require('express');
const db = require('../config/database');
const jwt = require('jsonwebtoken');

const router = express.Router();

const authenticateAdmin = (req, res, next) => {
    const authHeader = req.header('Authorization');
    const token = authHeader ? authHeader.split(' ')[1] : null;

    if (!token) {
        return res.status(401).json({ message: 'Access denied: Admins only' });
    }

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied: Admins only' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Access denied: Admins only' });
    }
};

// Get all categories
router.get('/', async (req, res) => {
    try {
        const [categories] = await db.promise().query('SELECT * FROM categories ORDER BY name');
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Add new category
router.post('/', authenticateAdmin, async (req, res) => {
    const { name, description } = req.body;
    const trimmedName = String(name || '').trim();
    const trimmedDescription = String(description || '').trim();

    if (!trimmedName) {
        return res.status(400).json({ message: 'Category name is required' });
    }

    try {
        const [existingCategories] = await db.promise().query(
            'SELECT id FROM categories WHERE LOWER(TRIM(name)) = LOWER(?) LIMIT 1',
            [trimmedName]
        );

        if (existingCategories.length > 0) {
            return res.status(409).json({ message: 'Category already exists' });
        }

        const [result] = await db.promise().query(
            'INSERT INTO categories (name, description) VALUES (?, ?)',
            [trimmedName, trimmedDescription || null]
        );

        res.status(201).json({
            id: result.insertId,
            name: trimmedName,
            description: trimmedDescription,
            message: 'Category added successfully'
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update category
router.put('/:id', authenticateAdmin, async (req, res) => {
    const { name, description } = req.body;
    const trimmedName = String(name || '').trim();
    const trimmedDescription = String(description || '').trim();

    if (!trimmedName) {
        return res.status(400).json({ message: 'Category name is required' });
    }

    try {
        const [existingCategories] = await db.promise().query(
            'SELECT id FROM categories WHERE LOWER(TRIM(name)) = LOWER(?) AND id <> ? LIMIT 1',
            [trimmedName, req.params.id]
        );

        if (existingCategories.length > 0) {
            return res.status(409).json({ message: 'Category already exists' });
        }

        const [result] = await db.promise().query(
            'UPDATE categories SET name = ?, description = ? WHERE id = ?',
            [trimmedName, trimmedDescription || null, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.json({ message: 'Category updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete category
router.delete('/:id', authenticateAdmin, async (req, res) => {
    try {
        const [result] = await db.promise().query('DELETE FROM categories WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;