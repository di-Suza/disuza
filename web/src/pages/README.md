# Pages Layer

`pages` is the route-level composition layer.

Routes should lazy-load pages from here instead of reaching directly into feature internals. A page may compose feature hooks, widgets, entities, and shared UI, while feature folders continue to own their product behavior.

Current pages intentionally wrap the already implemented feature pages so the product flow and UI remain unchanged.
