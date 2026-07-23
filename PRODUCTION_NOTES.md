# Production Notes And Demo Limitations

Disuza is built as a production-minded full-stack platform, but the public hosted demo currently uses free-tier or best-effort infrastructure. Some flows may be limited by provider policy, quota, domain ownership, or cold-start behavior rather than by missing application code.

This document records those constraints honestly so reviewers can distinguish between implemented product flows and demo-environment limits.

## Summary

- The core app, API modules, realtime events, room flow, authentication, media pipeline, AI generation adapter, and code-execution adapter are implemented in the codebase.
- The hosted demo may not show every feature at full reliability because it depends on free Render, Vercel, MongoDB, Redis, Resend, Gemini, ImageKit, and public Piston-compatible services.
- A paid/custom-domain deployment can make the platform significantly more reliable without changing the main product architecture.

## Authentication And Refresh Cookies

Current demo constraint:

- The frontend is expected to run on Vercel and the API on Render.
- Because these are different provider domains, the refresh-token cookie becomes a cross-site cookie.
- Some browsers block cross-site cookies due to user privacy preferences or third-party cookie restrictions.
- When that happens, the access token can work for the current in-memory session, but refresh after reload may fail and the user may need to log in again.

Production fix:

- Use a custom domain with shared site ownership, for example:
  - frontend: `https://app.example.com`
  - API: `https://api.example.com`
- Configure:
  - `COOKIE_DOMAIN=.example.com`
  - `COOKIE_SECURE=true`
  - `COOKIE_SAME_SITE=none`
  - restricted `CORS_ORIGIN`
  - restricted `SOCKET_CORS_ORIGIN`
- This allows the refresh-cookie session flow to work reliably across frontend and API subdomains.

Implementation status:

- RS256 JWT signing and verification are implemented through private/public key configuration.
- HttpOnly refresh-cookie utilities are implemented.
- Refresh-session persistence and revocation flows are implemented.
- The current limitation is mainly deployment-domain behavior and browser cookie policy.

## Email, OTP, And Resend

Current demo constraint:

- OTP and transactional email depend on Resend.
- Free/demo Resend usage can be limited by sender verification, domain verification, recipient restrictions, provider quota, or missing production DNS records.
- If a verified sending domain is not configured, OTP emails may not be delivered even though the auth flow exists in the app.

Production fix:

- Purchase and verify a domain.
- Configure Resend DNS records such as SPF, DKIM, and return-path records.
- Set:
  - `RESEND_API_KEY`
  - `SENDER_EMAIL`
- Monitor delivery failures and add retry/delivery logging if email volume grows.

Implementation status:

- OTP flow and Resend-backed email utility are implemented.
- The limitation is provider/domain configuration, not the absence of an email flow.

## Code Execution

Current demo constraint:

- Collaborative room code execution uses a Piston-compatible execution adapter.
- The default public/free runner is best-effort and can be unavailable, slow, rate-limited, or restricted.
- In those cases, users may see `Code execution failed` even when room selection, editor sync, socket updates, and execution-state handling are working.

Production fix:

- Use a paid or self-hosted Piston-compatible runner.
- Configure:
  - `PISTON_API_URL`
  - `PISTON_RUN_TIMEOUT_MS`
  - `PISTON_COMPILE_TIMEOUT_MS`
  - `PROBLEM_RUN_LOCK_TTL_SECONDS`
- Add provider health checks, queue-backed execution, stronger sandbox isolation, and operational monitoring for production.

Implementation status:

- Room execution adapter, run state, locking, and socket updates are implemented.
- Reliable execution depends on a stable sandbox provider.

## AI Problem Generation

Current demo constraint:

- AI-generated DSA problems use Gemini when `GEMINI_API_KEY` is configured.
- Gemini free tier can be limited by quota, rate limits, model availability, latency, and occasional malformed model output.
- The backend validates JSON shape, required fields, difficulty, examples, constraints, and test-case structure.
- The demo does not fully prove every generated test case through a paid judge or manual review before publishing it to the shared problem catalog.

Production fix:

- Use a paid Gemini/API tier or a production LLM provider plan.
- Add judge-backed test-case verification before saving generated problems.
- Add moderation, prompt-abuse controls, retry policy, model fallback, and admin review tools.

Implementation status:

- Prompt flow, Gemini adapter, schema-shaped generation, backend validation, AI problem catalog saving, and room add flow are implemented.
- The limitation is reliability and verification depth under free-tier AI/code-runner services.

## Render API Hosting

Current demo constraint:

- Render free-tier services can sleep after inactivity.
- First request after inactivity can be slow due to cold start.
- CPU, memory, networking, and long-running socket behavior are limited compared with a paid always-on service.
- Realtime flows may reconnect after cold starts or service restarts.

Production fix:

- Use a paid Render instance, VPS, or cloud container service.
- Keep the API always on.
- Add uptime monitoring, log drains, health alerts, and horizontal scaling.
- Add a Socket.IO Redis adapter if running multiple API instances.

Implementation status:

- API startup, Socket.IO, CORS, health-oriented deployment configuration, and typed env validation are implemented.
- Free-tier hosting limits can still affect perceived reliability.

## Vercel Web Hosting

Current demo constraint:

- Vercel serves the React/Vite frontend.
- Client-side routes need SPA rewrites so direct visits to nested routes load `index.html`.
- If rewrite config is missing or the Vercel project root is wrong, nested routes can show a 404/white screen.

Production fix:

- Keep `web/vercel.json` with SPA fallback rewrites.
- Ensure Vercel project root is `web`.
- Set:
  - `VITE_API_BASE_URL`
  - `VITE_SOCKET_URL`
  - `VITE_GOOGLE_CLIENT_ID` when OAuth is enabled.

Implementation status:

- SPA rewrite config is present for the web app.
- Any future route issue should first check Vercel root directory and environment variables.

## MongoDB

Current demo constraint:

- The hosted demo can use MongoDB Atlas free tier.
- Free tier has storage, connection, memory, and performance limits.
- Heavy media metadata, analytics, conversation history, notifications, and generated problem catalogs can eventually hit quota or performance limits.

Production fix:

- Move to a paid MongoDB Atlas cluster or managed MongoDB deployment.
- Enable backups, monitoring, alerting, index review, and scaling policies.
- Review query plans for feed, search, analytics, messages, notifications, and profile pages.

Implementation status:

- MongoDB schemas and module repositories are implemented.
- Production reliability depends on managed capacity, indexes, backups, and monitoring.

## Redis

Current demo constraint:

- Redis can run locally through Docker or through a free cloud Redis provider.
- Free Redis services can have small memory limits, connection limits, regional DNS issues, eviction limits, or idle disconnects.
- Redis-dependent flows can degrade if the provider is unavailable.

Current usage:

- Auth/user cache and access-token blacklist helpers.
- Distributed problem-run locks.
- BullMQ cleanup queue infrastructure.
- Future socket scaling boundary.

Production fix:

- Use paid managed Redis with persistence and predictable networking.
- Configure:
  - `REDIS_ENABLED=true`
  - `REDIS_URL` or host/port/user/password values
  - `JOB_WORKERS_ENABLED=true` when workers should run
- Add Redis monitoring, alerting, and fallback behavior for non-critical caches.

Implementation status:

- Redis adapter and dependent service boundaries are implemented.
- Free-tier Redis should not be used for strict production reliability claims.

## ImageKit And Media

Current demo constraint:

- Post/profile/chat media rely on ImageKit configuration.
- Free-tier storage/CDN plans can limit bandwidth, transformations, file size, or monthly usage.
- Private chat media requires API-controlled access patterns; a production setup should avoid exposing unrestricted provider URLs for private assets.

Production fix:

- Use a paid ImageKit plan or an S3-compatible private bucket with signed URLs.
- Configure:
  - `IMAGEKIT_PUBLIC_KEY`
  - `IMAGEKIT_PRIVATE_KEY`
  - `IMAGEKIT_URL_ENDPOINT`
- Add lifecycle cleanup, malware scanning, image/video validation, and private signed delivery for sensitive chat files.

Implementation status:

- Media upload and ImageKit integration are implemented.
- Production privacy and scale require paid storage controls and stronger operational policies.

## Google OAuth

Current demo constraint:

- Google OAuth works only when OAuth client credentials and allowed redirect/origin settings match the deployed domains.
- If Vercel/Render URLs or custom domains are not added in Google Cloud Console, OAuth will fail.

Production fix:

- Configure Google Cloud OAuth consent screen.
- Add authorized JavaScript origins and redirect URLs.
- Set:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `VITE_GOOGLE_CLIENT_ID`

Implementation status:

- Google auth service and frontend client configuration are implemented.
- Deployment requires correct provider console configuration.

## Realtime, WebSockets, And Audio

Current demo constraint:

- Messaging, notifications, room collaboration, typing, presence, and audio signaling depend on Socket.IO and PeerJS/WebRTC.
- Free hosting may sleep or restart, which can cause reconnects.
- WebRTC audio may require correct HTTPS, browser permissions, NAT traversal, and, for production reliability, TURN servers.

Production fix:

- Use always-on hosting.
- Add a Socket.IO Redis adapter for multi-instance scaling.
- Add production TURN/STUN infrastructure for reliable audio across networks.
- Configure optional PeerJS host values when using a dedicated peer server.

Implementation status:

- Socket-driven messaging, notifications, typing/presence, room events, editor sync, and audio signaling are implemented.
- Free hosting and missing TURN infrastructure can limit demo reliability.

## What To Tell Reviewers

Recommended honest wording:

> The core architecture and application flows are implemented, but the public demo intentionally runs on free-tier infrastructure. Code execution, AI generation, email delivery, refresh-cookie persistence, and realtime reliability may be limited by provider quota, browser cookie policy, or cold starts. With a custom domain, verified email provider, paid Redis/MongoDB, always-on backend hosting, and a reliable sandbox runner, the same architecture can be moved to a more production-ready deployment.

## Upgrade Checklist

- Purchase a domain and run frontend/API under the same parent domain.
- Configure refresh cookies with secure cross-subdomain settings.
- Verify Resend sender domain and DNS records.
- Move Render API to always-on hosting.
- Move MongoDB and Redis to paid managed tiers.
- Use a paid or self-hosted code-execution sandbox.
- Keep Gemini on a paid tier or add model fallback.
- Add judge-backed verification for AI-generated test cases.
- Add monitoring, alerting, backups, log drains, and uptime checks.
- Add TURN/STUN infrastructure for production-grade audio calls.
