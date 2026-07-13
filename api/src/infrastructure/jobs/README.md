# Jobs Adapter

BullMQ workers are planned but not active in v2 yet.

Future worker process types should live here or register through this boundary. HTTP requests should enqueue idempotent work instead of performing expensive destructive cleanup inline.
