# Code Execution Adapter

Judge0-compatible code execution is active for room problems.

The adapter receives source code, language, and stored problem test cases from the problems module, wraps JavaScript/Python submissions with the expected `solution` function harness, normalizes provider output, and returns per-test pass/fail details for the room results panel.

Required provider configuration:

- `JUDGE0_API_URL`
- `RAPIDAPI_JUDGE0_HOST`
- `RAPIDAPI_JUDGE0_KEY`
- `PROBLEM_RUN_LOCK_TTL_SECONDS`

Keep provider payload shaping, timeout handling, result normalization, and provider errors here instead of inside room/problem services.
