# Entities Layer

`entities` is reserved for reusable business objects that should outlive a single feature action.

The current codebase keeps existing feature model files in place to avoid a risky type-only rewrite. As modules are revisited, reusable domain nouns can move here first, then features can import from the entity public API.

Candidate entities:

- `user`
- `post`
- `comment`
- `notification`
- `report`
- `issue`
- `conversation`
