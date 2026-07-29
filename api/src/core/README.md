# API Core Boundary

`core` contains provider-neutral product contracts that can be reused by HTTP routes, socket handlers, and workers.

Keep this layer free from Express request objects, Mongoose models, provider SDKs, and feature UI assumptions.

Current folders:

- `http`: shared response and pagination contract types.
- `events`: durable domain event shapes for notification, socket, and worker fan-out.
- `policies`: small authorization/access decision contracts.

Feature-specific business rules still belong inside `modules/<domain>`.
