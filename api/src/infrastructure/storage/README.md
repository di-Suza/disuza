# Storage Adapter

ImageKit-backed media operations currently live in the media module because profile, post, and chat attachment flows all share the same product-owned validation and cleanup rules.

Move provider setup, retries, provider health, signed/private delivery, and cleanup/reconciliation helpers here when storage needs stronger cross-runtime behavior than the media module boundary can own cleanly.
