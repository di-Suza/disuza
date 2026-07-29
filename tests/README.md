# Test Strategy

This folder documents the automated test strategy. The executable test files currently live inside the package folders (`api/tests` and `web/tests`) so each package can compile and run its own test build cleanly.

Current executable gates:

- `npm run check`
- `npm run test`
- `npm run build:api`
- `npm run build:web`
- `npm run verify`

Current test layers:

- `api`: validators, services, controllers, routes, middleware, repositories, realtime handlers, and model schema behavior through fakes/mocks where external systems would otherwise be required.
- `web`: helper, hook-adjacent, RTK Query/cache, notification, chat, comment, collab-result, and heatmap logic tests.

Planned expansion:

- `e2e`: critical user journeys across API and web.
- visual regression checks for modal portals, responsive layouts, feed cards, media previews, and room surfaces.
- contract validation once OpenAPI coverage is complete.

Priority areas:

- auth refresh/session rotation;
- ownership and block policies;
- post media ordering and cleanup;
- comments/replies/contribution reversal;
- saves/collections movement;
- reports/issues submission;
- RTK Query optimistic updates and rollback;
- dashboard/account destructive flows.

Do not claim coverage percentage from this suite unless a real coverage tool is added. Current resume-safe wording should use test count/pass rate from `metrics.md`, not line or branch coverage.
