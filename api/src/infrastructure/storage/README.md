# Storage Adapter

ImageKit-backed media operations currently live in the media module because profile and post media are the only active callers.

Move provider setup, retries, provider health, and cleanup/reconciliation helpers here when storage is used by more runtimes or background jobs.
