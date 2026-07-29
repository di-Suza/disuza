# OAuth Adapter

Google OAuth verification currently lives in the auth service because auth is the only caller.

Move provider clients and verification helpers here if more OAuth providers, shared provider health checks, or provider-specific telemetry are added.
