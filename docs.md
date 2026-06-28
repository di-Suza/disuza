# DevLoopFeed v2 Development Docs

This document tracks how DevLoopFeed v2 is being built step by step. The goal is to keep the project history, architecture decisions, and reasoning clear from the beginning so future features do not become random patches.

## Project Goal

DevLoopFeed v2 is a clean TypeScript rewrite of the original DevLoopFeed project. The plan is to rebuild the same core product with better structure, stronger boundaries, safer configuration, and a workflow that looks professional on GitHub and on a resume.

## Development Workflow

- `main` stays stable and commit-ready.
- `develop` is the integration branch.
- Feature branches are created from `develop`.
- Each feature branch should focus on one clear piece of work.
- Commits should stay small, readable, and meaningful.

Current branch style example:

```txt
main
  develop
    feature/backend-core-utilities
```

## Architecture Direction

The backend will use Express with TypeScript, but it will follow a disciplined modular architecture inspired by larger frameworks.

Planned backend flow:

```txt
route -> validator -> controller -> service -> repository -> model
```

Reason:

- Routes only define endpoints and middleware.
- Validators protect API input before business logic runs.
- Controllers handle HTTP request and response shape.
- Services contain business rules.
- Repositories isolate database queries.
- Models define database schema.

This keeps the code easier to test, easier to change, and easier to scale feature by feature.

## Step 1: Initial TypeScript Monorepo Setup

Created the first stable project skeleton.

Added:

- root `package.json` with workspace-style helper scripts
- `api/` backend folder
- `web/` frontend folder
- TypeScript setup for both backend and frontend
- Express app bootstrap
- HTTP server bootstrap
- MongoDB connection bootstrap
- Zod-based environment validation
- central logger setup
- global error and not-found middleware
- health API at `/api/health`
- blank React + Vite + TypeScript frontend
- empty frontend architecture folders

Why:

The first version should be commit-ready even before real features exist. A working health API and blank frontend prove that both apps can run, typecheck, and build from the root scripts.

Verification used:

```bash
npm run check
npm run build:api
npm run build:web
```

## Step 2: Backend Core Utilities

Created shared backend helpers before adding product features.

Added error classes:

- `AppError`
- `BadRequestError`
- `UnauthorizedError`
- `ForbiddenError`
- `NotFoundError`
- `ConflictError`
- `ValidationError`
- `TooManyRequestsError`

Added middleware/utilities:

- improved `errorHandler`
- `notFoundHandler` using `NotFoundError`
- `validateRequest` using `express-validator`
- `asyncHandler`
- `passwordService` using `bcryptjs`
- `tokenService` using `jsonwebtoken`
- `mongoIdParam` common validator
- shared HTTP status constants
- token type constants

Added environment config:

- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ACCESS_TOKEN_EXPIRES_IN`
- `REFRESH_TOKEN_EXPIRES_IN`

Why:

These utilities will be reused across auth, users, posts, comments, chat, notifications, and future modules. Creating them early prevents every module from inventing its own error style, validation style, token logic, or password hashing logic.

API request validation will use `express-validator` because it fits Express middleware naturally. Environment validation will continue to use Zod because startup config should fail fast before the server runs.

Verification used:

```bash
npm run check:api
npm run build:api
```

## Upcoming Steps

Likely next backend steps:

- auth module skeleton
- user model and repository
- register/login/refresh/logout flow
- cookie helper for refresh tokens
- auth middleware for protected routes
- role constants and authorization middleware

Each future feature should update this file with:

- what was added
- why it was added
- how it fits the architecture
- what command was used to verify it