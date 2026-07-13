# OAuth Adapter

Google OAuth verification currently lives in the auth service because auth is the only caller.

Move provider clients and verification helpers here if more OAuth providers or shared provider health checks are added.
