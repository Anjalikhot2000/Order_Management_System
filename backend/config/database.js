const mysql = require('mysql2');

// Create connection without specifying database first
const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
});

// Create database if it doesn't exist
connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'order_management'}`, (err) => {
    if (err) {
        console.error('Error creating database:', err);
    } else {
        console.log('Database created or already exists');
    }
});

// Now connect to the specific database
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'order_management'
});

module.exports = db;