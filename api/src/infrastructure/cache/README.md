# Cache Adapter

Redis is active in v2 for distributed locks and job infrastructure.

Keep Redis clients, cache key builders, distributed locks, and future pub/sub connections here. Domain services should ask this boundary for product operations instead of using raw Redis clients directly.

Current usage:

- `redis.ts` owns the shared ioredis client.
- problem execution uses Redis locks so the same room problem cannot run twice across processes.
- BullMQ cleanup queues/workers share the same Redis adapter.
