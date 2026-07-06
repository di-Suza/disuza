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

## Step 5: Backend User Profile and Social Module

Built the first backend user/profile module on `feature/api-user-profile-module`.

Added:

- `Follow` model and repository
- `Block` model and repository
- block service for block-status checks and interaction guards
- expanded user repository for profile, identity, portfolio, recommendations, and counter updates
- user service layer for profile updates, password updates, follow/unfollow, block/unblock, blocked users, followers/following, recommendations, and public profile fetch
- user controller, route, and `express-validator` validation rules
- `/api/user` route mount

Preserved v1 endpoint names:

```txt
POST   /api/user/updatePassword
PATCH  /api/user/updateUserNameAndPP
PATCH  /api/user/updateGeneralInfo
PATCH  /api/user/updateProfessionalInfo
GET    /api/user/getProfileUser/:id
GET    /api/user/getUserAccountHistory
GET    /api/user/blockedUsers
GET    /api/user/recommendations
POST   /api/user/followUser/:id
DELETE /api/user/unfollowUser/:id
POST   /api/user/blockUser/:id
DELETE /api/user/unblockUser/:id
GET    /api/user/getFollowers/:id
GET    /api/user/getFollowing/:id
```

Why:

User/profile APIs are the next layer after auth because most product features depend on the authenticated user, profile data, relationship state, and block rules. The module keeps the same v1 behavior shape but moves database work into repositories and business rules into services.

Important v2 improvements:

- follow/block data has dedicated repositories
- block visibility rules are centralized
- self-follow and self-block checks are explicit
- follow cleanup runs when a user is blocked
- recommendations exclude self, blocked users, and already-followed users
- validators use Express middleware instead of ad hoc checks

Deferred until supporting modules exist:

- profile picture binary upload/storage integration
- profile posts/project posts loading
- notification side effects for follows
- full account deletion cleanup queue
- real activity history from posts/comments/messages

Verification used:

```bash
npm run check:api
npm run build:api
```

## Step 6: Frontend User Profile and Dashboard Flow

Built the frontend layer for the backend user/profile module on `feature/web-user-profile-module`.

Added:

- typed user/profile models for portfolio, relationships, recommendations, and blocked users
- RTK Query `userApi` with the same v1-style `/api/user/*` endpoint names
- cache tags for profile users, followers, following, blocked users, recommendations, and account history
- dashboard hook for identity, general info, portfolio, password, recommendations, blocked users, and logout flows
- profile hook for public profile fetch, follow/unfollow, block/unblock, followers/following lists, and own-profile redirect handling
- dashboard UI for editable identity, headline/about, skills/interests/languages, password update, recommendations, blocked users, and session actions
- profile page UI for public profile details, relationship actions, block controls, stats, and followers/following modal
- protected route for `/profile/:id`

Frontend flow:

```txt
Dashboard edits -> userApi mutation -> backend /api/user/* -> auth user state refresh
Profile page -> getProfileUser -> follow/block mutations -> invalidate profile/list caches
```

Why:

The backend user/profile module is only useful once the frontend can call it. This step wires the module into RTK Query while keeping page logic in custom hooks and keeping components focused on rendering and interaction.

V1 behavior preserved:

- dashboard profile updates
- password update
- user recommendations
- blocked users management
- public profile fetch
- follow/unfollow
- block/unblock
- followers/following list access

Important v2 improvements:

- endpoint typing is centralized
- route-level profile code is lazy-loaded
- API cache invalidation is explicit through RTK Query tags
- page logic lives in custom hooks instead of large components
- access tokens continue to flow through the shared auth guard

Verification used:

```bash
npm run check:web
npm --prefix web run build
```

## Step 7: Backend Media Storage Module

Built the backend media/storage foundation on `feature/api-media-storage-module`.

Added:

- ImageKit storage integration through the modern `@imagekit/nodejs` SDK
- multer memory-upload middleware for image-only multipart requests
- centralized media service for upload, single delete, safe cleanup, bulk delete, post images, and profile pictures
- media constants for allowed image MIME types, ImageKit folders, and storage tags
- `/api/media/upload-auth` endpoint for future direct client-side ImageKit uploads
- environment validation for ImageKit keys, URL endpoint, upload size, and post image count
- Multer error normalization inside the global error handler
- profile picture upload support in the existing `/api/user/updateUserNameAndPP` endpoint

Preserved v1 behavior:

```txt
PATCH /api/user/updateUserNameAndPP
multipart field: profilePicture
storage folder: /DevloopFeed/ProfilePictures
old managed profile picture is cleaned up after successful DB update
```

Why:

Media upload/delete is a shared concern. Profile pictures, post images, saved collection covers, and future cleanup queues should not call the storage SDK directly from feature services. The media service becomes the single boundary around ImageKit, so future modules can reuse it safely.

Important v2 improvements:

- deprecated `imagekit` package was avoided in favor of `@imagekit/nodejs`
- storage config is validated in production but lazy-loaded for local development
- uploaded profile pictures are not swapped in the database until storage upload succeeds
- newly uploaded files are cleaned up if the database update fails
- old profile pictures are cleaned up safely after the new profile state is saved
- file validation and upload limits are centralized

Verification used:

```bash
npm run check:api
```

## Step 8: Backend Posts Module With Mixed Media

Built the backend posts module on `feature/api-posts-module`.

Added:

- `Post` model with ordered `media` array instead of image-only storage
- post repository, service, controller, validators, and routes
- `/api/post` route mount
- create post flow with multipart media uploads
- dashboard posts fetch through `/api/post/getAllPosts`
- single post fetch through `/api/post/getPost/:postId`
- update post flow through `/api/post/updatePost/:postId`
- delete post flow through `/api/post/deletePost/:postId`
- feed fetch through `/api/post/feed`
- profile response integration so public profiles can include normal and project posts

Media upgrade:

```txt
V1: images only
V2: ordered media carousel with images + videos
```

New post media shape:

```txt
media[] -> url, fileId, mediaType, order, thumbnailUrl, width, height, size, mime
```

Create flow:

- accepts multipart media through `media` field
- keeps upload order by default
- supports optional `mediaOrder` for explicit carousel order
- supports project posts with required `liveDemoUrl` and `repositoryUrl`

Update flow:

- accepts new media uploads during edit
- supports preserving existing media by `fileId`
- supports mixing existing media and new uploads in one `mediaOrder`
- saves final carousel sequence by normalized `order`
- cleans newly uploaded files if validation or DB update fails
- safely removes old storage files when they are removed from the carousel

Why:

Posts are the core product surface after auth, users, and media storage. Adding videos now avoids locking the schema into image-only assumptions. Storing an ordered mixed-media array makes the frontend carousel simple and future-friendly.

Important v2 improvements:

- storage is centralized through the media service
- videos use separate upload size limits
- post media supports both image and video MIME types
- carousel order is persisted explicitly
- post counters update through the user repository
- block rules are applied when viewing posts and feed data
- profile posts are now loaded from the posts repository

Verification used:

```bash
npm run check:api
npm run build:api
```
