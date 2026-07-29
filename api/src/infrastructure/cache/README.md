# Cache Adapter

Redis is active for auth cache, access-token blacklist checks, distributed locks, and job infrastructure.

Keep Redis clients, cache key builders, distributed locks, and pub/sub connections here when product flows need shared runtime state. Domain services should ask this boundary for product operations instead of using raw Redis clients directly.

Current usage:

- `redis.ts` owns the shared ioredis client and connection options.
- auth middleware can reuse cached active user snapshots to avoid repeated database reads.
- logout and sensitive account actions can blacklist access tokens until their JWT expiry.
- problem execution uses Redis locks so the same room problem cannot run twice across processes.
- BullMQ cleanup and post-upload queues/workers share the same Redis adapter.
