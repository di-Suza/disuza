# Contracts

This folder owns machine-readable and human-readable API contracts.

Current contract status:

- REST is the active API style.
- OpenAPI is a draft baseline, not a complete endpoint map yet.
- Runtime behavior remains the implementation source of truth until endpoint coverage is completed.

Contract rules:

- Backend request validators and frontend RTK Query types must agree with the OpenAPI contract once an endpoint is documented.
- Breaking response or payload changes require a docs/ADR update.
- Auth, cookies, pagination, error shapes, rate-limit responses, and upload constraints belong in the contract.
