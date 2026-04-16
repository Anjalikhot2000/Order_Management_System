# Frontend Deployment (Vercel)

This frontend is configured for Vercel deployment.

## Required Environment Variable

Set this in Vercel Project Settings -> Environment Variables:

- `VITE_API_BASE_URL`: Your deployed backend base URL (example: `https://your-backend-domain.com`)

Notes:

- API calls are made to relative paths like `/api/...` and use `VITE_API_BASE_URL` as axios `baseURL`.
- If `VITE_API_BASE_URL` is not set in production, API calls will go to the Vercel frontend domain and fail.

## Deploy Steps

1. Push this repository to GitHub.
2. In Vercel, click **Add New Project** and import this repository.
3. Set the project root directory to `frontend`.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Add `VITE_API_BASE_URL` in environment variables.
7. Deploy.

## Local Development

Create `frontend/.env` with:

`VITE_API_BASE_URL=http://localhost:5000`

Then run:

- `npm install`
- `npm run dev`

## SPA Routing

`vercel.json` includes a rewrite to `index.html` so direct navigation and browser refresh work on nested routes.
