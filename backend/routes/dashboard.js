const express = require('express');
const db = require('../config/database');

const router = express.Router();

// Get dashboard overview
router.get('/overview', async (req, res) => {
    try {
        // Total orders
        const [totalOrders] = await db.promise().query('SELECT COUNT(*) as count FROM orders');

        // Total revenue
        const [totalRevenue] = await db.promise().query('SELECT SUM(total_amount) as revenue FROM orders WHERE payment_status = "paid"');

        // Pending orders
        const [pendingOrders] = await db.promise().query('SELECT COUNT(*) as count FROM orders WHERE status = "pending"');

        // Total products
        const [totalProducts] = await db.promise().query('SELECT COUNT(*) as count FROM products');

        // Low stock products
        const [lowStock] = await db.promise().query('SELECT COUNT(*) as count FROM products WHERE stock_quantity < 10');

        // Recent orders
        const [recentOrders] = await db.promise().query(`
            SELECT o.id, o.total_amount, o.status, o.created_at, u.name as customer_name
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            JOIN users u ON c.user_id = u.id
            ORDER BY o.created_at DESC
            LIMIT 5
        `);

        // Top selling products
        const [topProducts] = await db.promise().query(`
            SELECT p.name, SUM(oi.quantity) as total_sold
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status != 'cancelled'
            GROUP BY p.id, p.name
            ORDER BY total_sold DESC
            LIMIT 5
        `);

        res.json({
            totalOrders: totalOrders[0].count,
            totalRevenue: totalRevenue[0].revenue || 0,
            pendingOrders: pendingOrders[0].count,
            totalProducts: totalProducts[0].count,
            lowStockProducts: lowStock[0].count,
            recentOrders,
            topProducts
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get sales reports
router.get('/sales-report', async (req, res) => {
    const { period = 'month' } = req.query; // day, week, month, year

    try {
        let dateFormat, groupBy;
        switch (period) {
            case 'day':
                dateFormat = '%Y-%m-%d';
                groupBy = 'DATE(created_at)';
                break;
            case 'week':
                dateFormat = '%Y-%u';
                groupBy = 'YEARWEEK(created_at)';
                break;
            case 'month':
                dateFormat = '%Y-%m';
                groupBy = 'DATE_FORMAT(created_at, "%Y-%m")';
                break;
            case 'year':
                dateFormat = '%Y';
                groupBy = 'YEAR(created_at)';
                break;
            default:
                dateFormat = '%Y-%m';
                groupBy = 'DATE_FORMAT(created_at, "%Y-%m")';
        }

        const [sales] = await db.promise().query(`
            SELECT
                ${groupBy} as period,
                COUNT(*) as order_count,
                SUM(total_amount) as revenue
            FROM orders
            WHERE payment_status = 'paid'
            GROUP BY ${groupBy}
            ORDER BY period DESC
            LIMIT 12
        `);

        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;