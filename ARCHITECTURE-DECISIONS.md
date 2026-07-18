# Disuza Architecture Decision Register

This register records durable product and engineering decisions for Disuza. It starts with the behavior proven in v1 and the foundation already established in the current implementation.

The full system map lives in `Disuza-Architecture-Guide.md`.

## Decision States

- `Accepted`: the decision is the current direction.
- `Proposed`: discussion or proof is still required.
- `Superseded`: a later decision replaced it.

Delivery is tracked separately:

- `Implemented`: present and verified in the current implementation.
- `Partial`: part of the decision is present.
- `Planned`: accepted but not delivered in the current implementation.
- `Deferred`: intentionally waiting for dependencies or product work.

## Register

| ID | Decision | Decision state | Delivery |
| --- | --- | --- | --- |
| DLF-001 | Use v1 behavior as the migration parity baseline | Accepted | Partial |
| DLF-002 | Treat live code as implementation truth | Accepted | Implemented |
| DLF-003 | Build the app as a TypeScript modular monolith | Accepted | Implemented |
| DLF-004 | Use layered backend modules | Accepted | Implemented |
| DLF-005 | Isolate persistence in repositories | Accepted | Implemented |
| DLF-006 | Keep controllers thin and errors centralized | Accepted | Implemented |
| DLF-007 | Split environment and request validation tools | Accepted | Implemented |
| DLF-008 | Validate configuration once and fail fast | Accepted | Implemented |
| DLF-009 | Remain REST-first and add OpenAPI contracts | Accepted | Partial |
| DLF-010 | Evolve the frontend from feature-first toward explicit layers | Accepted | Partial |
| DLF-011 | Use RTK Query for server state and Redux slices selectively | Accepted | Implemented |
| DLF-012 | Keep orchestration in hooks and rendering in focused components | Accepted | Partial |
| DLF-013 | Return access tokens and keep refresh tokens in HttpOnly cookies | Accepted | Implemented |
| DLF-014 | Persist hashed, rotating, revocable refresh sessions | Accepted | Implemented |
| DLF-015 | Use MongoDB/Mongoose and separate high-growth relations | Accepted | Implemented |
| DLF-016 | Allow denormalized counters with authoritative relations | Accepted | Partial |
| DLF-017 | Store post images and videos as ordered mixed media | Accepted | Implemented |
| DLF-018 | Keep replies one level deep and link contribution sources | Accepted | Implemented |
| DLF-019 | Model saved collections as a first-class domain | Accepted | Implemented |
| DLF-020 | Use a reusable target model for moderation reports | Accepted | Partial |
| DLF-021 | Enforce blocking as a backend cross-domain policy | Accepted | Partial |
| DLF-022 | Persist notifications and add realtime delivery later | Accepted | Partial |
| DLF-023 | Model post/profile feedback as contextual messages | Accepted | Partial |
| DLF-024 | Use Socket.IO with shared state before multi-instance scale | Accepted | Planned |
| DLF-025 | Use Yjs updates for collaborative code editing | Accepted | Planned |
| DLF-026 | Move destructive cleanup to idempotent background jobs | Accepted | Planned |
| DLF-027 | Hide external providers behind infrastructure adapters | Accepted | Partial |
| DLF-028 | Preserve exact v1 UX on parity surfaces | Accepted | Partial |
| DLF-029 | Lazy-load routes and define explicit cache update ownership | Accepted | Partial |
| DLF-030 | Apply defense-in-depth security and abuse limits | Accepted | Partial |
| DLF-031 | Use structured observability across HTTP, sockets, and jobs | Accepted | Partial |
| DLF-032 | Add layered automated tests and CI before production claims | Accepted | Partial |
| DLF-033 | Add Docker without coupling application design to containers | Accepted | Planned |
| DLF-034 | Extract services only after measured modular-monolith limits | Accepted | Planned |
| DLF-035 | Keep admin moderation as a separate future product surface | Accepted | Deferred |
| DLF-036 | Add GenAI problem generation only with admin and safety controls | Accepted | Deferred |
| DLF-037 | Model reposts as profile-visible references, not feed fan-out | Accepted | Implemented |

## Foundation Decisions

### DLF-001: V1 behavior is the migration baseline

Context: v1 already contains the intended product journey and many connected edge cases.

Decision:

- Preserve user-visible flow, domain rules, and exact UI where parity is requested.
- Rewrite implementation using TypeScript types, boundaries, repositories, hooks, and shared utilities.
- Any deliberate product behavior change needs its own documented decision.

Consequence: source code is not copied blindly, but missing v1 behavior is a migration gap rather than a new design opportunity.

### DLF-002: live code is implementation truth

Context: migration documentation may describe planned or partial work.

Decision:

- The checked-in current code determines what is currently implemented.
- `docs.md` records delivery history.
- The architecture guide records current boundaries and accepted targets.
- Status labels must distinguish implemented, partial, planned, and deferred work.

Consequence: documentation cannot claim Socket.IO, Redis, BullMQ, Yjs, Judge0, tests, or Docker are active before they exist and are verified in the current implementation.

### DLF-003: TypeScript modular monolith

Context: the product is broad, but the current team and load do not justify distributed services.

Decision:

- Keep API domains in one deployable Express application.
- Keep web and API as separate packages in one repository.
- Build strong module boundaries so future extraction remains possible.

Consequence: development and deployment stay understandable while preserving a path to scale specific hotspots.

## Backend Decisions

### DLF-004: Layered backend modules

Decision:

```txt
route -> middleware/validator -> controller -> service -> repository -> model
```

- Routes compose transport concerns.
- Controllers translate HTTP.
- Services own use cases and invariants.
- Repositories own persistence.
- Models own schema and indexes.

Consequence: layers may be omitted for genuinely tiny modules, but responsibilities may not be mixed for convenience.

### DLF-005: Repository-owned persistence

Decision:

- Mongoose queries belong in repositories.
- Query filters, projection, population, pagination, and transaction sessions are repository concerns.
- Services combine repository operations but do not embed ad hoc database calls.

Consequence: business rules can be tested independently and query changes have one owner.

### DLF-006: Thin controllers and centralized errors

Decision:

- Controllers parse validated input, call one use case, and shape the response.
- Expected failures use typed operational errors.
- Async failures flow through `asyncHandler` to one global error handler.
- Unknown routes use the not-found middleware.

Consequence: API behavior stays consistent and unexpected errors do not leak internals.

### DLF-007: Validation tool split

Decision:

- Zod validates environment configuration at startup.
- `express-validator` validates request body, params, and query in route middleware.
- Domain services still enforce business invariants that shape validation cannot prove.

Consequence: validation remains natural to each lifecycle without confusing input shape with authorization or policy.

### DLF-008: Fail-fast configuration

Decision:

- Read and validate environment values once.
- Export immutable typed config.
- Derive production defaults such as secure cookies from `NODE_ENV`.
- Reject unsafe production combinations such as wildcard CORS or development secrets.

Consequence: missing production configuration fails at startup instead of failing unpredictably during requests.

### DLF-009: REST-first contracts

Decision:

- Retain Express REST endpoints grouped by business domain.
- Add OpenAPI as the machine-readable contract.
- Do not adopt GraphQL only because another reference product uses it.

Consequence: existing RTK Query integration remains appropriate while API drift becomes detectable once OpenAPI is added.

Current delivery note: a draft OpenAPI baseline exists under `contracts/openapi`, but full endpoint coverage and automated contract validation are still planned.

## Frontend Decisions

### DLF-010: Evolutionary frontend layering

Context: the current implementation currently uses `app`, `features`, and `shared` successfully.

Decision:

- Keep the current feature-first organization.
- Enforce `app -> features -> shared` now.
- Introduce `pages`, `widgets`, and `entities` only where ownership and reuse justify them.
- Add public `index.ts` APIs and boundary linting before module count becomes difficult to control.

Consequence: the frontend gains Feature-Sliced discipline without a disruptive folder-only rewrite.

Current delivery note: route-level `pages` wrappers, reserved `widgets` and `entities` folders, shared contracts, and feature public APIs now exist. Domain model movement and lint-enforced boundaries remain gradual.

### DLF-011: State ownership

Decision:

- RTK Query owns server data and request lifecycle.
- Redux slices own true global client/application state, currently auth.
- Local component state owns temporary visual state.
- Do not duplicate query data in slices without a specific offline or workflow requirement.

Consequence: there is one primary owner for each piece of state and fewer synchronization bugs.

### DLF-012: Hooks and focused components

Decision:

- Page/feature hooks own orchestration, forms, effects, and mutation coordination.
- Components focus on accessible rendering and composition.
- Memoization is added for measured render stability or stable contracts, not automatically everywhere.

Consequence: JSX remains readable without hiding all behavior inside generic abstractions.

### DLF-028: V1 UX parity

Decision:

- Feed, post card, dashboard, modal, navigation, and responsive behavior use v1 as visual truth when parity is requested.
- The current implementation may improve accessibility, error boundaries, loading states, and component internals without changing product flow.
- New UI concepts require explicit product approval.

Consequence: the rewrite feels like the same product rather than an unrelated redesign.

### DLF-029: Route loading and cache ownership

Decision:

- Route-level pages are lazy loaded.
- RTK Query feature APIs own tags and endpoint cache behavior.
- Mutations must identify every view affected by their domain change.
- Repeated cross-cache patching should become shared, tested helpers.

Consequence: performance and cache correctness are designed per workflow instead of added as scattered fixes.

## Identity And Security Decisions

### DLF-013: Access and refresh token placement

Decision:

- Return a short-lived access token in the API response.
- Keep it in browser memory through auth state.
- Store the refresh token only in a secure HttpOnly cookie.
- Use the access token in the Authorization header for protected requests.

Consequence: JavaScript cannot read the refresh token, and persistent browser storage does not hold the access token.

### DLF-014: Database-backed refresh sessions

Decision:

- Store only a refresh-token hash in the session record.
- Rotate refresh tokens during refresh.
- Revoke one session for current-device logout.
- Revoke all sessions for logout-all and sensitive account actions.

Consequence: the product can support multiple devices and targeted revocation while reducing replay risk.

### DLF-030: Defense in depth

Decision:

- Use Helmet, restricted CORS, validated cookies, request validation, and upload controls.
- Apply rate limits to auth, OTP, reports, messages, uploads, and code execution according to abuse cost.
- Add identity/account throttles where IP-only limits are insufficient.
- Never log credentials, OTPs, raw tokens, cookies, or secrets.

Consequence: security is a cross-cutting baseline rather than one middleware checkbox.

## Data And Domain Decisions

### DLF-015: MongoDB and relation collections

Decision:

- Keep MongoDB and Mongoose for the current implementation.
- Use separate collections for high-growth relations such as follows, blocks, likes, saves, sessions, and contribution sources.
- Avoid unbounded relationship arrays in primary documents.

Consequence: relation queries, uniqueness, indexes, and cleanup can scale independently.

### DLF-016: Denormalized counters

Decision:

- Keep counters on read-heavy resources where they materially improve reads.
- Treat relation/source records as authoritative.
- Use transactions for critical multi-write database flows where possible.
- Add reconciliation for queue/provider failures and counter drift.

Consequence: fast reads do not hide the need for consistency controls.

### DLF-017: Ordered mixed media

Decision:

- A post stores one ordered media list containing typed image/video items.
- Editing may add, remove, and reorder media while preserving explicit sequence.
- Provider IDs and URLs are persisted for rendering and cleanup.

Consequence: the carousel order is durable and does not depend on separate image/video arrays.

### DLF-018: One-level replies and source-linked contributions

Decision:

- Comments are top-level records and replies reference one parent comment.
- Replies cannot create deeper reply trees.
- Contribution logs retain source identity so deletion can reverse activity safely.

Consequence: the discussion model remains understandable while heatmap/activity cleanup remains traceable.

### DLF-019: Saved collections

Decision:

- Model collection and saved-post membership separately.
- Enforce one user's ownership and prevent duplicate user-post saves.
- Support create, rename, delete, move, and unsave flows.

Consequence: saved content is a real organizational product feature, not a post flag.

### DLF-020: Generic moderation reports

Decision:

- Store target type and target ID for post, user, and message reports.
- Keep issue/support submissions in a separate domain.
- Preserve reports even when normal direct interaction is blocked.

Consequence: one moderation foundation can support multiple resources and a future admin panel.

### DLF-021: Central block policy

Decision:

- Enforce block relationships on the backend across profile, social, feed, comments, search, chat, and rooms.
- Centralize reusable interaction/access decisions instead of duplicating pairwise checks.
- Apply the same policy in HTTP, sockets, and background jobs.

Consequence: users cannot bypass restrictions through direct API or socket calls.

### DLF-037: Repost visibility and ownership policy

Decision:

- Reposts are stored as a user-post relation and counted on the original post.
- A user cannot repost their own post.
- Reposts appear in dashboard/profile repost surfaces and repost detail views.
- Reposts do not create duplicate feed entries for the reposter's followers.
- Repost detail wraps the original post with reposter context while engagement actions still target the original post.

Consequence: reposts behave like a profile activity and discovery signal without polluting follower feeds or duplicating post ownership.

## Realtime And Async Decisions

### DLF-022: Durable notifications first

Decision:

- Persist important notification state before realtime delivery.
- Realtime sockets improve latency but are not the durable source of truth.
- Expiring actionable notifications must align with the underlying action status.

Consequence: reconnecting clients can recover notification state from the API.

### DLF-023: Contextual feedback messages

Decision:

- Post and profile feedback reuse conversation/message infrastructure.
- A feedback message stores enough target context to render meaningfully later.
- Normal messages and structured feedback remain distinguishable.

Consequence: feedback naturally leads into conversation and later collaboration.

### DLF-024: Socket.IO and shared realtime state

Decision:

- Use Socket.IO for chat, notifications, room presence, collaboration events, and call signaling.
- Define authenticated, typed event contracts before implementation.
- Add a Redis adapter and externalize active presence/call state before multi-instance deployment.
- Do not rely on one process's memory as durable state.

Consequence: the first implementation can stay in the modular monolith without blocking horizontal scale later.

### DLF-025: Yjs collaborative documents

Decision:

- Sync Yjs document updates rather than repeatedly replacing full code strings.
- Use a maintained Monaco/Yjs binding where possible.
- Separate ephemeral awareness/presence from durable room code snapshots.

Consequence: concurrent edits, cursor stability, and reconnect behavior have a stronger foundation.

### DLF-026: Background cleanup jobs

Decision:

- Post, account, and conversation destruction become idempotent BullMQ jobs.
- API requests first mark/deactivate and enqueue, then return promptly.
- Workers run as separate process types with retry, dead-letter visibility, and reconciliation.

Consequence: expensive external and relational cleanup does not block HTTP requests or run once per API replica accidentally.

### DLF-027: External provider adapters

Decision:

- ImageKit, Resend, Google, Judge0, Redis, BullMQ, and future TURN/provider details stay behind adapters.
- Domain services depend on product operations rather than provider SDK request shapes.

Consequence: providers can be tested, replaced, timed out, and observed centrally.

## Operations And Evolution Decisions

### DLF-031: Structured observability

Decision:

- Keep structured Pino HTTP logs.
- Add request, session-safe user, socket, room, job, and external-call correlation IDs where relevant.
- Track latency, errors, reconnects, queue retries, and execution failures.

Consequence: production behavior can be diagnosed across asynchronous boundaries without leaking sensitive data.

### DLF-032: Tests and CI

Decision:

- Add unit, integration, component, end-to-end, socket, worker, and visual regression tests according to risk.
- CI must typecheck, test, build, lint, and validate contracts before production claims.
- Auth, block rules, cache rollback, cleanup, and room access receive priority.

Consequence: architecture boundaries become enforceable rather than documentation-only preferences.

Current delivery note: CI now installs API/web dependencies, typechecks, and builds on pull requests and protected branch pushes. Real unit, integration, component, E2E, socket, worker, visual, lint, and contract gates remain planned.

### DLF-033: Docker as packaging

Decision:

- Docker may be added after core implementation without rewriting application code.
- Compose should describe API, web, MongoDB, Redis, and worker process types for local/product-like environments.
- Configuration remains environment-driven and the app remains runnable outside containers.

Consequence: containers improve repeatability but do not become hidden application architecture.

### DLF-034: Evidence-based service extraction

Decision:

- Keep domains in the modular monolith until load, release cadence, failure isolation, or team ownership creates a measured need.
- Likely future extraction candidates are realtime collaboration, code execution, search, and workers.
- Extraction requires a contract, data ownership plan, observability, and failure strategy.

Consequence: Disuza can look and behave like a product without premature microservice complexity.

### DLF-035: Admin moderation later

Decision:

- Current user reports and issues establish data intake.
- Admin review queues, decisions, audit logs, content actions, appeals, and metrics form a separate future product surface.

Consequence: moderation is planned explicitly without pretending a report submission endpoint is a complete safety system.

### DLF-036: Controlled GenAI problem generation

Decision:

- GenAI-generated problems remain deferred until room/problem foundations and admin review exist.
- Generated statements, constraints, solutions, and tests require validation, cost/rate limits, provenance, and abuse controls.

Consequence: AI does not introduce unreviewed executable or incorrect challenge content into the core collaboration flow.

## Adding Or Changing A Decision

When a durable choice changes:

1. Add or update an ID in the register.
2. Record context, decision, consequences, and delivery status.
3. Mark the old decision `Superseded` rather than deleting history.
4. Link the pull request or commit when available.
5. Update `Disuza-Architecture-Guide.md` and `docs.md` if system flow changed.

Use this template for a larger future ADR:

```md
# DLF-XXX: Short decision title

Status: Proposed | Accepted | Superseded
Delivery: Implemented | Partial | Planned | Deferred
Date: YYYY-MM-DD

## Context

What problem or constraint requires a durable decision?

## Decision

What are we choosing?

## Consequences

What improves, what becomes harder, and what follow-up is required?
```

