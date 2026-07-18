# Jobs Adapter

BullMQ workers are active for destructive cleanup and background maintenance.

Worker process types should live here or register through this boundary. HTTP requests should enqueue idempotent work instead of performing expensive destructive cleanup inline.

Current usage:

- post cleanup removes media, likes, comments, notifications, saves, reports, feedback messages, contribution logs, and the post document.
- user cleanup removes account-owned data, sessions, OTP/account deletion state, personal rooms, profile media, relations, and queued post cleanup jobs.
- conversation cleanup permanently removes hidden-for-everyone conversations, messages, message reports, and feedback contribution logs.
- media cleanup removes replaced or rolled-back ImageKit files outside the HTTP request path, with service-level inline fallback when jobs are unavailable.
