# API Infrastructure Boundary

`infrastructure` owns provider adapters and runtime integrations that should not leak into domain services.

The current code still keeps a few provider touchpoints near the domain modules that own them. Move code here only when the adapter becomes reusable, needs health/timeout/retry behavior, or is shared by HTTP, socket, and worker runtimes.

Accepted adapter areas:

- `database`: MongoDB/Mongoose connection and future transaction helpers.
- `observability`: logger, request/job/socket correlation, and metrics hooks.
- `storage`: ImageKit adapter boundary for media operations.
- `email`: Resend adapter boundary for transactional email.
- `oauth`: Google OAuth provider boundary.
- `cache`: Redis client, auth cache, blacklist helpers, and distributed locks.
- `jobs`: BullMQ queues/workers for cleanup and post upload processing.
- `realtime`: Socket.IO gateway, auth, chat, collab room, and event contracts.
- `code-execution`: Piston/code runner adapter.
- `ai`: Gemini and future model-provider adapters for structured generation.
