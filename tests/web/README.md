# Web Tests

Web tests live under `web/tests` and run through:

```bash
npm --prefix web test
```

The current suite focuses on helpers and behavior around chat, comments, notifications, unread counts, contribution heatmaps, collab results, and shared utilities. Future component tests should cover page hooks, modal workflows, cache updates, error states, empty states, and responsive rendering for product-consistency surfaces.

Server state belongs to RTK Query in tests just like it does in the app.
