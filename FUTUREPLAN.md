# Future Plan

- Move production hosting to AWS with managed MongoDB-compatible storage, managed Redis, object storage, and a CDN-backed web deployment.
- Split API, worker, and realtime processes so chat, notifications, cleanup jobs, and code execution can scale independently.
- Add full CI coverage with API integration tests, frontend component tests, E2E smoke tests, Docker image builds, and deployment checks.
- Add observability with structured logs, metrics, alerts, and request tracing before running paid production traffic.
- Harden media delivery with private object storage, signed URLs, lifecycle cleanup, and malware/type scanning for uploaded files.
- Replace the demo/public code-execution runner with a paid or self-hosted Piston-compatible sandbox so collaborative room code runs are reliable, isolated, monitored, and rate-limited for production use.
- Upgrade AI problem generation with paid Gemini quota, judge-backed test validation, moderation/review workflows, prompt abuse monitoring, duplicate detection, and admin controls before treating generated challenges as production-grade.

## Future Frontend Optimization

The current frontend already includes the practical optimization pass that was safe for the existing UX: route lazy loading, targeted memoization, unread count endpoints, home feed virtualization, optimized image rendering, and modal handler stabilization. The items below were intentionally deferred because they need profiler data, broader regression testing, or deeper UX validation before changing production behavior.

- Run a component-by-component React Profiler audit before adding more `React.memo`, `useMemo`, and `useCallback` usage, so memoization is applied only where it reduces real render cost.
- Evaluate virtualization for comments, messages, notifications, saved collections, and analytics lists after confirming it does not break scroll position, modals, keyboard navigation, or realtime updates.
- Consider a shared image caching strategy, CDN transformations, or service-worker-assisted caching for avatars and repeated media after storage/CDN choices are finalized.
- Add selective route/data prefetching for high-confidence navigation paths while avoiding extra API pressure on free-tier deployments.
- Explore stricter CSS containment and content-visibility rules on feed/profile/dashboard sections only after visual regression coverage is strong enough to catch layout changes.
- Revisit socket-driven dashboard, message, and notification state updates with profiler traces before doing deeper state rewiring.
- Add automated visual regression checks for modal portals, responsive layouts, feed cards, and media previews before any larger layout optimization pass.
