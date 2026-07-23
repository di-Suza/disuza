# Disuza

Disuza is a TypeScript-first real-time social and collaboration platform for developers. It combines a developer feed, portfolio profiles, messaging, notifications, collaborative coding rooms, room chat/audio, code execution, and AI-assisted DSA problem generation inside a modular Express API and React web app.

## Highlights

- Developer social feed with rich text, media, code snippets, project posts, links, comments, likes, reposts, saves, feedback, and profile discovery.
- Real-time messaging, notifications, unread state, group conversations, collaboration requests, and room chat powered by Socket.IO.
- Collaborative coding rooms with personal/shared/group access, Yjs-backed editor sync, room problem state, presence, audio signaling, and Piston-compatible code execution.
- AI-generated DSA problems through Gemini Interactions structured JSON output, validated by the API and saved into the shared problem catalog with an `isAIGenerated` flag.
- Production-minded backend boundaries with controllers, services, repositories, validators, typed config, Redis locks/cache, BullMQ cleanup workers, and provider adapters.

## Documentation

- [Architecture guide](./Disuza-Architecture-Guide.md)
- [Architecture decision register](./ARCHITECTURE-DECISIONS.md)
- [Debugging guide](./DEBUGGING-GUIDE.md)
- [API contracts](./contracts/README.md)
- [Testing strategy](./tests/README.md)
- [Deployment guide](./DEPLOYMENT.md)
- [Future plan](./FUTUREPLAN.md)
- [Development journey](./docs.md)

## Current Demo Limitations

Collaborative room code execution is architecturally integrated through the API adapter and room UI, but the hosted demo should be treated as best-effort until a reliable paid or self-hosted sandbox runner is configured. For production-grade execution, set `PISTON_API_URL` to a maintained Piston-compatible runner with stable runtime availability, timeout controls, and operational monitoring.

AI problem generation uses Gemini Interactions API when `GEMINI_API_KEY` is configured. The free-tier/demo flow validates JSON shape, required fields, and basic test-case structure, but it does not prove every generated test case with a paid judge or human review before publishing it to the shared AI problem catalog.

## Structure

```txt
disuza/
  api/        TypeScript Express backend
  web/        TypeScript React frontend
  contracts/  REST/OpenAPI contract baseline
  tests/      Test strategy and future test layout
```

## Scripts

```bash
npm run dev:api
npm run dev:web
npm test
npm run check
npm run verify
```

Local defaults: the API listens on `http://localhost:8081`, the API base URL is `http://localhost:8081/api`, and the web app runs on `http://localhost:5173`.
