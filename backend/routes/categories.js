const express = require('express');
const db = require('../config/database');

const router = express.Router();

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
router.post('/', async (req, res) => {
    const { name, description } = req.body;

    try {
        const [result] = await db.promise().query(
            'INSERT INTO categories (name, description) VALUES (?, ?)',
            [name, description]
        );

        res.status(201).json({ id: result.insertId, message: 'Category added successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update category
router.put('/:id', async (req, res) => {
    const { name, description } = req.body;

    try {
        await db.promise().query(
            'UPDATE categories SET name = ?, description = ? WHERE id = ?',
            [name, description, req.params.id]
        );

        res.json({ message: 'Category updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete category
router.delete('/:id', async (req, res) => {
    try {
        await db.promise().query('DELETE FROM categories WHERE id = ?', [req.params.id]);
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;