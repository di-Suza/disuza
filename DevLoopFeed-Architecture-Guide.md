# DevLoopFeed Architecture Guide

This document is the architecture source of truth for DevLoopFeed v2. It records the product behavior inherited from DevLoopFeed v1, the structure already implemented in v2, and the boundaries that future work must preserve.

Snapshot date: 2026-07-12

## 1. How To Read This Guide

DevLoopFeed is being migrated feature by feature, so architecture and delivery status are separate concerns.

- `Implemented`: present and wired in DevLoopFeed v2.
- `Partial`: a useful subset exists in v2, but the complete v1 flow is not migrated yet.
- `Planned`: accepted as part of the product architecture, but not implemented in v2 yet.
- `Deferred`: intentionally postponed until its dependencies or product rules are ready.

The sources used for this baseline are:

1. The live v2 code, which is the implementation source of truth.
2. The v2 development log in `docs.md`, which explains when and why work was added.
3. The v1 root, backend, and frontend documentation, which define existing product behavior that must be preserved during migration.
4. `Collabify-Architecture-Guide.md`, used only as inspiration for documentation discipline, module boundaries, and public APIs.

Collabify's exact stack is not a DevLoopFeed requirement. DevLoopFeed remains an Express REST API with MongoDB and a React client unless a future architecture decision explicitly changes that choice.

## 2. Product Definition

DevLoopFeed is a developer-focused social and collaboration product. It combines:

- a social feed for developer updates and projects;
- profiles and portfolio information;
- comments, replies, likes, saves, feedback, and reports;
- search, recommendations, notifications, and account activity;
- direct messaging;
- collaborative coding rooms with shared problems, code, execution, presence, chat, and calls.

The product journey inherited from v1 is:

```txt
Discover developer or post
  -> interact through feed/profile
  -> exchange contextual feedback
  -> continue in direct conversation
  -> request collaboration
  -> enter a shared coding room
  -> solve and track problems together
```

This journey is more important than copying v1 source code. V2 may improve implementation quality, but it must not silently change user-visible flow or business rules.

## 3. High-Level System Map

```txt
React 19 + TypeScript web application
  |
  | HTTPS REST requests
  | Access token in Authorization header
  | Refresh token in HttpOnly cookie
  v
Express 5 + TypeScript modular monolith
  |
  +-- MongoDB through Mongoose
  +-- ImageKit for media
  +-- Resend for transactional email
  +-- Google OAuth verification
  |
  +-- Planned: Redis for shared ephemeral state and caching
  +-- Planned: BullMQ workers for destructive cleanup
  +-- Planned: Socket.IO for chat, notifications, and rooms
  +-- Planned: Judge0 adapter for code execution
  +-- Planned: WebRTC/PeerJS and TURN for room audio

Browser realtime collaboration, planned migration
  |
  +-- Socket.IO event transport
  +-- Yjs document updates for shared code
  +-- Monaco editor binding and awareness/presence
```

The deployment unit is currently a modular monolith, not a microservice system. Modules are separated in code so a high-load capability can be extracted later only when production evidence justifies it.

## 4. Architecture Principles

### 4.1 Preserve product behavior, improve implementation

V1 is the baseline for product flow and exact UI where parity has been requested. V2 replaces weak coupling, duplicated logic, and unsafe configuration with typed modules and explicit boundaries.

### 4.2 Organize around business capabilities

Auth, users, posts, comments, saves, reports, chat, and other domains own their rules and persistence. A technical folder must not become a dumping ground for unrelated business logic.

### 4.3 Keep HTTP, business rules, and persistence separate

The backend request path is:

```txt
route -> middleware/validator -> controller -> service -> repository -> model
```

- Routes compose endpoint middleware.
- Validators reject invalid request input.
- Controllers translate HTTP input and output.
- Services enforce use cases and business invariants.
- Repositories own database queries.
- Models define persistence schemas and indexes.

### 4.4 Enforce rules on the server

The frontend may hide unavailable actions for good UX, but authorization, ownership, block rules, session validity, and resource visibility are enforced by the API.

### 4.5 Give each kind of state one owner

- RTK Query owns remote server state and request lifecycle.
- Redux slices own true application state such as the authenticated session.
- Component state owns temporary visual state.
- The database owns durable product state.
- Redis will own shared ephemeral state only where process memory is insufficient.

### 4.6 Prefer explicit status over misleading completeness

Planned Socket.IO, BullMQ, Redis, Yjs, Judge0, tests, Docker, and OpenAPI work must be documented as planned until it is present and verified in v2.

## 5. Repository Map

Current top-level structure:

```txt
devloopfeed/
  api/                              Express and TypeScript backend
  web/                              React, Vite, and TypeScript frontend
  contracts/                        REST/OpenAPI contract baseline
  tests/                            Test strategy and future test layout
  .github/workflows/ci.yml          Pull request typecheck and build gate
  README.md                         Quick project entry point
  docs.md                           Chronological development journal
  DevLoopFeed-Architecture-Guide.md System architecture and product rules
  ARCHITECTURE-DECISIONS.md         Architecture decision register
  DEBUGGING-GUIDE.md                Operational troubleshooting playbook
  package.json                      Root development commands
```

The root scripts are the normal entry point for local checks and builds. API and web remain separately deployable packages even though the repository coordinates them from the root.

## 6. Backend Architecture

### 6.1 Verified v2 stack

- Node.js and Express 5
- TypeScript
- MongoDB and Mongoose
- Zod for startup environment validation
- `express-validator` for HTTP request validation
- Pino and `pino-http` for structured logging
- JWT and `bcryptjs` for authentication primitives
- Helmet, CORS, cookie parsing, and rate limiting
- ImageKit, Resend, and Google OAuth adapters

### 6.2 Composition root

`api/src/server.ts` owns process startup and database connection. `api/src/app.ts` owns Express composition:

```txt
startup
  -> validate environment
  -> connect database
  -> create HTTP server
  -> listen on configured port

request
  -> request logger
  -> security and CORS middleware
  -> body/cookie parsing
  -> feature route
  -> not-found handler
  -> global error handler
```

Future socket and worker startup must be composed explicitly. Worker processes must not be hidden as side effects of importing the HTTP app.

### 6.3 Current source map

```txt
api/src/
  app.ts
  server.ts
  config/
    db.ts
    env.ts
    logger.ts
  core/
    events/
    http/
    policies/
  infrastructure/
    cache/
    code-execution/
    database/
    email/
    jobs/
    oauth/
    observability/
    realtime/
    storage/
  modules/
    auth/
    chat/
    comments/
    contributions/
    health/
    issues/
    likes/
    media/
    notifications/
    posts/
    reports/
    saves/
    search/
    users/
  shared/
    constants/
    errors/
    middleware/
    utils/
    validators/
  testing/
  types/
```

### 6.4 Standard module anatomy

A full business module should use only the layers it needs:

```txt
modules/<domain>/
  <domain>.route.ts
  <domain>.controller.ts
  <domain>.service.ts
  <domain>.repository.ts
  <domain>.model.ts
  <domain>.types.ts             when domain types are substantial
  <domain>.constants.ts         when constants are domain-owned
  validators/
    <domain>.validator.ts
  index.ts                      public module API
```

Rules:

- A route must not query Mongoose directly.
- A controller must not contain reusable business logic.
- A service must not depend on Express request or response objects.
- A repository must not decide product policy.
- Shared code must be domain-neutral and reused by more than one module.
- Cross-module imports should move through each module's public `index.ts` as modules are revisited.

Small modules may omit unnecessary files. The layer pattern is a responsibility model, not a requirement to generate empty boilerplate.

### 6.5 Backend module status

| Domain | V2 status | Ownership |
| --- | --- | --- |
| Health | Implemented | Runtime health endpoint |
| Auth and sessions | Implemented | OTP, password/Google login, refresh rotation, current/all-session revocation |
| Users and profile | Implemented | Profile, portfolio, social graph, block rules, account lifecycle |
| Media | Implemented | Image/video validation and ImageKit operations |
| Posts | Implemented | Feed, ordered mixed media, project metadata, CRUD |
| Comments and replies | Implemented | Paginated comments, one-level replies, contribution linkage |
| Likes | Implemented | User-post relation and count updates |
| Saves and collections | Implemented | Collection lifecycle and saved-post movement |
| Reports | Partial | Post and profile reporting; message/admin workflows remain |
| Notifications | Partial | Persistent HTTP flow; realtime delivery remains |
| Search and discovery | Implemented | Users, posts, contributors, trending results |
| Issues | Partial | User submission/history; admin workflow remains |
| Contributions | Implemented | Heatmap and source-linked contribution records |
| Chat and feedback | Partial | Feedback persistence/API exists; full realtime messaging remains |
| Rooms and problems | Planned | Personal/collab rooms, problem state, access policy, execution |
| Background jobs | Planned | Post, account, and conversation cleanup workers |

### 6.6 Infrastructure boundaries

External providers must be behind adapters owned by `config`, `infrastructure`, or a focused service. Business services should ask for an operation such as `uploadMedia`, `sendOtp`, or `executeCode`; provider-specific request shapes must not spread across modules.

As infrastructure grows, v2 may add:

```txt
api/src/infrastructure/
  cache/
  database/
  jobs/
  observability/
  realtime/
  storage/
  email/
  oauth/
  code-execution/
```

This move is evolutionary. Existing working code should migrate only when an adapter has real reuse or operational complexity. The infrastructure folders now exist as documented adapter targets; planned providers such as Redis, BullMQ, Socket.IO, and Judge0 must still be implemented before they are marked active.

## 7. Frontend Architecture

### 7.1 Verified v2 stack

- React 19 and TypeScript
- Vite
- React Router with route-level lazy loading
- Redux Toolkit and RTK Query
- React Redux
- Lucide React icons
- Google OAuth integration

### 7.2 Current source map

```txt
web/src/
  app/
    auth/
    layouts/
    providers/
    store/
    router.tsx
  pages/
    dashboard/
    feed/
    landing/
    messages/
    notifications/
    post-detail/
    profile/
    search/
    sign-in/
    sign-up/
  widgets/
  entities/
    comment/
    conversation/
    issue/
    notification/
    post/
    report/
    user/
  features/
    auth/
    comments/
    dashboard/
    issues/
    landing/
    messages/
    notifications/
    posts/
    profile/
    reports/
    saves/
    search/
    users/
  shared/
    api/
    assets/
    components/
    config/
    contracts/
    hooks/
    ui/
    utils/
  testing/
  styles/
```

### 7.3 Import direction

The current feature-first structure now has route-level `pages` wrappers and reserved `widgets` and `entities` layers:

```txt
app -> pages -> widgets -> features -> entities -> shared
```

Rules:

- `shared` cannot import a feature.
- A feature should not reach into another feature's internal files casually.
- Routes should lazy-load from `pages` rather than feature internals.
- Reused domain data types may move to `entities` as modules are revisited.
- Large reusable page sections may move to `widgets` when there is enough composition complexity to justify them.
- Public `index.ts` exports now exist for feature slices and should become the preferred external entry point.
- Lint-enforced boundaries remain planned before the frontend becomes significantly larger.

The long-term direction is inspired by Feature-Sliced Design:

```txt
app -> pages -> widgets -> features -> entities -> shared
```

This is not a big-bang folder rewrite. Layers are introduced only when ownership becomes clearer because of them.

### 7.4 State ownership

RTK Query owns:

- API loading, success, and error state;
- normalized request lifecycle and cache tags;
- invalidation and focused optimistic updates;
- auth retry through the guarded base query.

Redux slices own:

- authenticated user and access token;
- session bootstrap/logout state;
- future global client state only when multiple distant features truly share it.

Hooks own:

- feature/page orchestration;
- form state and event handlers;
- mutation coordination and rollback behavior;
- reusable UI behavior that does not belong in JSX.

Components own:

- rendering and local visual state;
- accessibility and responsive behavior;
- composition of hooks and focused child components.

### 7.5 API and cache rules

- Feature endpoints are injected into the shared RTK Query API.
- Cache tag names are declared centrally.
- Optimistic updates are used only when rollback is safe.
- A mutation that changes a post must account for every cache where that post can appear: feed, detail, profile, dashboard, search, notifications, and saves as applicable.
- Manual cache patching should be extracted into tested helpers when repetition appears.
- Network errors must be normalized through the shared error-message utility.
- Refresh requests are guarded by a mutex so simultaneous `401` responses do not create a refresh storm.

### 7.6 Routing and UI rules

- Public and protected layouts remain separate.
- Protected app pages use the shared sidebar shell.
- Heavy pages are lazy-loaded at route level.
- Feed, post card, dashboard, modals, navigation, and responsive behavior preserve exact v1 UX where parity has been requested.
- V2 can improve accessibility, loading behavior, error handling, and component structure without inventing a different product flow.
- Desktop, tablet, and mobile states are all part of feature completion.

## 8. Domain Rules And Invariants

### 8.1 Authentication and sessions

```txt
Login/register/Google auth
  -> API returns short-lived access token
  -> API sets rotating refresh token in HttpOnly cookie
  -> API stores only refresh-token hash in auth session record
  -> web keeps access token in memory
```

Rules:

- A refresh token must match an active database session.
- Refresh rotates the session token.
- Current-device logout revokes one session.
- Logout-all revokes every active session for the user.
- Password and OTP values are hashed.
- Google-only account deletion uses OTP rather than a password the user never created.
- Cookie security derives from validated environment configuration.

### 8.2 Users, following, and blocking

- Follow and block relationships use separate relation models.
- Users cannot follow or block themselves, and self-reporting is rejected.
- Blocking is a cross-domain authorization policy, not only a profile UI state.
- Feed, profile, comments, search, messaging, and future rooms must query or enforce the same policy.
- Reporting must remain a moderation action and should not be disabled merely because normal interaction is blocked.

### 8.3 Posts and media

- A post belongs to one user and may include caption and project metadata.
- Media is an ordered heterogeneous list, so image/video sequence is durable and editable.
- Upload validation includes type, size, and count limits before provider calls.
- Provider IDs are retained so cleanup can delete remote media reliably.
- Feed supports `all` and `following` behavior from v1.
- Post detail is fetched independently; comments are loaded through the comments flow, not embedded into the post response.

### 8.4 Likes, comments, replies, and contributions

- Likes use a unique user-post relation to prevent duplicates.
- Comments are paginated.
- Replies are one level deep.
- Contribution logs link an activity back to its source action.
- Deleting a source comment, reply, or feedback must remove or reconcile its contribution.
- Denormalized counts must never become the only proof that a relation exists.

### 8.5 Saves and collections

- Saving is a first-class relation, not a boolean stored directly on a post.
- A save belongs to one user and one collection.
- Users can create, rename, delete, and manage their own collections.
- Saved posts can move between collections without creating duplicate user-post saves.

### 8.6 Reports and issues

- Reports use a target-type/target-id model so posts, profiles, and messages can share moderation infrastructure.
- Report reasons and status are durable.
- Users can view their submitted reports.
- Issues are user support records and remain separate from abuse reports.
- Admin review, audit history, and moderation actions are deferred product surfaces.

### 8.7 Notifications and search

- Notifications are derived from durable product events such as like, comment, reply, follow, and collaboration actions.
- Actionable notifications must stop offering stale actions after the underlying request expires or changes state.
- Navigation uses the direct resource route when context exists.
- Search and discovery keep typed search state separate from default discovery content.
- Blocked relationships are excluded according to product visibility rules.

### 8.8 Messaging and feedback

- Feedback is a message with durable context for a post or profile.
- Conversation hiding is per participant; one user's action must not immediately destroy the other user's history.
- A conversation may become visible again when a new message arrives.
- Read/seen state must agree across the message page and room chat.
- Message unsend and reporting are server-authorized actions.

### 8.9 Collaborative rooms

The accepted v1 behavior is planned for v2:

- a collaboration request begins from conversation context;
- accepting creates or reuses the shared room;
- each user also has a personal room;
- room access is decided by one central policy service;
- blocked-room behavior protects the blocker while preserving the other user's work in solo mode;
- problems can be added, selected, unselected, updated, run, and marked solved;
- code collaboration uses Yjs document updates rather than repeated full-string replacement;
- expensive code execution is rate limited and isolated behind an adapter;
- audio calls are available only when room presence permits them.

## 9. Important End-To-End Flows

### 9.1 Protected REST request and refresh

```txt
Feature hook/component
  -> RTK Query endpoint
  -> base query adds in-memory access token
  -> protected API middleware verifies token and user
  -> service executes business rule
  -> repository reads/writes MongoDB
  -> controller returns response

If access token is expired:
  -> one guarded refresh request uses HttpOnly cookie
  -> API validates and rotates DB session
  -> web stores new access token in memory
  -> original request retries once
  -> failed refresh clears the client session
```

### 9.2 Create or edit a post

```txt
Composer hook validates local form
  -> media API validates and uploads files
  -> ordered media descriptors return
  -> post mutation sends caption/project/media order
  -> post service validates ownership and domain rules
  -> repository persists post
  -> RTK Query updates or invalidates affected views
```

### 9.3 Comment or reply

```txt
Comment modal mutation
  -> comment service validates post visibility and block policy
  -> comment/reply relation is persisted
  -> post count and contribution source are updated
  -> notification is created when applicable
  -> comments cache is patched or invalidated
```

### 9.4 Feedback to conversation

```txt
Post/profile feedback modal
  -> chat feedback endpoint
  -> conversation is found or created
  -> contextual message is persisted
  -> contribution/activity state is updated
  -> future realtime delivery emits after durable write
```

### 9.5 Destructive cleanup target flow

```txt
Authorized delete request
  -> mark resource deleting/deactivate account
  -> revoke access where required
  -> enqueue idempotent cleanup job
  -> worker removes media and dependent relations
  -> retries use the same job identity
  -> reconciliation detects permanently failed cleanup
```

V2 currently has direct cleanup behavior for migrated flows. BullMQ process separation and reconciliation remain planned before production-scale destructive operations.

## 10. Data And Consistency Strategy

- MongoDB remains the primary database.
- Repositories centralize query shape and population/projection decisions.
- High-growth relations use dedicated collections instead of unbounded arrays on users or posts.
- Denormalized counters are allowed for read performance, but relation records remain authoritative.
- Multi-write flows need transactions where the deployment supports them, or idempotent compensation/reconciliation where external providers are involved.
- Query-driven compound indexes must be documented beside their models.
- Timeline endpoints should migrate from skip pagination to cursor pagination before high data volume.
- Search may begin with MongoDB queries but should move to indexed search when regex scans become a measured bottleneck.

## 11. Security Baseline

- Environment values are parsed once with Zod and frozen.
- Production rejects wildcard CORS and known development JWT defaults.
- `SameSite=None` requires secure cookies.
- Access tokens are short lived and kept out of persistent browser storage.
- Refresh tokens are HttpOnly, rotated, hashed at rest, and revocable by session.
- Request payloads, params, and queries are validated before service execution.
- Upload type, size, count, ownership, and provider cleanup are enforced server-side.
- Sensitive flows receive both IP and identity-aware rate limits where appropriate.
- Logs must not contain passwords, OTPs, raw tokens, cookies, or provider secrets.
- Unexpected errors return a safe response while structured logs retain diagnostic context.
- Authorization checks must be shared by HTTP handlers, future socket handlers, and workers.

## 12. Realtime And Background Work

Before realtime modules are migrated, v2 must define:

- authenticated Socket.IO handshake and reconnect behavior;
- stable event names and payload schemas;
- room membership and authorization checks;
- acknowledgement, idempotency, and stale-event handling;
- Redis adapter requirements before multiple API instances;
- shared presence/call state outside process memory;
- durable-write-before-emit ordering for important events;
- Yjs persistence and Monaco binding strategy;
- worker queues, retries, dead-letter handling, and monitoring.

The HTTP API, socket gateway, and workers may share domain services, but each is a separate transport/runtime boundary.

## 13. API Contracts

DevLoopFeed remains REST-first.

Current rules:

- feature routes remain grouped under `/api/<domain>`;
- request validation is colocated with the owning module;
- success and error response shapes should be consistent across modules;
- frontend request/response types must match actual API behavior;
- breaking changes require an explicit decision and migration plan.

OpenAPI now has a draft baseline in `contracts/openapi/devloopfeed.v2.yaml`. It is not complete endpoint coverage yet. It should document auth, cookies, schemas, pagination, errors, and rate-limit responses as modules are verified. GraphQL is not required merely because the reference architecture uses it.

## 14. Quality And Delivery Gates

Current baseline commands:

```bash
npm run check
npm run build:api
npm run build:web
npm run verify
git diff --check
```

Target quality layers:

1. Unit tests for pure policies, utilities, and service decisions.
2. Repository tests for query and index assumptions.
3. API integration tests for auth, ownership, validation, and error contracts.
4. Frontend component tests for complex forms and modals.
5. End-to-end tests for critical user journeys.
6. Socket and worker integration tests for reconnect, idempotency, and cleanup.
7. Visual regression checks for exact v1 parity surfaces.

CI now runs dependency install, type checking, and API/web builds on pull requests and pushes to `develop` and `main`. Tests, linting, visual checks, and contract validation should be added as their tools are introduced. Docker can be added after feature work, but local infrastructure and deployment process types must remain explicit.

## 15. Delivery Roadmap

### Foundation now

- Keep this guide and the decision register current.
- Continue moving cross-module imports to public APIs and enforce import boundaries gradually.
- Expand the draft OpenAPI contract into verified endpoint coverage.
- Add real automated tests on top of the testing and CI foundation.
- Add indexes and transaction/reconciliation rules for migrated modules.

### Before full messaging and rooms

- Introduce Redis through an infrastructure adapter.
- Define Socket.IO event contracts and authentication.
- Complete full conversation/message APIs and UI.
- Implement notification realtime delivery.
- Add BullMQ workers as separate process types.

### Collaborative product milestone

- Migrate collab requests, room access policy, personal/shared rooms, and problems.
- Add Yjs/Monaco collaboration and awareness.
- Add code execution adapter, limits, timeouts, and result persistence.
- Add WebRTC audio with production TURN configuration.

### Production hardening

- Cursor pagination for high-growth timelines.
- Queue and socket observability.
- Admin moderation and support workflows.
- Dockerized local infrastructure and deployment manifests.
- Security, accessibility, performance, and recovery testing.

## 16. Debugging Checklist

The complete operational playbook is maintained in `DEBUGGING-GUIDE.md`. It covers evidence capture, symptom triage, layer-by-layer request tracing, auth/session failures, RTK Query cache behavior, domain-specific invariants, data consistency, external providers, security-safe logging, verification gates, and planned realtime/worker diagnostics.

Use the short path below to locate the owning layer, then continue with the detailed guide before closing a defect.

### Frontend

1. Confirm the route and layout are correct.
2. Check the owning feature hook and RTK Query endpoint.
3. Check cache key, tags, optimistic patch, and rollback.
4. Check auth refresh and normalized error handling.
5. Check responsive, loading, empty, and error states.

### Backend

1. Confirm route mounting and middleware order.
2. Check request validator output.
3. Check controller mapping, then service policy.
4. Check repository filter, projection, population, and index.
5. Check cross-domain authorization such as ownership or blocking.
6. Check external provider and cleanup behavior.
7. Check structured logs using request/user/job identifiers without secrets.

### Realtime and jobs

1. Confirm authentication and room/job identity.
2. Confirm durable state changed before emitting completion.
3. Confirm duplicate delivery is safe.
4. Confirm reconnect/retry behavior.
5. Confirm multi-instance shared state and adapter configuration.

## 17. Documentation Governance

For every meaningful feature or architecture change:

- update `docs.md` with what changed, why, and verification;
- update this guide when system boundaries or flows change;
- update `ARCHITECTURE-DECISIONS.md` when a durable choice is accepted, changed, or superseded;
- update `DEBUGGING-GUIDE.md` when a runtime, provider, verification gate, or recurring failure mode changes;
- keep current, partial, planned, and deferred status accurate;
- never document an intended feature as implemented before code and verification exist.

## 18. One-Line Mental Model

DevLoopFeed is a TypeScript modular monolith where React feature flows call an Express REST API, domain services enforce product rules, repositories own MongoDB access, and realtime or background runtimes reuse those same rules through explicit infrastructure boundaries.
