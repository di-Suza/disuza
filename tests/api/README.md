# API Tests

API tests live under `api/tests` and run through:

```bash
npm --prefix api test
```

The suite covers validators, services, controllers, route registration, middleware, repository contracts, realtime handlers, and schema behavior. Keep provider SDKs behind fakes or adapters. Normal tests must not call ImageKit, Resend, Google OAuth, Redis, BullMQ, Socket.IO networks, Gemini, or the Piston-compatible code runner.
