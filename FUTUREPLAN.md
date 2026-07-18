# Future Plan

- Move production hosting to AWS with managed MongoDB-compatible storage, managed Redis, object storage, and a CDN-backed web deployment.
- Split API, worker, and realtime processes so chat, notifications, cleanup jobs, and code execution can scale independently.
- Add full CI coverage with API integration tests, frontend component tests, E2E smoke tests, Docker image builds, and deployment checks.
- Add observability with structured logs, metrics, alerts, and request tracing before running paid production traffic.
- Harden media delivery with private object storage, signed URLs, lifecycle cleanup, and malware/type scanning for uploaded files.
