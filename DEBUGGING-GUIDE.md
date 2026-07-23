# Disuza Debugging Guide

This guide is the practical troubleshooting baseline for Disuza. Use it with `Disuza-Architecture-Guide.md`, which defines ownership and system flow, and `ARCHITECTURE-DECISIONS.md`, which explains durable technical choices.

The guide describes the current TypeScript API and web application. Realtime, workers, rooms, and the code-execution adapter exist in the current codebase, but hosted/demo code execution remains dependent on a reliable external sandbox runner.

## 1. Debugging Rules

1. Reproduce the smallest failing user flow before changing code.
2. Record expected behavior from product requirements or the accepted decision before deciding that current behavior is wrong.
3. Follow the request through its owning layers instead of patching the first visible symptom.
4. Change the layer that owns the defect.
5. Verify adjacent views and caches affected by the same data.
6. Never expose secrets, tokens, cookies, OTPs, passwords, or private user data in logs or bug reports.
7. Do not mark a planned capability as broken merely because it is not implemented yet.

## 2. First Ten Minutes

- [ ] Confirm the active branch and whether the failure exists on current `develop`.
- [ ] Check for unresolved or incorrectly resolved merge changes around the failing file.
- [ ] Record the route, user role, account relationship, resource ID, and exact action.
- [ ] Reproduce once with browser Network and Console panels open.
- [ ] Identify whether the first incorrect result appears in UI state, HTTP transport, service policy, persistence, or an external provider.
- [ ] Capture the response status and safe error message without copying credentials or cookies.
- [ ] Run the smallest relevant typecheck before editing.
- [ ] Read the owning module's route, validator, controller, service, repository, model, API endpoint, hook, and component as applicable.

Repository health commands from the root:

```bash
git status --short --branch
npm run check
npm run build:api
npm run build:web
git diff --check
```

There is no complete automated test, lint, OpenAPI contract, visual-regression, socket, or worker gate yet. Do not report those gates as passing until they are actually added and run.

## 3. Evidence Record

Record enough context to reproduce the defect without sensitive values:

```txt
Environment:
Branch/commit:
User role and relationship:
Route/page:
Action:
Expected result:
Actual result:
HTTP method/path/status:
Safe response message:
Relevant request/log time:
First failing layer:
Reproduction frequency:
```

For Product consistency defects, also record the matching the product specification page, modal, endpoint, or business rule. Product behavior is the expected-behavior baseline; current code remains the implementation source of truth.

## 4. Symptom Triage

| Symptom | Start here |
| --- | --- |
| Blank page or render fallback | Router, lazy import, `ErrorBoundary`, browser console |
| Unexpected redirect | Auth bootstrap, protected/public layout, current route |
| Request never sent | Event handler, form validation, disabled state, hook conditions |
| `400` or `422` response | Request payload and module validator |
| `401` response | Access token, refresh mutex, refresh cookie, database session |
| `403` response | Ownership, block relationship, visibility, resource policy |
| `404` response | Route mount, URL params, soft-delete/visibility filters |
| `409` response | Unique relation, duplicate action, current resource state |
| `429` response | Endpoint rate limiter and repeated client requests |
| `500` response | Structured API log, service/repository boundary, provider failure |
| UI succeeds but stays stale | RTK Query tags, cache key, optimistic patch, invalidation |
| Counter differs from records | Relation source, failed multi-write, reconciliation need |
| Media missing after save | Upload result, media order, provider ID, cleanup/rollback |
| Desktop works, mobile fails | the product specification breakpoint, overflow, modal sizing, fixed navigation |

## 5. Request Path Checklist

Trace one request in this order:

```txt
UI action
  -> feature hook
  -> RTK Query endpoint
  -> guarded base query
  -> Express route and middleware
  -> validator
  -> controller
  -> service
  -> repository
  -> Mongoose model/database
  -> response mapping
  -> RTK Query cache update
  -> rendered UI
```

- [ ] Confirm the first layer where actual data differs from expected data.
- [ ] Confirm request and response field names against both endpoint types and runtime payloads.
- [ ] Confirm errors are normalized rather than swallowed or replaced by a generic success state.
- [ ] Confirm the fix does not move business policy into controllers, components, or repositories.

## 6. Frontend Checklist

### Routing and rendering

- [ ] Confirm the page is mounted under the intended public or protected layout.
- [ ] Confirm the lazy import resolves to the expected default export.
- [ ] Check the shared `ErrorBoundary` fallback and the original browser error.
- [ ] Confirm route params and navigation targets identify the same resource.
- [ ] Verify loading, empty, error, success, and permission-denied states separately.

### Authentication state

- [ ] Confirm auth bootstrap has completed before redirect decisions run.
- [ ] Confirm the access token exists only in in-memory auth state.
- [ ] Confirm the guarded base query adds the access token to protected requests.
- [ ] Confirm concurrent `401` responses wait for one refresh attempt.
- [ ] Confirm a failed refresh clears auth state and does not retry forever.

### RTK Query and cache

- [ ] Confirm the correct endpoint and query arguments are used.
- [ ] Confirm tag names and IDs match between `providesTags` and `invalidatesTags`.
- [ ] Check every view containing the changed resource: feed, detail, profile, dashboard, search, notifications, saves, and comments as applicable.
- [ ] Confirm optimistic updates have rollback behavior.
- [ ] Confirm list and detail cache entries do not disagree after mutation success or failure.
- [ ] Check that refetch loops are not caused by unstable arguments or effects.

### Hooks, forms, and modals

- [ ] Keep orchestration and mutation coordination in the owning hook.
- [ ] Check stale closures, effect dependencies, reset timing, and duplicate submission guards.
- [ ] Confirm modal open/close state does not discard successful server data or retain stale form data.
- [ ] Confirm body scroll is restored after every modal exit path.
- [ ] Confirm server validation messages map to the correct field or shared error surface.

### UI Consistency

- [ ] Compare against the actual accepted JSX and CSS baseline, not memory or a redesigned approximation.
- [ ] Check content order, dimensions, spacing, colors, borders, typography, icons, and modal flow.
- [ ] Inspect desktop, tablet, and mobile breakpoints.
- [ ] Check clipping, horizontal overflow, fixed navigation overlap, long text, empty states, and media aspect ratios.
- [ ] Confirm a visual correction does not alter API payloads or business behavior.

## 7. Backend Checklist

### Startup and configuration

- [ ] Confirm environment parsing fails clearly for missing or unsafe values.
- [ ] Confirm production-derived cookie, CORS, and security values come from validated configuration.
- [ ] Confirm MongoDB connects before the server starts listening.
- [ ] Confirm provider initialization does not hide startup side effects.
- [ ] Never paste `.env` contents into logs, screenshots, commits, or reports.

### HTTP composition

- [ ] Confirm the feature route is imported and mounted exactly once in `app.ts`.
- [ ] Confirm middleware order: security/parsing, authentication, validation, controller, not-found, error handler.
- [ ] Confirm route params, body, and query values are validated before controller execution.
- [ ] Confirm endpoint-specific rate limiting is applied at the correct route boundary.

### Layer ownership

- [ ] Controller: maps validated HTTP input/output and delegates the use case.
- [ ] Service: enforces ownership, visibility, block rules, state transitions, and cross-domain policy.
- [ ] Repository: owns Mongoose filters, projection, population, pagination, and transaction session use.
- [ ] Model: owns schema constraints and indexes.
- [ ] Shared code: remains domain-neutral and has more than one legitimate consumer.
- [ ] Operational errors flow through `asyncHandler` and the global error handler.

### Persistence

- [ ] Confirm string IDs are valid before Mongoose casts them.
- [ ] Check soft-delete and visibility filters on reads and writes.
- [ ] Check owner filters on edit/delete operations.
- [ ] Confirm projections and populations return every field required by the client, but no sensitive field.
- [ ] Confirm unique and query-supporting indexes match the repository query shape.
- [ ] Confirm pagination order is deterministic.

## 8. Authentication And Session Checklist

- [ ] Confirm password, OTP, and refresh-token comparisons use hashes rather than raw stored values.
- [ ] Confirm login returns the access token in the response and refresh token only through an HttpOnly cookie.
- [ ] Confirm cookie `Secure`, `SameSite`, domain, path, and expiry values match the environment.
- [ ] Confirm refresh finds one active database session and rotates its token hash.
- [ ] Confirm the old refresh token cannot be reused after rotation.
- [ ] Confirm current-device logout revokes only the matching session.
- [ ] Confirm logout-all and sensitive account actions revoke every active user session.
- [ ] Confirm Google login verifies the configured audience and does not bypass account-state checks.
- [ ] Confirm OTP and auth rate-limit TTL behavior matches the intended flow.
- [ ] Test expired access token, expired refresh token, revoked session, malformed token, and deleted/deactivated user separately.

## 9. Domain Checklists

### Users, profiles, following, and blocking

- [ ] Confirm self-follow, self-block, and self-report are rejected.
- [ ] Confirm follow/block relation uniqueness and counters remain consistent.
- [ ] Confirm block policy is applied to profile, feed, comments, search, feedback, and future room access.
- [ ] Confirm reporting remains available where moderation policy requires it.
- [ ] Confirm profile/dashboard mutations invalidate every visible copy of user data.

### Posts and media

- [ ] Confirm the post belongs to the acting user before edit/delete.
- [ ] Confirm image/video type, size, count, and ownership checks happen before persistence.
- [ ] Confirm mixed media order is preserved across create, edit, carousel rendering, and detail fetch.
- [ ] Confirm provider IDs are persisted for replacement and cleanup.
- [ ] Confirm removed or failed media is cleaned up without deleting media still referenced by a post.
- [ ] Confirm post detail does not embed comments; comments load through their own paginated flow.
- [ ] Confirm `all` and `following` feed filters preserve the product specification visibility behavior.

### Likes, comments, replies, and contributions

- [ ] Confirm relation records prevent duplicate likes or duplicate source actions.
- [ ] Confirm comment and reply targets are visible and allowed by block policy.
- [ ] Confirm replies remain one level deep.
- [ ] Confirm counters never decrement below zero.
- [ ] Confirm contribution records retain source IDs.
- [ ] Confirm deleting a comment, reply, or feedback removes or reconciles its contribution and notification effects.

### Saves and collections

- [ ] Confirm collection ownership on create, rename, delete, move, and list operations.
- [ ] Confirm one user-post save cannot be duplicated.
- [ ] Confirm moving a save changes collection membership without creating a second save.
- [ ] Confirm deleting a collection follows the accepted saved-post behavior.
- [ ] Confirm saved state updates on post cards, detail, and collection views.

### Reports, issues, notifications, and search

- [ ] Confirm report target type and target ID agree and the target exists.
- [ ] Confirm post/profile reports share infrastructure without sharing inappropriate validation rules.
- [ ] Confirm issue records remain separate from abuse reports.
- [ ] Confirm notifications are written only for eligible recipients and durable source events.
- [ ] Confirm stale actionable notifications stop offering invalid actions.
- [ ] Confirm notification navigation uses available resource context.
- [ ] Confirm search excludes blocked or invisible resources consistently.
- [ ] Confirm discovery and typed-search loading/empty states remain separate.

### Messaging and feedback: partial

- [ ] Confirm contextual feedback stores its post/profile source and creates or reuses the correct conversation.
- [ ] Confirm conversation hiding is participant-specific.
- [ ] Confirm contribution and activity effects are updated with feedback lifecycle changes.
- [ ] Do not expect realtime delivery, complete read-state synchronization, or full message moderation until those modules are implemented.

## 10. Data Consistency And Cleanup

- [ ] Identify the authoritative relation or source record before trusting a denormalized counter.
- [ ] List every database write and external-provider operation in the use case.
- [ ] Use a transaction for critical MongoDB-only multi-write flows where supported.
- [ ] For external providers, define compensation or idempotent cleanup when one step fails.
- [ ] Re-run the failed action safely to check idempotency.
- [ ] Verify delete flows remove or deactivate dependent records according to product behavior.
- [ ] Record any counter drift or orphaned media/session/contribution state that needs future reconciliation.

## 11. External Provider Checklist

- [ ] Confirm configuration exists without logging its secret value.
- [ ] Confirm provider errors are translated to safe operational errors.
- [ ] Confirm timeout, retry, and duplicate-request behavior.
- [ ] Confirm database state is not committed as complete before a required provider operation succeeds.
- [ ] Confirm cleanup can identify the remote resource through its stored provider ID.
- [ ] Distinguish local configuration failure from provider rejection or network failure.

Current providers include ImageKit, Resend, Google OAuth, Redis, BullMQ, Socket.IO, Gemini AI generation, and the Piston-compatible code-execution adapter. The default public Piston endpoint is a demo fallback only; if execution fails with the generic client message, first confirm whether `PISTON_API_URL` points to a reliable paid or self-hosted runner before treating the room/editor flow as broken. If AI problem generation fails, confirm `GEMINI_API_KEY`, model availability, provider quota/rate limits, and structured-output validation before treating the room problem flow as broken. TURN-related providers remain planned.

## 12. Realtime, Rooms, And Workers: Planned Baseline

Use this checklist when these runtimes are implemented:

- [ ] Authenticate socket handshakes and re-check authorization for protected events.
- [ ] Record event name, acknowledgement, actor, room, resource version, and reconnect state.
- [ ] Persist important state before emitting success events.
- [ ] Make duplicate event delivery and job retries idempotent.
- [ ] Confirm Redis-backed presence and adapters before multi-instance testing.
- [ ] Confirm blocked-room and personal/shared-room access through one central policy.
- [ ] Separate Yjs document updates from awareness/presence state.
- [ ] Confirm worker process ownership, retry limit, dead-letter visibility, and reconciliation.
- [ ] Confirm code execution limits, timeout, isolation, and result ownership.
- [ ] Confirm code execution is backed by a reliable paid or self-hosted runner before claiming production execution support.
- [ ] Confirm call signaling and TURN behavior without treating peer state as durable product state.

Until implementation exists, debugging should stop at the documented HTTP/persistence boundary and record the missing capability as planned work.

## 13. Logging And Security

- [ ] Use structured API logs and preserve the relevant timestamp, method, path, status, and safe user/resource context.
- [ ] Add explicit correlation IDs for sockets, jobs, rooms, and external calls when those runtimes are introduced.
- [ ] Redact Authorization headers, cookies, passwords, OTPs, tokens, provider secrets, and sensitive request bodies.
- [ ] Return safe client errors while keeping diagnostic detail server-side.
- [ ] Treat repeated auth, report, upload, message, and future execution failures as possible abuse signals.
- [ ] Remove temporary debug logging before commit.

## 14. Verification Matrix

| Change type | Minimum verification |
| --- | --- |
| Documentation only | Links/status review and `git diff --check` |
| API-only | `npm run check:api`, `npm run build:api`, focused endpoint smoke test |
| Web-only | `npm run check:web`, `npm run build:web`, affected desktop/mobile flow |
| Cross-stack | `npm run check`, both builds, complete user-flow smoke test |
| Auth/session | Login, refresh, retry, current logout, logout-all, expired/revoked cases |
| Data relation/counter | Create, duplicate, delete, failure rollback, authoritative-record check |
| UI Consistency | Desktop/tablet/mobile comparison plus overflow and modal checks |
| Future socket/worker | Contract, reconnect/retry, idempotency, multi-instance, durable recovery |

A bug is closed only when:

- [ ] The original reproduction no longer fails.
- [ ] The owning invariant is preserved at the correct layer.
- [ ] Adjacent caches, counters, relations, and responsive states are checked.
- [ ] Typechecks/builds relevant to the change pass.
- [ ] No conflict markers, temporary logs, generated screenshots, or unrelated changes remain.
- [ ] `docs.md`, this guide, architecture status, or an ADR is updated when the fix changes a durable rule or debugging procedure.

## 15. Bug And Incident Note Template

```md
# Short problem title

Status: Investigating | Fixed | Monitoring
Environment:
Branch/commit:
Owner:

## Impact

Which users and flows were affected?

## Reproduction

What exact safe steps reproduce it?

## Evidence

What response, log, state, or screenshot identifies the first failing layer?

## Root Cause

Which invariant or boundary failed, and why?

## Fix

What changed at the owning layer?

## Verification

Which commands, cases, viewports, and failure paths passed?

## Follow-Up

What test, alert, reconciliation, or architecture change prevents recurrence?
```

## 16. Maintenance Rule

Update this guide whenever a new runtime, provider, high-risk domain invariant, verification command, or recurring failure mode is introduced. Feature-specific implementation detail should remain near the owning module; this document owns the cross-system debugging path.

