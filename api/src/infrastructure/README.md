# API Infrastructure Boundary

`infrastructure` is the future home for provider adapters and runtime integrations that should not leak into domain services.

The current code still uses a few existing `config` and module-level services directly. Move code here only when the adapter becomes reusable, needs health/timeout/retry behavior, or will be shared by HTTP, socket, and worker runtimes.

Accepted adapter areas:

- `database`: MongoDB/Mongoose connection and future transaction helpers.
- `observability`: logger, request/job/socket correlation, and metrics hooks.
- `storage`: ImageKit adapter boundary for media operations.
- `email`: Resend adapter boundary for transactional email.
- `oauth`: Google OAuth provider boundary.
- `cache`: future Redis client and cache helpers.
- `jobs`: future BullMQ queues and workers.
- `realtime`: future Socket.IO gateway, auth, and event contracts.
- `code-execution`: Piston/code runner adapter.
- `ai`: Gemini and future model-provider adapters for structured generation.
