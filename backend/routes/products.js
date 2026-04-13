const express = require('express');
const db = require('../config/database');

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
    try {
        const [products] = await db.promise().query(`
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            ORDER BY p.created_at DESC
        `);
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get product by ID
router.get('/:id', async (req, res) => {
    try {
        const [products] = await db.promise().query(`
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ?
        `, [req.params.id]);

        if (products.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json(products[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Add new product
router.post('/', async (req, res) => {
    const { name, description, price, category_id, stock_quantity, image_url } = req.body;

    try {
        const [result] = await db.promise().query(
            'INSERT INTO products (name, description, price, category_id, stock_quantity, image_url) VALUES (?, ?, ?, ?, ?, ?)',
            [name, description, price, category_id, stock_quantity || 0, image_url]
        );

        res.status(201).json({ id: result.insertId, message: 'Product added successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update product
router.put('/:id', async (req, res) => {
    const { name, description, price, category_id, stock_quantity, image_url } = req.body;

    try {
        await db.promise().query(
            'UPDATE products SET name = ?, description = ?, price = ?, category_id = ?, stock_quantity = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [name, description, price, category_id, stock_quantity, image_url, req.params.id]
        );

        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete product
router.delete('/:id', async (req, res) => {
    try {
        await db.promise().query('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;