# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- Product-line docs under `docs/` should use a `README.md` master brief plus one normative detail doc. The master brief defines reading order, stable conclusions, and which downstream file is the implementation authority.

---

## 2026-03-27 - knowledge-alchemy-app-v2-jq7
- Implemented a formal `ddd-spec` vNext documentation entrypoint and a normative product design spec that turns the roadmap into an implementation-ready product definition.
- Captured the new core concepts, 4 primary views, 2 secondary views, default user path, modeling order, analysis IR expectations, validation scope, and package-boundary decision in one place.
- Files changed:
  - `docs/ddd-spec/README.md`
  - `docs/ddd-spec/vnext-product-design.md`
  - `.ralph-tui/progress.md`
- **Learnings:**
  - Patterns discovered
    - The repo already uses domain-specific master briefs such as `docs/prototype/README.md`; mirroring that pattern for `docs/ddd-spec/` keeps AI and human readers aligned on reading order and source-of-truth boundaries.
  - Gotchas encountered
    - `docs/README.md` already referenced `docs/ddd-spec/README.md`, but the directory did not exist yet, so the cleanest fix was to create that entrypoint instead of burying the formal spec directly at repo root.
---
