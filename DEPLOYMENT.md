# Deployment Guide

## Render API

1. Create a new Render Web Service from the repository.
2. Set the root directory to `api`.
3. Use `npm install`, `npm run build`, and `npm run start`.
4. Add environment variables for `MONGODB_URI`, `REDIS_ENABLED`, `REDIS_URL` or Redis host values, `PRIVATE_JWT_KEY_BS64`, `PUBLIC_JWT_KEY_BS64`, `CORS_ORIGIN`, `SOCKET_CORS_ORIGIN`, ImageKit, Resend, Google OAuth if enabled, and `PISTON_API_URL` when a production code runner is available.
5. Restrict `CORS_ORIGIN` and `SOCKET_CORS_ORIGIN` to the Vercel domain.
6. Keep `PROBLEM_RUN_LOCK_TTL_SECONDS` at `60` unless code execution needs a longer provider timeout window.

## Vercel Web

1. Create a Vercel project from the repository.
2. Set the root directory to `web`.
3. Use `npm install` and `npm run build`.
4. Set `VITE_API_BASE_URL` to the Render API URL ending in `/api`.
5. Set `VITE_SOCKET_URL` to the Render API origin without `/api`.
6. Add `VITE_GOOGLE_CLIENT_ID` when OAuth is enabled.

## Code Execution

Room code runs are wired through the API code-execution adapter. The editor submits the selected room problem, language, and source code to `/api/problem/run`; the API executes stored test cases and emits `code_execution` socket updates so every user in the room sees the same running/completed/failed state.

The current hosted/demo setup depends on the configured Piston-compatible runner. Public free runners can be unavailable, rate-limited, or restricted, so code execution may return `Code execution failed` even when the room, editor, and socket flow are working. For reliable production behavior, deploy or subscribe to a maintained sandbox runner and set:

- `PISTON_API_URL`
- `PISTON_RUN_TIMEOUT_MS`
- `PISTON_COMPILE_TIMEOUT_MS`
- `PROBLEM_RUN_LOCK_TTL_SECONDS`

## Local Docker

```bash
docker compose up --build
```

The compose stack starts MongoDB, Redis, the API, and the Vite web app with source mounts for local development.
