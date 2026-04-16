const mysql = require('mysql2');

const isTruthy = (value) => ['1', 'true', 'yes', 'on', 'required'].includes(String(value || '').toLowerCase());

const normalizeMultiline = (value) => (value ? String(value).replace(/\\n/g, '\n') : '');

const buildSslOptions = () => {
    const sslRequired = isTruthy(process.env.DB_SSL) || isTruthy(process.env.DB_SSL_MODE);
    if (!sslRequired) {
        return undefined;
    }

    const certFromText = normalizeMultiline(process.env.DB_CA_CERT);
    const certFromBase64 = process.env.DB_CA_CERT_BASE64
        ? Buffer.from(process.env.DB_CA_CERT_BASE64, 'base64').toString('utf8')
        : '';
    const ca = certFromText || certFromBase64;

    return {
        rejectUnauthorized: isTruthy(process.env.DB_SSL_REJECT_UNAUTHORIZED || 'true'),
        ...(ca ? { ca } : {}),
    };
};

const getConnectionConfig = () => {
    const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || '';
    if (databaseUrl) {
        const parsed = new URL(databaseUrl);
        const sslMode = parsed.searchParams.get('ssl-mode') || '';
        const sslEnabled = isTruthy(process.env.DB_SSL) || isTruthy(sslMode) || isTruthy(process.env.DB_SSL_MODE);
        const ssl = sslEnabled ? (buildSslOptions() || { rejectUnauthorized: true }) : undefined;

        return {
            host: parsed.hostname,
            port: Number(parsed.port || process.env.DB_PORT || 3306),
            user: decodeURIComponent(parsed.username || process.env.DB_USER || 'root'),
            password: decodeURIComponent(parsed.password || process.env.DB_PASSWORD || ''),
            database: (parsed.pathname || '').replace(/^\//, '') || process.env.DB_NAME || 'order_management',
            ...(ssl ? { ssl } : {}),
        };
    }

    const ssl = buildSslOptions();

    return {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'order_management',
        ...(ssl ? { ssl } : {}),
    };
};

const baseConfig = getConnectionConfig();

const shouldAutoCreateDb = process.env.DB_AUTO_CREATE
    ? isTruthy(process.env.DB_AUTO_CREATE)
    : (baseConfig.host === 'localhost' || baseConfig.host === '127.0.0.1');

if (shouldAutoCreateDb) {
    const adminConnection = mysql.createConnection({
        host: baseConfig.host,
        port: baseConfig.port,
        user: baseConfig.user,
        password: baseConfig.password,
        ...(baseConfig.ssl ? { ssl: baseConfig.ssl } : {}),
    });

    adminConnection.query(`CREATE DATABASE IF NOT EXISTS ${baseConfig.database}`, (err) => {
        if (err) {
            console.error('Database auto-create skipped:', err.message);
        } else {
            console.log('Database created or already exists');
        }
        adminConnection.end();
    });
}

const db = mysql.createPool({
    ...baseConfig,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
});

module.exports = db;