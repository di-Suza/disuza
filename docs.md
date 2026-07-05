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
## Step 3: Backend Auth Module

Built the backend auth module on a dedicated feature branch.

Added:

- `users` module with `User` model and repository
- `auth` module with route, controller, service, validators, and repository wiring
- `AuthSession` model for device/session-level refresh token tracking
- OTP model, repository, and service
- email OTP sending through Resend
- Google OAuth login/register support
- auth middleware for Bearer access tokens
- auth rate limiter for sensitive auth endpoints
- refresh-token cookie helper

Auth strategy:

```txt
Access token: returned in API response body
Refresh token: stored in HttpOnly cookie
Refresh token hash: stored in auth_sessions collection
```

Why:

This keeps the short-lived access token out of persistent browser storage while still allowing secure refresh through an HttpOnly cookie. The DB-backed session model lets the app revoke one device session, revoke all sessions, and rotate refresh tokens during refresh.

V1 behavior preserved:

- signup OTP flow
- verify OTP and register
- login with failed-attempt lockout
- Google login/register
- forgot-password OTP flow
- logout current device
- logout all devices
- `/me` authenticated user endpoint

Important v2 improvement:

Access token is no longer saved in cookies. Only the refresh token uses cookies. Session management now uses a richer `auth_sessions` model with token hash, device metadata, expiry, revocation time, and revocation reason.

Verification used:

```bash
npm run check:api
npm run build:api
```

## Step 4: Frontend Auth Flow

Built the frontend auth foundation on `feature/web-auth-module`.

Added:

- Vite alias and frontend env typing
- RTK Query API foundation with `baseQueryWithAuthGuard`
- refresh-token retry flow guarded by `async-mutex`
- Bearer access-token attachment from in-memory Redux state
- auth slice for user, access token, auth status, and logout state
- typed Redux store hooks
- reusable UI primitives, toast provider, loader, error boundary, and lock-scroll hook
- Sign In page with email/password and Google OAuth flow
- Sign Up page with OTP registration flow
- OTP verification modal with paste support, arrow navigation, resend timer, and remaining attempts
- forgot-password modal with email, OTP, and reset-password steps
- auth initializer that restores sessions through `/auth/me` + refresh cookie
- public/protected route guards
- lazy-loaded route pages for auth, landing, and protected dashboard shell

Frontend auth strategy:

```txt
Access token: kept in Redux memory only
Refresh token: sent by browser through HttpOnly cookie
401 response: try /auth/refresh once, save new access token, retry original request
Refresh failure: clear auth state and stay unauthenticated
```

Why:

This follows the v2 backend auth strategy. The frontend does not store access tokens in `localStorage` or JS-readable cookies. RTK Query owns API calls and retries, while components stay focused on UI and hooks own page logic.

V1 behavior preserved:

- base auth guard refresh flow
- signup OTP send/verify flow
- login flow
- Google auth flow
- forgot-password OTP/reset flow
- public route redirect when already authenticated
- protected route redirect when unauthenticated
- logout current device
- logout all devices

Important v2 improvement:

The old cookie-based access-token assumption was replaced with explicit Bearer token handling because v2 backend returns access tokens in response bodies and stores only refresh tokens in cookies.

Verification used:

```bash
npm run check:web
npm run build:web
```
