const express = require('express');
const db = require('../config/database');
const jwt = require('jsonwebtoken');

const router = express.Router();

const DEFAULT_PRODUCT_PLACEHOLDER = 'https://via.placeholder.com/300';
const IMAGE_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const productImageCache = new Map();

const normalizeProductName = (value) => String(value || '').trim().toLowerCase();

const isMissingImageUrl = (value) => {
    const imageUrl = String(value || '').trim().toLowerCase();
    if (!imageUrl) return true;
    if (imageUrl === '/placeholder-product.jpg' || imageUrl.endsWith('/placeholder-product.jpg')) return true;
    if (imageUrl.includes('via.placeholder.com')) return true;
    return false;
};

const getCachedImage = (productName) => {
    const cacheKey = normalizeProductName(productName);
    if (!cacheKey) return null;

    const cached = productImageCache.get(cacheKey);
    if (!cached) return null;

    if (Date.now() - cached.cachedAt > IMAGE_CACHE_TTL_MS) {
        productImageCache.delete(cacheKey);
        return null;
    }

    return cached.url;
};

const setCachedImage = (productName, imageUrl) => {
    const cacheKey = normalizeProductName(productName);
    if (!cacheKey || !imageUrl) return;

    productImageCache.set(cacheKey, {
        url: imageUrl,
        cachedAt: Date.now()
    });
};

const getUnsplashFeaturedUrl = (productName) => {
    const query = encodeURIComponent(String(productName || '').trim());
    return `https://source.unsplash.com/featured/?${query}`;
};

const fetchProductImage = async (productName) => {
    const cleanedName = String(productName || '').trim();
    if (!cleanedName) {
        return DEFAULT_PRODUCT_PLACEHOLDER;
    }

    const cachedUrl = getCachedImage(cleanedName);
    if (cachedUrl) {
        return cachedUrl;
    }

    const unsplashUrl = getUnsplashFeaturedUrl(cleanedName);

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        let response;
        try {
            response = await fetch(unsplashUrl, {
                method: 'HEAD',
                redirect: 'manual',
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeout);
        }

        if (response.status >= 400) {
            throw new Error(`Image API request failed with status ${response.status}`);
        }

        const redirectedUrl = response.headers.get('location');
        const resolvedUrl = redirectedUrl || unsplashUrl;
        setCachedImage(cleanedName, resolvedUrl);
        return resolvedUrl;
    } catch (error) {
        console.warn(`Image fetch failed for "${cleanedName}":`, error.message);
        setCachedImage(cleanedName, DEFAULT_PRODUCT_PLACEHOLDER);
        return DEFAULT_PRODUCT_PLACEHOLDER;
    }
};

const ensureProductImage = async (product) => {
    if (!product) return product;

    const existingImage = typeof product.image_url === 'string' ? product.image_url.trim() : '';
    if (!isMissingImageUrl(existingImage)) {
        setCachedImage(product.name, existingImage);
        return product;
    }

    const fetchedImageUrl = await fetchProductImage(product.name);

    try {
        await db.promise().query('UPDATE products SET image_url = ? WHERE id = ?', [fetchedImageUrl, product.id]);
    } catch (error) {
        console.warn(`Failed to persist image URL for product ${product.id}:`, error.message);
    }

    return {
        ...product,
        image_url: fetchedImageUrl
    };
};

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
        const productsWithImages = await Promise.all(products.map((product) => ensureProductImage(product)));
        res.json(productsWithImages);
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

        const productWithImage = await ensureProductImage(products[0]);
        res.json(productWithImage);
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

    try {
        const submittedImageUrl = typeof image_url === 'string' && image_url.trim() ? image_url.trim() : null;
        const finalImageUrl = submittedImageUrl || await fetchProductImage(name);

        const [result] = await db.promise().query(
            'INSERT INTO products (name, description, price, category_id, stock_quantity, image_url) VALUES (?, ?, ?, ?, ?, ?)',
            [
                name.trim(),
                description.trim(),
                parseFloat(price),
                category_id || null,
                parseInt(stock_quantity) || 0,
                finalImageUrl
            ]
        );

        res.status(201).json({
            id: result.insertId,
            message: 'Product added successfully',
            product: {
                id: result.insertId,
                name: name.trim(),
                description: description.trim(),
                price: parseFloat(price),
                category_id: category_id || null,
                stock_quantity: parseInt(stock_quantity) || 0,
                image_url: finalImageUrl
            }
        });
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

    try {
        const [existingProducts] = await db.promise().query('SELECT id, image_url FROM products WHERE id = ?', [productId]);

        if (existingProducts.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const submittedImageUrl = typeof image_url === 'string' && image_url.trim() ? image_url.trim() : null;
        const currentImageUrl = typeof existingProducts[0].image_url === 'string' ? existingProducts[0].image_url.trim() : '';
        const persistedImageUrl = isMissingImageUrl(currentImageUrl) ? '' : currentImageUrl;
        const finalImageUrl = submittedImageUrl || persistedImageUrl || await fetchProductImage(name);

        const [result] = await db.promise().query(
            'UPDATE products SET name = ?, description = ?, price = ?, category_id = ?, stock_quantity = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [
                name.trim(),
                description.trim(),
                parseFloat(price),
                category_id || null,
                parseInt(stock_quantity) || 0,
                finalImageUrl,
                productId
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json({
            message: 'Product updated successfully',
            product: {
                id: parseInt(productId, 10),
                name: name.trim(),
                description: description.trim(),
                price: parseFloat(price),
                category_id: category_id || null,
                stock_quantity: parseInt(stock_quantity) || 0,
                image_url: finalImageUrl
            }
        });
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