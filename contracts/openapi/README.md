# OpenAPI Contract

`devloopfeed.yaml` is the starting REST contract.

Keep it small and correct. Add endpoints as modules are revisited instead of dumping an unverified full API description.

Before marking an endpoint complete:

- confirm route path and method from `api/src/modules`;
- confirm validators and service behavior;
- confirm success and error response shape;
- confirm frontend RTK Query request and response types;
- document auth, cookies, pagination, file upload limits, and rate-limit responses where applicable.
