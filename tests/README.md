# Test Strategy

This folder records where automated tests will live as the project hardens.

Current executable gates:

- `npm run check`
- `npm run build:api`
- `npm run build:web`
- `npm run verify`

Planned test layers:

- `api`: service, repository, validator, and HTTP integration tests.
- `web`: hooks, component, RTK Query cache, and modal/form tests.
- `e2e`: critical user journeys across API and web.

Priority areas:

- auth refresh/session rotation;
- ownership and block policies;
- post media ordering and cleanup;
- comments/replies/contribution reversal;
- saves/collections movement;
- reports/issues submission;
- RTK Query optimistic updates and rollback;
- dashboard/account destructive flows.

Do not claim automated coverage for a module until real tests exist and run in CI.
