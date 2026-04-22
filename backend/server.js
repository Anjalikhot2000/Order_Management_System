const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const parseAllowedOrigins = () => {
    const rawOrigins = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '';
    return rawOrigins
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
};

const isLoopbackOrigin = (origin) => {
    try {
        const { hostname } = new URL(origin);
        return hostname === 'localhost' || hostname === '127.0.0.1';
    } catch (error) {
        return false;
    }
};

const allowedOrigins = parseAllowedOrigins();
const allowLoopbackPorts = allowedOrigins.some(isLoopbackOrigin);

const corsOptions = {
    origin: (origin, callback) => {
        // Allow non-browser clients and same-origin requests with no Origin header.
        if (!origin) {
            return callback(null, true);
        }

        if (
            allowedOrigins.length === 0
            || allowedOrigins.includes(origin)
            || (allowLoopbackPorts && isLoopbackOrigin(origin))
        ) {
            return callback(null, true);
        }

        return callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database connection
const db = require('./config/database');

app.get('/api/health', async (req, res) => {
    try {
        await db.promise().query('SELECT 1');
        res.json({ status: 'ok', service: 'backend', database: 'connected' });
    } catch (error) {
        console.error('Health check database failure:', error.message);
        res.status(500).json({ status: 'error', service: 'backend', database: 'disconnected' });
    }
});

// Initialize database schema
const initDatabase = async () => {
    try {
        const schemaPath = path.join(__dirname, '..', 'database.sql');
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            // Split by semicolon and execute each statement
            const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);

            for (const statement of statements) {
                if (statement.trim()) {
                    // Skip CREATE DATABASE and USE statements — managed databases
                    // (Aiven, PlanetScale, Railway, etc.) don't support them.
                    const normalized = statement.trim().toUpperCase();
                    if (normalized.startsWith('CREATE DATABASE') || normalized.startsWith('USE ')) {
                        continue;
                    }
                    try {
                        await db.promise().query(statement);
                    } catch (error) {
                        console.log('Schema statement skipped:', error.message);
                    }
                }
            }
            console.log('Database schema initialized or already exists');
        }
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};

// Initialize database on startup
const initializeDatabase = async () => {
    try {
        await db.promise().query('SELECT 1');
        console.log('Connected to MySQL database');
        await initDatabase();

    // Ensure status column exists on users table (legacy compatibility)
    try {
        await db.promise().query(
            "ALTER TABLE users ADD COLUMN status ENUM('active','blocked') NOT NULL DEFAULT 'active'"
        );
        console.log('Added status column to users table');
    } catch (e) {
        // Column already exists — safe to ignore
    }

    // Ensure is_blocked exists as source-of-truth for account blocking
    try {
        await db.promise().query(
            "ALTER TABLE users ADD COLUMN is_blocked BOOLEAN NOT NULL DEFAULT FALSE"
        );
        console.log('Added is_blocked column to users table');
    } catch (e) {
        // Column already exists — safe to ignore
    }

    // Backfill is_blocked from legacy status values
    try {
        await db.promise().query(
            "UPDATE users SET is_blocked = 1 WHERE status = 'blocked'"
        );
    } catch (e) {
        // Safe to ignore if status column does not exist
    }

    // Ensure customer profile columns exist for admin create/update flows
    try {
        await db.promise().query('ALTER TABLE customers ADD COLUMN phone VARCHAR(20) NULL');
        console.log('Added customers.phone column');
    } catch (e) {
        // Column already exists
    }

    try {
        await db.promise().query('ALTER TABLE customers ADD COLUMN address TEXT NULL');
        console.log('Added customers.address column');
    } catch (e) {
        // Column already exists
    }

    try {
        await db.promise().query('ALTER TABLE customers ADD COLUMN city VARCHAR(100) NULL');
        console.log('Added customers.city column');
    } catch (e) {
        // Column already exists
    }

    try {
        await db.promise().query('ALTER TABLE customers ADD COLUMN state VARCHAR(100) NULL');
        console.log('Added customers.state column');
    } catch (e) {
        // Column already exists
    }

    try {
        await db.promise().query('ALTER TABLE customers ADD COLUMN zip_code VARCHAR(20) NULL');
        console.log('Added customers.zip_code column');
    } catch (e) {
        // Column already exists
    }

    try {
        await db.promise().query('ALTER TABLE customers ADD COLUMN country VARCHAR(100) NULL');
        console.log('Added customers.country column');
    } catch (e) {
        // Column already exists
    }

    // Ensure image_url column is LONGTEXT for large Base64 images (idempotent migration)
    try {
        await db.promise().query(
            "ALTER TABLE products MODIFY COLUMN image_url LONGTEXT"
        );
        console.log('Updated image_url column to LONGTEXT');
    } catch (e) {
        // Column already modified — safe to ignore
        console.log('image_url column migration skipped:', e.message.substring(0, 50));
    }

    // Remove manager role from existing data and enum (idempotent migration)
    try {
        await db.promise().query("UPDATE users SET role = 'customer' WHERE role = 'manager'");
        await db.promise().query("ALTER TABLE users MODIFY COLUMN role ENUM('admin','customer') DEFAULT 'customer'");
        console.log('Normalized manager roles and updated users.role enum');
    } catch (e) {
        console.log('users.role enum migration skipped:', e.message.substring(0, 80));
    }

    // Ensure orders.status supports returned lifecycle state
    try {
        await db.promise().query(
            "ALTER TABLE orders MODIFY COLUMN status ENUM('pending','confirmed','processing','packed','shipped','delivered','returned','cancelled') DEFAULT 'pending'"
        );
        console.log('Updated orders.status enum with returned state');
    } catch (e) {
        console.log('orders.status migration skipped:', e.message.substring(0, 80));
    }

    // Ensure return metadata fields exist on orders table
    try {
        await db.promise().query('ALTER TABLE orders ADD COLUMN return_reason VARCHAR(255) NULL');
        console.log('Added orders.return_reason column');
    } catch (e) {
        // Column already exists
    }

    try {
        await db.promise().query('ALTER TABLE orders ADD COLUMN return_comment TEXT NULL');
        console.log('Added orders.return_comment column');
    } catch (e) {
        // Column already exists
    }

    try {
        await db.promise().query('ALTER TABLE orders ADD COLUMN return_image LONGTEXT NULL');
        console.log('Added orders.return_image column');
    } catch (e) {
        // Column already exists
    }

    try {
        await db.promise().query('ALTER TABLE orders ADD COLUMN return_requested_at TIMESTAMP NULL');
        console.log('Added orders.return_requested_at column');
    } catch (e) {
        // Column already exists
    }

    try {
        await db.promise().query("ALTER TABLE orders ADD COLUMN return_status VARCHAR(50) NULL");
        console.log('Added orders.return_status column');
    } catch (e) {
        // Column already exists
    }

    try {
        await db.promise().query('ALTER TABLE orders MODIFY COLUMN return_status VARCHAR(50) NULL');
    } catch (e) {
        // Safe to ignore if alter is not required
    }

    try {
        await db.promise().query("ALTER TABLE orders ADD COLUMN refund_status VARCHAR(50) NOT NULL DEFAULT 'Not Initiated'");
        console.log('Added orders.refund_status column');
    } catch (e) {
        // Column already exists
    }

    try {
        await db.promise().query('ALTER TABLE orders ADD COLUMN admin_message TEXT NULL');
        console.log('Added orders.admin_message column');
    } catch (e) {
        // Column already exists
    }

        // Backfill tracking statuses for existing returned orders
        try {
            await db.promise().query(
                "UPDATE orders SET return_status = 'Requested' WHERE status = 'returned' AND (return_status IS NULL OR return_status = '')"
            );
            await db.promise().query(
                "UPDATE orders SET refund_status = 'Not Initiated' WHERE (refund_status IS NULL OR refund_status = '')"
            );
        } catch (e) {
            // Safe to ignore if tables are not initialized yet
        }
    } catch (err) {
        console.error('Database connection failed:', err);
    }
};

initializeDatabase();

// JWT middleware
const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied' });

    jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', async (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });

        try {
            const [rows] = await db.promise().query(
                'SELECT id, email, role, is_blocked FROM users WHERE id = ? LIMIT 1',
                [user.id]
            );

            if (rows.length === 0) {
                return res.status(401).json({ message: 'User not found' });
            }

            const dbUser = rows[0];
            if (Boolean(dbUser.is_blocked)) {
                return res.status(403).json({ message: 'You are blocked due to suspicious activities' });
            }

            req.user = { id: dbUser.id, email: dbUser.email, role: dbUser.role };
            next();
        } catch (authError) {
            console.error('Authentication database error:', authError.message);
            res.status(500).json({ message: 'Server error during authentication' });
        }
    });
};

// Role-based authorization middleware
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }
        next();
    };
};

// Static file serving for uploaded product images
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', authenticateToken, require('./routes/users'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', authenticateToken, require('./routes/orders'));
app.use('/api/customers', authenticateToken, require('./routes/customers'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/dashboard', authenticateToken, authorizeRoles('admin'), require('./routes/dashboard'));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
