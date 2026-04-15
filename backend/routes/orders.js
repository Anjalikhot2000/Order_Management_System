const express = require('express');
const db = require('../config/database');

const router = express.Router();

const ALLOWED_RETURN_REASONS = [
    'Damaged product',
    'Wrong item received',
    'Not as described',
    'Quality issue',
    'Other'
];

const MAX_RETURN_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const RETURN_STATUS = {
    REQUESTED: 'Requested',
    APPROVED: 'Approved',
    REJECTED: 'Rejected'
};

const REFUND_STATUS = {
    NOT_INITIATED: 'Not Initiated',
    PROCESSING: 'Processing',
    COMPLETED: 'Completed'
};

const estimateBase64SizeInBytes = (base64Data) => {
    if (!base64Data) return 0;
    const sanitized = base64Data.replace(/\s/g, '');
    const padding = (sanitized.match(/=+$/) || [''])[0].length;
    return Math.floor((sanitized.length * 3) / 4) - padding;
};

// Get all orders (admin) or user's orders (customer)
router.get('/', async (req, res) => {
    try {
        let query = `
            SELECT o.*, c.user_id, u.name as customer_name
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            JOIN users u ON c.user_id = u.id
        `;
        let params = [];

        if (req.user.role === 'customer') {
            query += ' WHERE c.user_id = ?';
            params.push(req.user.id);
        }

        query += ' ORDER BY o.created_at DESC';

        const [orders] = await db.promise().query(query, params);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get order by ID
router.get('/:id', async (req, res) => {
    try {
        const [orders] = await db.promise().query(`
            SELECT o.*, c.user_id, u.name as customer_name, u.email
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            JOIN users u ON c.user_id = u.id
            WHERE o.id = ?
        `, [req.params.id]);

        if (orders.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check permissions
        if (req.user.role === 'customer' && orders[0].user_id !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Get order items
        const [items] = await db.promise().query(`
            SELECT oi.*, p.name as product_name, p.image_url
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [req.params.id]);

        res.json({ ...orders[0], items });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create new order
router.post('/', async (req, res) => {
    const { items, shipping_address } = req.body;

    try {
        // Check if customer account is blocked
        const [userRows] = await db.promise().query(
            'SELECT status FROM users WHERE id = ?',
            [req.user.id]
        );
        if (userRows[0]?.status === 'blocked') {
            return res.status(403).json({ message: 'Your account has been blocked. You cannot place orders.' });
        }

        // Get customer ID
        const [customers] = await db.promise().query('SELECT id FROM customers WHERE user_id = ?', [req.user.id]);
        if (customers.length === 0) {
            return res.status(400).json({ message: 'Customer profile not found' });
        }
        const customerId = customers[0].id;

        // Calculate total
        let total = 0;
        for (const item of items) {
            const [products] = await db.promise().query('SELECT price, stock_quantity FROM products WHERE id = ?', [item.product_id]);
            if (products.length === 0) {
                return res.status(400).json({ message: `Product ${item.product_id} not found` });
            }
            if (products[0].stock_quantity < item.quantity) {
                return res.status(400).json({ message: `Insufficient stock for product ${item.product_id}` });
            }
            total += products[0].price * item.quantity;
        }

        // Create order
        const [orderResult] = await db.promise().query(
            'INSERT INTO orders (customer_id, total_amount, shipping_address) VALUES (?, ?, ?)',
            [customerId, total, shipping_address]
        );

        // Add order items and update stock
        for (const item of items) {
            const [products] = await db.promise().query('SELECT price FROM products WHERE id = ?', [item.product_id]);
            await db.promise().query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [orderResult.insertId, item.product_id, item.quantity, products[0].price]
            );
            await db.promise().query(
                'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }

        res.status(201).json({ id: orderResult.insertId, message: 'Order created successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update order status
router.put('/:id/status', async (req, res) => {
    const { status } = req.body;

    try {
        await db.promise().query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ message: 'Order status updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Submit return request (customer)
router.post('/return', async (req, res) => {
    const { order_id, reason, comment, return_image } = req.body;

    if (req.user.role !== 'customer') {
        return res.status(403).json({ message: 'Only customers can submit return requests' });
    }

    if (!order_id) {
        return res.status(400).json({ message: 'Order ID is required' });
    }

    if (!reason || !ALLOWED_RETURN_REASONS.includes(reason)) {
        return res.status(400).json({ message: 'Valid return reason is required' });
    }

    let validatedReturnImage = null;
    if (return_image) {
        if (typeof return_image !== 'string') {
            return res.status(400).json({ message: 'Return image must be a valid image string' });
        }

        const imageMatch = return_image.match(/^data:(image\/(jpeg|png));base64,(.+)$/i);
        if (!imageMatch) {
            return res.status(400).json({ message: 'Only JPG and PNG images are allowed' });
        }

        const base64Payload = imageMatch[3] || '';
        const imageSizeInBytes = estimateBase64SizeInBytes(base64Payload);
        if (imageSizeInBytes > MAX_RETURN_IMAGE_SIZE_BYTES) {
            return res.status(400).json({ message: 'Image size must be 2MB or less' });
        }

        validatedReturnImage = return_image;
    }

    try {
        const [orders] = await db.promise().query(
            `
            SELECT o.id, o.status, c.user_id
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            WHERE o.id = ?
            LIMIT 1
            `,
            [order_id]
        );

        if (orders.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const order = orders[0];

        if (order.user_id !== req.user.id) {
            return res.status(403).json({ message: 'You can only return your own orders' });
        }

        if (order.status !== 'delivered') {
            return res.status(400).json({ message: 'Only delivered orders can be returned' });
        }

        await db.promise().query(
            `
            UPDATE orders
            SET status = 'returned',
                return_reason = ?,
                return_comment = ?,
                return_image = ?,
                return_status = ?,
                refund_status = ?,
                admin_message = NULL,
                return_requested_at = NOW()
            WHERE id = ?
            `,
            [
                reason,
                comment || null,
                validatedReturnImage,
                RETURN_STATUS.REQUESTED,
                REFUND_STATUS.NOT_INITIATED,
                order_id
            ]
        );

        res.json({ message: 'Return request submitted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Approve return request (admin)
router.put('/:id/approve', async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only admin can approve return requests' });
    }

    try {
        const [orders] = await db.promise().query(
            'SELECT id, status, return_status FROM orders WHERE id = ? LIMIT 1',
            [req.params.id]
        );

        if (orders.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const order = orders[0];
        if (order.status !== 'returned') {
            return res.status(400).json({ message: 'Only returned orders can be processed' });
        }

        if (order.return_status !== RETURN_STATUS.REQUESTED) {
            return res.status(400).json({ message: 'Only requested returns can be approved' });
        }

        await db.promise().query(
            `
            UPDATE orders
            SET return_status = ?,
                refund_status = ?,
                admin_message = NULL
            WHERE id = ?
            `,
            [RETURN_STATUS.APPROVED, REFUND_STATUS.PROCESSING, req.params.id]
        );

        res.json({ message: 'Return approved successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Reject return request (admin)
router.put('/:id/reject', async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only admin can reject return requests' });
    }

    const { admin_message } = req.body;
    if (!admin_message || !String(admin_message).trim()) {
        return res.status(400).json({ message: 'Admin rejection message is required' });
    }

    try {
        const [orders] = await db.promise().query(
            'SELECT id, status, return_status FROM orders WHERE id = ? LIMIT 1',
            [req.params.id]
        );

        if (orders.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const order = orders[0];
        if (order.status !== 'returned') {
            return res.status(400).json({ message: 'Only returned orders can be processed' });
        }

        if (order.return_status !== RETURN_STATUS.REQUESTED) {
            return res.status(400).json({ message: 'Only requested returns can be rejected' });
        }

        await db.promise().query(
            `
            UPDATE orders
            SET return_status = ?,
                refund_status = ?,
                admin_message = ?
            WHERE id = ?
            `,
            [RETURN_STATUS.REJECTED, REFUND_STATUS.NOT_INITIATED, String(admin_message).trim(), req.params.id]
        );

        res.json({ message: 'Return rejected successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Mark refund as completed (admin)
router.put('/:id/refund-complete', async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only admin can complete refunds' });
    }

    try {
        const [orders] = await db.promise().query(
            'SELECT id, status, return_status, refund_status FROM orders WHERE id = ? LIMIT 1',
            [req.params.id]
        );

        if (orders.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const order = orders[0];
        if (order.status !== 'returned') {
            return res.status(400).json({ message: 'Only returned orders can be processed' });
        }

        if (order.return_status !== RETURN_STATUS.APPROVED) {
            return res.status(400).json({ message: 'Refund can be completed only for approved returns' });
        }

        if (order.refund_status !== REFUND_STATUS.PROCESSING) {
            return res.status(400).json({ message: 'Refund must be in Processing status before completion' });
        }

        await db.promise().query(
            'UPDATE orders SET refund_status = ? WHERE id = ?',
            [REFUND_STATUS.COMPLETED, req.params.id]
        );

        res.json({ message: 'Refund marked as completed' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update order (status and payment_status)
router.put('/:id', async (req, res) => {
    const { status, payment_status } = req.body;

    try {
        let query = 'UPDATE orders SET ';
        let updates = [];
        let params = [];

        if (status !== undefined) {
            updates.push('status = ?');
            params.push(status);
        }

        if (payment_status !== undefined) {
            updates.push('payment_status = ?');
            params.push(payment_status);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        query += updates.join(', ') + ' WHERE id = ?';
        params.push(req.params.id);

        await db.promise().query(query, params);
        res.json({ message: 'Order updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete order
router.delete('/:id', async (req, res) => {
    try {
        // Get order items to restore stock
        const [items] = await db.promise().query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [req.params.id]);

        // Restore stock
        for (const item of items) {
            await db.promise().query(
                'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }

        // Delete order items
        await db.promise().query('DELETE FROM order_items WHERE order_id = ?', [req.params.id]);

        // Delete order
        await db.promise().query('DELETE FROM orders WHERE id = ?', [req.params.id]);

        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Cancel order
router.put('/:id/cancel', async (req, res) => {
    try {
        // Get order items to restore stock
        const [items] = await db.promise().query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [req.params.id]);

        // Restore stock
        for (const item of items) {
            await db.promise().query(
                'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }

        // Update order status
        await db.promise().query('UPDATE orders SET status = "cancelled" WHERE id = ?', [req.params.id]);

        res.json({ message: 'Order cancelled successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;