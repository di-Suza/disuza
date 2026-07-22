# Code Execution Adapter

Piston-compatible code execution is wired for room problems.

The adapter receives source code, language, and stored problem test cases from the problems module, wraps JavaScript/Python submissions with the detected user function name or a `solution` fallback, normalizes provider output, and returns per-test pass/fail details for the room results panel.

Current demo limitation: the default public Piston endpoint is a best-effort fallback and may be unavailable, restricted, or rate-limited. If the provider rejects the request, users will see a safe `Code execution failed` message even though the room/editor/socket flow is working. Reliable execution requires a paid or self-hosted Piston-compatible runner configured through `PISTON_API_URL`.

Provider configuration:

- `PISTON_API_URL`
- `PISTON_RUN_TIMEOUT_MS`
- `PISTON_COMPILE_TIMEOUT_MS`
- `PROBLEM_RUN_LOCK_TTL_SECONDS`

Keep provider payload shaping, timeout handling, result normalization, and provider errors here instead of inside room/problem services.
