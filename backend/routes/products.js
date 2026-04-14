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
router.post('/', authenticateAdmin, async (req, res) => {
    const { name, description, price, category_id, stock_quantity, image_url } = req.body;

    // Validation
    if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Product name is required' });
    }

    if (!description || !description.trim()) {
        return res.status(400).json({ message: 'Product description is required' });
    }

    if (price === undefined || price === null || isNaN(price) || price < 0) {
        return res.status(400).json({ message: 'Valid price is required' });
    }

    if (stock_quantity === undefined || stock_quantity === null || isNaN(stock_quantity) || stock_quantity < 0) {
        return res.status(400).json({ message: 'Valid stock quantity is required' });
    }

    if (typeof image_url === 'string' && image_url.length > 5000) {
        return res.status(400).json({ message: 'Image upload is frontend-only. Do not send Base64 image data to the server.' });
    }

    try {
        const [result] = await db.promise().query(
            'INSERT INTO products (name, description, price, category_id, stock_quantity, image_url) VALUES (?, ?, ?, ?, ?, ?)',
            [
                name.trim(),
                description.trim(),
                parseFloat(price),
                category_id || null,
                parseInt(stock_quantity) || 0,
                typeof image_url === 'string' && image_url.trim() ? image_url.trim() : null
            ]
        );

        res.status(201).json({ id: result.insertId, message: 'Product added successfully' });
    } catch (error) {
        console.error('Error adding product:', error);
        
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            return res.status(400).json({ message: 'Invalid product data format' });
        }

        res.status(500).json({ message: 'Failed to add product', error: error.message });
    }
});

// Update product
router.put('/:id', authenticateAdmin, async (req, res) => {
    const { name, description, price, category_id, stock_quantity, image_url } = req.body;
    const productId = req.params.id;

    // Validation
    if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Product name is required' });
    }

    if (!description || !description.trim()) {
        return res.status(400).json({ message: 'Product description is required' });
    }

    if (price === undefined || price === null || isNaN(price) || price < 0) {
        return res.status(400).json({ message: 'Valid price is required' });
    }

    if (stock_quantity === undefined || stock_quantity === null || isNaN(stock_quantity) || stock_quantity < 0) {
        return res.status(400).json({ message: 'Valid stock quantity is required' });
    }

    if (typeof image_url === 'string' && image_url.length > 5000) {
        return res.status(400).json({ message: 'Image upload is frontend-only. Do not send Base64 image data to the server.' });
    }

    try {
        const [result] = await db.promise().query(
            'UPDATE products SET name = ?, description = ?, price = ?, category_id = ?, stock_quantity = ?, image_url = COALESCE(?, image_url), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [
                name.trim(),
                description.trim(),
                parseFloat(price),
                category_id || null,
                parseInt(stock_quantity) || 0,
                typeof image_url === 'string' && image_url.trim() ? image_url.trim() : null,
                productId
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        console.error('Error updating product:', error);
        
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            return res.status(400).json({ message: 'Invalid product data format' });
        }

        res.status(500).json({ message: 'Failed to update product', error: error.message });
    }
});

// Delete product
router.delete('/:id', authenticateAdmin, async (req, res) => {
    try {
        await db.promise().query('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;