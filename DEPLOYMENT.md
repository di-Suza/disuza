# Deployment Guide

## Render API

1. Create a new Render Web Service from the repository.
2. Set the root directory to `api`.
3. Use `npm install`, `npm run build`, and `npm run start`.
4. Add environment variables for `MONGODB_URI`, `REDIS_ENABLED`, `REDIS_URL` or Redis host values, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `SOCKET_CORS_ORIGIN`, ImageKit, Resend, and Google OAuth if enabled.
5. Restrict `CORS_ORIGIN` and `SOCKET_CORS_ORIGIN` to the Vercel domain.

## Vercel Web

1. Create a Vercel project from the repository.
2. Set the root directory to `web`.
3. Use `npm install` and `npm run build`.
4. Set `VITE_API_BASE_URL` to the Render API URL ending in `/api`.
5. Set `VITE_SOCKET_URL` to the Render API origin without `/api`.
6. Add `VITE_GOOGLE_CLIENT_ID` when OAuth is enabled.

## Local Docker

```bash
docker compose up --build
```

The compose stack starts MongoDB, Redis, the API, and the Vite web app with source mounts for local development.
