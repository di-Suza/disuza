# Code Execution Adapter

Piston-compatible code execution is active for room problems.

The adapter receives source code, language, and stored problem test cases from the problems module, wraps JavaScript/Python submissions with the detected user function name or a `solution` fallback, normalizes provider output, and returns per-test pass/fail details for the room results panel.

Provider configuration:

- `PISTON_API_URL`
- `PISTON_API_KEY` (optional for self-hosted/public endpoints that do not require auth)
- `PISTON_RUN_TIMEOUT_MS`
- `PISTON_COMPILE_TIMEOUT_MS`
- `PROBLEM_RUN_LOCK_TTL_SECONDS`

Keep provider payload shaping, timeout handling, result normalization, and provider errors here instead of inside room/problem services.
