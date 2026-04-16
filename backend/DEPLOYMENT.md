# Backend Deployment Guide (Render)

This backend can be deployed as a Web Service on Render.

## 1. Create a MySQL Database

Use a managed MySQL provider (Neon MySQL, PlanetScale, Railway MySQL, Aiven, etc.) and collect:

- DB_HOST
- DB_USER
- DB_PASSWORD
- DB_NAME

## 2. Create Render Web Service

- Connect this GitHub repository.
- Service root directory: backend
- Build command: npm install
- Start command: npm start

## 3. Set Environment Variables

Set these in Render service settings:

- PORT: 5000
- DATABASE_URL: optional full MySQL URI (recommended for Aiven)
- DB_HOST: your database host
- DB_PORT: your database port (Aiven usually non-3306)
- DB_USER: your database user
- DB_PASSWORD: your database password
- DB_NAME: your database name
- DB_SSL: true for Aiven
- DB_SSL_MODE: REQUIRED (optional)
- DB_SSL_REJECT_UNAUTHORIZED: true
- DB_CA_CERT or DB_CA_CERT_BASE64: optional CA certificate content
- DB_AUTO_CREATE: false for managed databases
- JWT_SECRET: long random secret
- CORS_ORIGINS: comma-separated frontend origins
  - Example: https://your-frontend.vercel.app,http://localhost:5173

### Aiven quick setup

Use values from Aiven connection details:

- DATABASE_URL: service URI from Aiven, e.g. mysql://user:pass@host:port/defaultdb?ssl-mode=REQUIRED
- DB_SSL: true
- DB_SSL_MODE: REQUIRED
- DB_AUTO_CREATE: false

If connection fails with certificate validation, add Aiven CA cert:

- DB_CA_CERT: paste cert text
  or
- DB_CA_CERT_BASE64: base64-encoded cert

## 4. Verify Health

After deploy, open:

- /api/health

Expected response:

{"status":"ok","service":"backend"}

## 5. Wire Frontend

In Vercel frontend environment variables:

- VITE_API_BASE_URL=https://your-render-backend.onrender.com

## Notes

- Database schema and migrations are initialized at backend startup.
- Ensure your managed MySQL allows inbound connections from Render.
- If your DB user cannot create databases, pre-create DB_NAME first.
