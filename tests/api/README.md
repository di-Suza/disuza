# API Tests

Future API tests should cover validators, services, repositories, and route-level integration.

Keep provider SDKs behind fakes or adapters. Do not call ImageKit, Resend, Google OAuth, Redis, BullMQ, Socket.IO, or Judge0 from normal tests.
