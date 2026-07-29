# Observability

Current baseline:

- Pino application logger.
- `pino-http` request logging.
- secret redaction for authorization and cookie headers.
- shared `ObservabilityContext` type for request, job, socket, and provider logs.

Future additions:

- request ID propagation;
- user/session safe context;
- provider latency and failure logging;
- queue retry and dead-letter metrics;
- socket connection/reconnect event logs;
- dashboard-ready operational error categories.
