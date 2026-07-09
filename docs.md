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



## Step 9: Frontend Posts Feed and Composer Module

Built the frontend posts module on `feature/web-posts-module`.

Added:

- typed RTK Query `postApi` for create, update, delete, single post, dashboard posts, and feed posts
- shared post models for authors, counts, settings, project links, and ordered image/video media
- post helper utilities for media ordering, author fallback, and video detection
- reusable post media carousel for mixed image/video posts
- create/edit post composer modal with multipart uploads
- media reorder controls so the final carousel sequence is saved through `mediaOrder`
- owner-only edit/delete actions with full post fetch before editing partial dashboard/profile results
- dashboard posts panel with create post and recent own posts
- `/home` feed page with all/following segmented view
- profile posts section for normal posts and project posts
- responsive CSS for feed, cards, composer, carousel, modals, and empty states

Frontend flow:

```txt
Create/Edit modal -> FormData(media + settings + mediaOrder) -> postApi -> backend /api/post/*
Feed/Profile/Dashboard -> postApi queries -> RTK Query cache tags -> UI refresh
```

Media upgrade from v1:

```txt
V1 frontend: image-only post assumptions
V2 frontend: ordered carousel with images + videos
```

Why:

The backend posts module is now mixed-media and order-aware, so the frontend needed a proper composer instead of an image-only UI. Keeping the composer logic in a custom hook keeps upload validation, order building, project-link validation, and API submission away from display components.

Important v2 improvements:

- API calls use RTK Query instead of ad hoc request helpers
- post forms use `FormData` while keeping TypeScript models for response data
- edit flow fetches the full post before editing so summary cards do not accidentally drop hidden media items
- project posts keep required live demo and repository URLs
- access-token retry still goes through the shared `baseQueryWithAuthGuard`
- feed/dashboard/profile reuse the same post card/list primitives

```bash
npm --prefix web run typecheck
npm --prefix web run build
```

## Step 10: Backend Comments and Replies Module

Built the backend comments module on `feature/api-comments-module`.

Added:

- `Comment` model with post, post owner, author, parent comment, reply target, and reply count fields
- comments repository for create, top-level comments, replies, delete, and reply-count updates
- post repository helpers for comment-target lookup and post comment-count updates
- comments service with v1-compatible comment/reply business rules
- comments controller, route, and `express-validator` validation rules
- `/api/comment` route mount

Preserved v1 endpoint names:

```txt
POST   /api/comment/postComment
GET    /api/comment/getAllComments/:postId
GET    /api/comment/getReplies/:commentId
DELETE /api/comment/deleteComment
```

Preserved v1 response keys:

```txt
newComment
allComments
replies
currentPage
hasMore
commentId
deletedCount
parentCommentId
```

Comment flow:

- users can create top-level comments on visible posts
- users can reply to top-level comments only
- comments are blocked when the post author disables commenting
- post comment count increments for both comments and replies
- parent comment `replyCount` increments when a reply is added
- top-level comments are paginated newest-first, with the viewer's own comments prioritized
- replies are paginated oldest-first under their parent comment

Delete flow:

- comment author can delete their own comment or reply
- post owner can delete any comment or reply on their post
- deleting a reply removes only that reply and decrements parent `replyCount`
- deleting a top-level comment removes the comment plus its replies
- post comment count is decremented by the number of removed comment records

Rules and guards:

- all routes require auth
- post existence ignores posts currently being deleted
- block rules protect commenting, replying, viewing comments, and viewing replies
- validators enforce MongoDB IDs, page/limit bounds, and non-empty comment text

Why:

Comments are the next engagement layer after posts. Keeping the same v1 endpoint and response shape makes frontend migration easier, while the v2 implementation separates persistence, business rules, HTTP handling, and validation into clear module boundaries.

Deferred until supporting modules exist:

- comment notifications
- contribution heatmap side effects
- user activity history integration
- post cleanup queue integration for comments

Verification used:

```bash
npm run build:api
```

## Step 11: Frontend Comments and Replies Module

Built the frontend comments module on `feature/web-comments-module`.

Added:

- typed comments models for comment author, comment item, requests, and responses
- RTK Query `commentApi` with v1-compatible endpoint names
- paginated comments query with cache merge by post
- paginated replies query with cache merge by parent comment
- post comment mutation for top-level comments and replies
- delete comment mutation for comments and replies
- reusable comments modal with loading, error, empty, pagination, and composer states
- lazy-loaded replies UI under each parent comment
- reply target state with cancel behavior
- owner/comment-author delete controls
- PostCard comment button wiring
- responsive CSS for comments modal, comment items, replies, and composer

Preserved v1 endpoint flow:

```txt
POST   /api/comment/postComment
GET    /api/comment/getAllComments/:postId
GET    /api/comment/getReplies/:commentId
DELETE /api/comment/deleteComment
```

Frontend flow:

```txt
PostCard comment button -> CommentModal -> commentApi -> /api/comment/*
Top-level comment -> comments cache insert -> post/feed/profile tags refresh
Reply -> replies cache insert + parent replyCount update -> post/feed/profile tags refresh
Delete reply -> replies cache remove + parent replyCount update -> post/feed/profile tags refresh
Delete parent comment -> comments cache remove -> backend deletes replies too -> post/feed/profile tags refresh
```

Why:

The backend comments module keeps the v1 API contract, so the frontend can preserve the same user-facing behavior while moving the implementation into typed RTK Query endpoints and focused React hooks/components.

Important v2 improvements:

- comments API typing is centralized
- modal logic lives in `useCommentModal`
- replies are loaded only when the user opens them
- cache updates are scoped to comments/replies and post list invalidation is explicit
- delete buttons follow the backend rule: comment author or post owner
- PostCard remains focused and delegates discussion UI to the comments feature

Verification used:

```bash
npm --prefix web run typecheck
npm --prefix web run build
```

## Step 12: Backend Likes Module

Built the backend likes module on `feature/api-likes-module`.

Added:

- `Like` model with unique `{ post, user }` index
- likes repository for create-once, delete, existence checks, and liked-post lookup
- likes service for like/unlike business rules
- likes controller for v1-compatible responses
- post repository helpers for action target lookup and likes count updates
- `/api/post/likePost/:postId` route
- `/api/post/unlikePost/:postId` route
- real `isLiked` state in single post and feed responses

Preserved v1 endpoint flow:

```txt
POST /api/post/likePost/:postId
POST /api/post/unlikePost/:postId
```

Behavior:

- liking a visible post creates one like per user/post
- repeated like requests stay idempotent and return success
- unliking removes the user's like if it exists
- repeated unlike requests stay idempotent and return success
- post `counts.likes` increments/decrements when the stored like state changes
- like actions respect block rules through the post author interaction guard
- single post and feed responses now return real `isLiked` values

Why:

Likes are a simple post interaction and should be separated from saved collections. This keeps the likes branch focused while leaving the larger saved-posts/collections flow for its own module.

Deferred until supporting modules exist:

- like notifications
- contribution/activity history for likes
- frontend like button wiring (completed in Step 13)

Verification used:

```bash
npm run build:api
```

## Step 13: Frontend Likes Module

Built the frontend likes flow on `feature/web-likes-module`.

Added:

- typed `PostLikeResponse` for like/unlike API responses
- `likePost` RTK Query mutation for `POST /api/post/likePost/:postId`
- `unlikePost` RTK Query mutation for `POST /api/post/unlikePost/:postId`
- optimistic cache updates for `getPost`, `getFeed`, and `getAllPosts`
- profile/user activity invalidation after successful like state changes
- `usePostLike` hook for PostCard like state, mutation calls, rollback, and error toast handling
- interactive PostCard like button with pressed, loading, hidden-count, and active states
- footer button CSS for accessible hover, focus, disabled, and active styles

Preserved v1 endpoint flow:

```txt
POST /api/post/likePost/:postId
POST /api/post/unlikePost/:postId
```

Frontend flow:

```txt
PostCard like button -> usePostLike -> postApi like/unlike mutation -> optimistic RTK cache patch
Success -> keep patched post/feed/all-post caches + refresh profile/activity tags
Failure -> rollback optimistic patches + restore local PostCard state + show toast
```

Behavior:

- likes update instantly in the UI
- repeated clicks are blocked while a like/unlike request is in flight
- failed like/unlike requests rollback the button state and count
- hidden like counts still keep the like action visible as `Like`/`Liked`
- feed, all-posts, and single-post caches stay in sync after like/unlike
- profile post cards are refreshed through `ProfileUser` invalidation

Why:

The backend likes module already preserves the v1 API contract, so the frontend only needs typed RTK Query mutations, predictable cache updates, and a focused hook instead of spreading like logic directly inside PostCard.

Deferred until supporting modules exist:

- saved collections frontend wiring
- liked-posts activity screen wiring
- real-time like notifications

Verification used:

```bash
npm --prefix web run typecheck
npm --prefix web run build
```

## Step 14: Backend Saves And Collections Module

Built the backend saves/collections module on `feature/api-saves-module`.

Added:

- `Save` model for user/post saved relations
- `SavedPostsCollection` model for user-owned save collections
- saves constants for the default collection name and default cover image
- save repository for save relation CRUD, lookup, and saved-post pagination aggregations
- saved collection repository for collection CRUD, selected collection management, and cover updates
- save service for save/unsave, collection CRUD, move-to-collection, cover refresh, and blocked-user filtering
- save controller with v1-compatible response messages
- save validators using `express-validator`
- v1-compatible post routes for save and collection APIs
- post repository helpers for save action targets and cover media
- real `isSaved` state in single post and feed responses

Preserved v1 endpoint flow:

```txt
POST   /api/post/savePost
DELETE /api/post/unsavePost/:postId
GET    /api/post/getSavedPostsCollections
POST   /api/post/createCollection
PATCH  /api/post/updateCollection/:id
DELETE /api/post/deleteCollection/:id
GET    /api/post/savedCollections/:id/posts
PATCH  /api/post/changeSavedPostCollection
```

Behavior:

- saving a post uses the requested collection when it belongs to the user
- if no requested collection is available, the selected collection is used
- if no collection exists, `All Saved` is created as the default system collection
- only one collection stays selected for the user
- moving a saved post refreshes source and target collection cover metadata
- unsaving refreshes the affected collection cover
- system generated collections cannot be renamed or deleted
- saved collection post lists hide deleted posts and posts from blocked users
- saved collection post responses include `isSaved: true` and real `isLiked`
- feed and single-post responses now return real `isSaved` values

Why:

Saves have collection management, selected-state behavior, and cover metadata, so they are kept separate from likes. This makes the larger save flow easier to reason about and gives the frontend a stable typed API surface.

Deferred until frontend branch:

- save button wiring (completed in Step 15)
- manage collections modal (completed in Step 15)
- saved collections list UI (completed in Step 15)
- saved collection posts UI (completed in Step 15)

Verification used:

```bash
npm run build:api
```

## Step 15: Frontend Saves And Collections Module

Built the frontend saves/collections flow on `feature/web-saves-module`.

Added:

- saved collection RTK Query tag types
- typed save/collection request and response models
- `savePost` mutation for `POST /api/post/savePost`
- `unsavePost` mutation for `DELETE /api/post/unsavePost/:postId`
- saved collection list query
- saved collection posts query
- create, update, delete, and change-collection mutations
- optimistic `isSaved` cache patches for single post, feed, dashboard posts, and saved collection posts
- `usePostSave` hook for PostCard save state, mutation calls, rollback, and error handling
- PostCard save/unsave button
- PostCard manage collections button when a post is saved
- manage collections modal for selecting or creating a collection for a post
- dashboard saved collections panel for collection CRUD and saved-post browsing
- responsive CSS for save controls, save modal, collection cards, and saved dashboard panel

Preserved v1 endpoint flow:

```txt
POST   /api/post/savePost
DELETE /api/post/unsavePost/:postId
GET    /api/post/getSavedPostsCollections
POST   /api/post/createCollection
PATCH  /api/post/updateCollection/:id
DELETE /api/post/deleteCollection/:id
GET    /api/post/savedCollections/:id/posts
PATCH  /api/post/changeSavedPostCollection
```

Frontend flow:

```txt
PostCard save button -> usePostSave -> save/unsave mutation -> optimistic isSaved patch
Saved PostCard manage button -> ManageSaveCollectionsModal -> collection query/create/change mutation
Dashboard -> SavedCollectionsPanel -> collection query/create/update/delete + saved collection posts query
```

Behavior:

- save/unsave updates the PostCard immediately
- failed save/unsave requests rollback local and RTK Query cache state
- saved posts can be moved to another collection from the manage modal
- users can create collections while saving a post
- dashboard shows saved collections, collection covers, post counts, and saved posts
- non-system collections can be renamed or deleted from the dashboard panel
- saved collection post cards reuse the existing PostCard flow, including likes, comments, and save controls

Why:

The saves feature has more state than likes because it includes collection ownership, selected collections, and saved-post browsing. The frontend keeps direct post interactions in focused hooks while collection management lives in dedicated saves components.

Verification used:

```bash
npm --prefix web run typecheck
npm --prefix web run build
```
## Step 16: Backend Reports Module

Built the backend reports module on `feature/api-reports-module`.

Added:

- `Report` model with `Post`, `User`, and future `Message` target support
- report repository for duplicate checks, create, and current-user report history
- report service for target validation, self-report prevention, block-rule checks, duplicate prevention, and paginated report history
- report controller for generic reports, post-report compatibility, and my-reports
- report route mounted at `/api/report`
- v1-compatible post report route at `/api/post/reportPost`
- report validators using `express-validator`

Preserved v1 endpoint flow:

```txt
POST /api/report
GET  /api/report/my-reports
POST /api/post/reportPost
```

Behavior:

- post reports are fully supported now
- user/profile reports are supported by the same module for future UI wiring
- message reports are intentionally guarded until the messaging module exists
- users cannot report their own post/profile
- users cannot report the same target more than once
- report creation respects block interaction rules
- report history returns current user's reports with target preview data

Why:

Reports should be a generic moderation module because posts, profiles, and later messages all share the same report lifecycle. The current implementation focuses on post reports while keeping the target model structure ready for profile reports later.

Deferred until later modules:

- profile report UI wiring (completed in Step 18)
- message report support with conversation membership checks
- admin moderation/review workflow

Verification used:

```bash
npm run build:api
```

## Step 17: Frontend Post Reports Module

Built the frontend post-report flow on `feature/web-post-reports-module`.

Added:

- reports RTK Query API layer for creating reports and fetching current-user report history
- typed report models and shared report reason list
- reusable `ReportModal` component that supports `Post`, `User`, and future `Message` targets
- `useReportModal` hook for local form state, validation, submit handling, body scroll lock, and toast feedback
- PostCard report action for non-owner posts
- responsive report modal styling aligned with the existing modal system

Frontend flow:

```txt
PostCard report button -> ReportModal -> useReportModal -> createReport mutation -> POST /api/report
```

Behavior:

- post owners continue to see edit/delete actions instead of report
- non-owner posts show a report action in the card header
- report submit requires a reason and details before hitting the API
- successful report submit closes the modal and shows server feedback
- failed report submit shows normalized API errors, including duplicate-report responses
- the modal is target-model aware, so profile reports can reuse it later without rebuilding the UI flow

Why:

Reports are part of moderation, not post ownership, so the UI keeps report form state in a focused reports feature instead of mixing it into PostCard. PostCard only decides when to open the modal.

Deferred until later modules:

- profile report trigger wiring (completed in Step 18)
- message report flow with conversation membership rules
- admin moderation/review dashboard

Verification used:

```bash
npm --prefix web run typecheck
npm --prefix web run build
```

## Step 18: Frontend Profile Reports Trigger

Built the profile report trigger on `feature/web-profile-reports-module`.

Added:

- profile page report modal state in `useProfilePage`
- profile hero report button for reportable profiles
- `ReportModal` reuse with `onModel="User"`
- profile report visibility guard for blocked profile states

Frontend flow:

```txt
ProfilePage report button -> ReportModal -> useReportModal -> createReport mutation -> POST /api/report
```

Behavior:

- own profile still redirects to dashboard, so self-report is not exposed in the UI
- visible unblocked profiles can be reported through the shared report modal
- blocked profiles do not show report action because backend report creation respects block interaction rules
- profile reports reuse the same validation, duplicate-report handling, toast feedback, and API layer as post reports

Why:

The reports module was designed as a generic moderation flow, so profile reporting only needs a trigger and target model wiring. Keeping form logic in the shared report modal prevents duplicate report UI state across posts and profiles.

Deferred until later modules:

- message report flow with conversation membership rules
- admin moderation/review dashboard

Verification used:

```bash
npm --prefix web run typecheck
npm --prefix web run build
```

## Step 19: Backend Notifications Module

Built the backend notifications flow on `feature/api-notifications-module`.

Added:

- `Notification` model with v1 notification types: `LIKE`, `FOLLOW`, `COMMENT`, `COMMENT_REPLY`, `COLLAB_REQUEST`, and `COLLAB_ACCEPTED`
- `expiresAt` field and TTL index for future expiring collab request notifications
- notification repository for create, populated reads, unread counts, mark-read, delete-one, delete-all, and metadata-based cleanup
- notification service for pagination, blocked-user filtering, orphan cleanup, self-notification prevention, blocked-interaction prevention, send, remove, and lookup helpers
- notification controller and route mounted at `/api/notification`
- request validators for pagination and notification id params
- like notification creation/removal from like/unlike post flow
- follow notification creation/removal from follow/unfollow flow
- follow notification cleanup when blocking removes follow relationships

Preserved v1 endpoint flow:

```txt
GET    /api/notification/getNotifications
PATCH  /api/notification/markAllAsRead
DELETE /api/notification/deleteNotification/:notificationId
DELETE /api/notification/deleteAllNotifications
```

Behavior:

- liking a post creates a `LIKE` notification for the post owner
- unliking removes the matching `LIKE` notification
- following a user creates a `FOLLOW` notification for the followed user
- unfollowing removes the matching `FOLLOW` notification
- blocking a user removes follow relationships and related follow notifications
- users do not receive notifications from themselves
- notifications are not created across blocked relationships
- notification listing hides senders blocked by either side
- orphaned content-backed notifications are cleaned when fetched
- `User` target notifications hide `contentId` in the response, matching v1 behavior

Why:

Notifications connect social actions across the app, so the backend module centralizes notification persistence and cleanup instead of scattering notification queries through likes and users. Realtime socket emit is intentionally deferred until the socket layer is rebuilt in v2.

Deferred until later modules:

- comment and reply notification hooks after comments backend is present in the active branch chain
- collab request and accepted notification hooks after collab module exists
- realtime socket emit for `new_notification` and `delete_notification`
- notification preferences

Verification used:

```bash
npm run build:api
```

## Step 20: Frontend Notifications Module

Built the frontend notifications flow on `feature/web-notifications-module`.

Added:

- notifications RTK Query API layer for listing, mark-all-read, delete-one, and delete-all actions
- typed notification models for v1 notification types and populated sender/content data
- notification helper utilities for rendering icons, action text, thumbnails, and safe content previews
- notifications page at `/notifications`
- `useNotificationsPage` hook for pagination, navigation decisions, optimistic actions, delayed mark-read, and toast handling
- dashboard and feed navigation entry points for notifications
- responsive notification list styling aligned with the current dashboard/feed UI

Preserved v1 endpoint flow:

```txt
GET    /api/notification/getNotifications
PATCH  /api/notification/markAllAsRead
DELETE /api/notification/deleteNotification/:notificationId
DELETE /api/notification/deleteAllNotifications
```

Frontend flow:

```txt
NotificationsPage -> useNotificationsPage -> notification RTK Query API -> /api/notification/*
```

Behavior:

- notifications are fetched with paginated RTK Query cache merging
- unread notifications are marked read after a short delay with timeout cleanup
- users can delete a single notification or clear all notifications
- follow notifications navigate to the sender profile
- like/comment/reply notifications currently navigate to the feed until a post-detail route exists
- collab notification actions are deferred until collab modules exist
- load more preserves already loaded notifications while fetching the next page
- dashboard and feed pages expose notifications navigation

Why:

Notifications are a cross-feature activity surface, so the UI keeps API state in RTK Query and page interaction logic in a dedicated hook. This keeps rendering focused while preserving the v1 notification behavior and fixing the old delayed mark-read cleanup risk.

Deferred until later modules:

- direct post-detail navigation after a post detail route exists
- comment/reply notification UI deep links after comments UI is fully connected
- collab request and accepted actions after collab modules exist
- realtime socket updates after the v2 socket layer is rebuilt
- notification preferences

Verification used:

```bash
npm --prefix web run typecheck
npm --prefix web run build
```

## Step 21: Backend Search And Discover Module

Built the backend search and discover flow on `feature/api-search-module`.

Added:

- search repository for user search, post search, top contributors, trending posts, and result counts
- search service for safe pagination, limit normalization, blocked-user filtering, regex escaping, and viewer state enrichment
- search controller and route mounted at `/api/search`
- request validators using `express-validator`
- liked/saved viewer state on returned posts so search results can reuse post cards safely

Preserved v1 endpoint flow:

```txt
GET /api/search?q=&userPage=&postPage=&limit=
GET /api/search/discover?page=&limit=
```

Behavior:

- search matches active users by username or email
- search matches visible posts by caption
- blocked users are hidden from both user and post results
- deleted/deleting posts are excluded
- discover returns top contributors and trending posts
- trending posts are ordered by likes count and recent activity
- pagination returns `hasMoreUsers`, `hasMorePosts`, and `hasMoreTrendingPosts`
- post results include `isLiked` and `isSaved` for the current viewer

Why:

Search and discover depend on already migrated users, posts, likes, saves, and block rules, so this is a clean next module after notifications. Keeping DB queries in the repository and interaction rules in the service preserves v1 behavior while avoiding unsafe regex input and keeping frontend result rendering reusable.

Deferred until later modules:

- full-text indexes after production search needs are clearer
- richer ranking using contributions, follows, and engagement signals
- search analytics/history

Verification used:

```bash
npm run build:api
```

## Step 22: Frontend Search And Discover Module

Built the frontend search and discover flow on `feature/web-search-module`.

Added:

- search RTK Query API layer for `/search` and `/search/discover`
- typed search and discover response models
- shared `useDebounce` hook for delayed search queries with cleanup
- `/search` route with lazy-loaded page
- `useSearchPage` hook for discover pagination, debounced search, result merging, loading/error state, and current-user navigation rules
- reusable `SearchUserCard` for top contributors and matched users
- search page UI with top contributors, trending posts, users, posts, and load-more actions
- dashboard and feed navigation entry points for search
- responsive search styling aligned with the current dashboard/feed UI

Preserved v1 endpoint flow:

```txt
GET /api/search?q=&userPage=&postPage=&limit=
GET /api/search/discover?page=&limit=
```

Frontend flow:

```txt
SearchPage -> useSearchPage -> search RTK Query API -> /api/search/*
```

Behavior:

- discover view shows top contributors and trending posts when the search input is empty
- search input is debounced before calling the API
- changing the query resets user and post pagination safely
- search results merge paginated users/posts without duplicates
- users navigate to their profile, while the current user navigates to dashboard
- posts reuse the existing compact post card flow, including current like/save/comment/report behaviors
- load-more actions are split for users, search posts, and trending posts
- search errors and loading states are isolated from the inactive discover/search mode

Why:

Search is a read-heavy cross-feature surface, so the frontend keeps network state in RTK Query and interaction state in a dedicated page hook. Reusing existing post cards keeps social actions consistent while the module preserves v1 discover/search behavior.

Deferred until later modules:

- direct post-detail navigation after a post detail route exists
- advanced search filters and sorting
- dedicated search history or recent searches
- full-text/autocomplete UX after backend search ranking matures

Verification used:

```bash
npm --prefix web run typecheck
npm --prefix web run build
```

## Step 23: Backend Issues Module

Built the backend issue/report-a-problem flow on `feature/api-issues-module`.

Added:

- `Issue` model with v1 categories: `Bug`, `Spam`, `Abuse`, `Technical`, and `Other`
- issue statuses: `Pending`, `In-Progress`, `Resolved`, and `Dismissed`
- issue repository for latest-report lookup and issue creation
- issue service for category validation, description validation, cooldown enforcement, and creation
- issue controller and route mounted at `/api/issue`
- request validators using `express-validator`

Preserved v1 endpoint flow:

```txt
POST /api/issue
```

Behavior:

- authenticated users can submit a support/problem issue
- category defaults to `Bug` if not provided
- description is required and capped at 1000 characters
- each user can submit only one issue every 5 minutes
- cooldown violations return a 429 error
- successful submission returns the v1-style category success message

Why:

Issues are app-support reports, separate from moderation reports for posts/users/messages. Keeping this module separate avoids mixing user-facing support tickets with content moderation reports while preserving the existing v1 report-a-problem flow.

Deferred until later modules:

- admin issue review dashboard
- issue status update APIs
- user-facing issue history

Verification used:

```bash
npm run build:api
```

## Step 24: Frontend Issues Module

Built the frontend report-a-problem flow on `feature/web-issues-module`.

Added:

- issues RTK Query API layer for submitting support/problem reports
- typed issue category/status models
- `ReportAProblemModal` component using the existing modal system
- `useReportAProblemModal` hook for category state, description state, validation, submit handling, body scroll lock, and toast feedback
- dashboard trigger button for opening the report-a-problem modal

Preserved v1 endpoint flow:

```txt
POST /api/issue
```

Frontend flow:

```txt
Dashboard report button -> ReportAProblemModal -> useReportAProblemModal -> submitIssue mutation -> POST /api/issue
```

Behavior:

- category defaults to `Bug`
- description is required before submit
- description is capped at 1000 characters
- successful submit shows the server success message and closes the modal
- failed submit shows normalized API errors, including the 5-minute cooldown response
- failed submit keeps the modal open so the user does not lose their typed description

Why:

Issue reporting is a support flow rather than content moderation, so it lives in a dedicated issues feature instead of the reports feature. The dashboard exposes the action because it is account/app-level feedback, matching the v1 report-a-problem entry point while using v2 modal and hook patterns.

Deferred until later modules:

- issue history for users
- admin issue review dashboard
- issue status update UI

Verification used:

```bash
npm --prefix web run typecheck
npm --prefix web run build
```

## Step 25: Backend Dashboard Activity Support

Built backend dashboard activity support on `feature/api-dashboard-module`.

Added:

- liked-post activity query support in the likes repository
- following activity query support in the follow repository
- async account-history controller handling with page-aware service call
- dashboard account-history service logic for `likes` and `follows`
- blocked-user filtering for liked-post and follow activity results

Preserved v1 endpoint flow:

```txt
GET /api/user/getUserAccountHistory?type=likes&page=1
GET /api/user/getUserAccountHistory?type=follows&page=1
GET /api/user/getUserAccountHistory?type=comments&page=1
GET /api/user/getUserAccountHistory?type=feedbacks&page=1
```

Behavior:

- `likes` returns recent liked posts with a cover media item and caption
- `follows` returns recent followed users
- blocked users are hidden from activity results
- `comments` and `feedbacks` remain valid activity types but return empty lists until their dependent modules are active in this branch chain
- invalid activity types still return validation/business errors

Why:

The dashboard activity modal needs real backend data. Likes and follows are already migrated, so they can be wired now. Comments and feedback depend on modules that are intentionally not part of the current active dashboard chain, so they are kept safe and non-breaking until those modules are ready.

Deferred until later modules:

- comment activity after comments backend is active in the dashboard branch chain
- feedback activity after messaging/feedback modules are rebuilt
- contribution heatmap persistence and APIs
- account deletion cleanup queue flow

Verification used:

```bash
npm run build:api
```
