# AI Generation Adapter

AI-assisted room problem generation is wired through Gemini Interactions structured JSON output.

Current flow:

- the room user submits a prompt from the AI problem modal;
- the API verifies authenticated room access and applies a generation rate limit;
- Gemini receives a schema-constrained request for one DSA problem;
- the API validates title, description, difficulty, tags, constraints, test cases, and boilerplate shape;
- valid results are saved to the shared `problems` collection with `isAIGenerated: true`;
- AI-generated problems are searchable by every room user from the AI problem modal.

Configuration:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `GEMINI_API_BASE_URL`
- `GEMINI_TIMEOUT_MS`

Demo limitation: the free-tier flow validates structure and required fields, but it does not prove every generated test case with a paid judge or human review before publishing. Production should add stronger execution-backed validation, moderation, duplicate detection, abuse monitoring, and paid quota controls.
