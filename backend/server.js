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

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database connection
const db = require('./config/database');

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
                    try {
                        await db.promise().query(statement);
                    } catch (error) {
                        console.log('Schema statement skipped:', error.message);
                    }
                }
            }
            console.log('Database schema initialized or already exists');

            // Insert sample data
            const sampleDataPath = path.join(__dirname, '..', 'sample-data.sql');
            if (fs.existsSync(sampleDataPath)) {
                const sampleData = fs.readFileSync(sampleDataPath, 'utf8');
                const sampleStatements = sampleData.split(';').filter(stmt => stmt.trim().length > 0);

                for (const statement of sampleStatements) {
                    if (statement.trim()) {
                        try {
                            await db.promise().query(statement);
                        } catch (error) {
                            // Ignore errors for sample data (might already exist)
                            console.log('Sample data statement skipped');
                        }
                    }
                }
                console.log('Sample data inserted');
            }
        }
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};

// Initialize database on startup
db.connect(async (err) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to MySQL database');
    await initDatabase();

    // Ensure status column exists on users table (idempotent migration)
    try {
        await db.promise().query(
            "ALTER TABLE users ADD COLUMN status ENUM('active','blocked') NOT NULL DEFAULT 'active'"
        );
        console.log('Added status column to users table');
    } catch (e) {
        // Column already exists — safe to ignore
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
});

// JWT middleware
const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied' });

    jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
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