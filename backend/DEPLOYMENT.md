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
- DB_HOST: your database host
- DB_USER: your database user
- DB_PASSWORD: your database password
- DB_NAME: your database name
- JWT_SECRET: long random secret
- CORS_ORIGINS: comma-separated frontend origins
  - Example: https://your-frontend.vercel.app,http://localhost:5173

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
