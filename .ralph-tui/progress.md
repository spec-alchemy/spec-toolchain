# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- Product-line docs under `docs/` should use a `README.md` master brief plus one normative detail doc. The master brief defines reading order, stable conclusions, and which downstream file is the implementation authority.
- Viewer primary/secondary ordering now lives in `ViewerViewSpec.navigation`; when view sets change, update the contract, projection output order, viewer default-selection logic, and test expectations together.
- Viewer semantic vocabulary is duplicated intentionally across fixture/example `canonical/vocabulary/viewer-detail-semantics.yaml` files and `packages/ddd-spec-cli/init-templates.ts`; new semantic keys should be added to both sources in the same change.
- During the staged vNext reset, keep schema-preview inputs under `canonical-vnext/` and isolated schema assets under `packages/ddd-spec-core/schema/vnext/` so current `canonical/`-bound repo gates can keep passing until the vNext loader lands.

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

## 2026-03-27 - knowledge-alchemy-app-v2-xbm
- Reworked `packages/ddd-spec-viewer-contract/` around vNext primary views by introducing `context-map`, `scenario-story`, `message-flow`, `lifecycle`, secondary-view navigation metadata, and new node/edge kinds for context, scenario step, message, aggregate, and lifecycle state.
- Rebuilt `packages/ddd-spec-projection-viewer/` to emit the new view set from the existing business graph, removed `composition` from the default/top-level viewer output, and refreshed viewer/core/typescript goldens plus generated viewer artifacts.
- Updated the viewer app, CLI test helpers, semantic vocabulary fixtures/examples, and init template semantics so the new contract compiles, renders, and passes repo-level quality gates.
- Files changed:
  - `packages/ddd-spec-viewer-contract/index.ts`
  - `packages/ddd-spec-projection-viewer/index.ts`
  - `packages/ddd-spec-projection-viewer/viewer-semantic-help.ts`
  - `packages/ddd-spec-projection-viewer/index.test.ts`
  - `packages/ddd-spec-cli/test-support/cli-test-helpers.ts`
  - `packages/ddd-spec-cli/init-templates.ts`
  - `apps/ddd-spec-viewer/src/App.tsx`
  - `apps/ddd-spec-viewer/src/components/Legend.tsx`
  - `apps/ddd-spec-viewer/src/components/shell/ViewerHeader.tsx`
  - `apps/ddd-spec-viewer/src/lib/view-labels.ts`
  - `apps/ddd-spec-viewer/src/lib/view-layout/map-layout-to-flow.ts`
  - `apps/ddd-spec-viewer/src/lib/view-layout/project-view-graph.ts`
  - `apps/ddd-spec-viewer/src/lib/viewer-colors.ts`
  - `apps/ddd-spec-viewer/src/styles/graph.css`
  - `apps/ddd-spec-viewer/test/inspect-selection.test.ts`
  - `scenarios/connection-card-review/canonical/vocabulary/viewer-detail-semantics.yaml`
  - `test/fixtures/connection-card-review/canonical/vocabulary/viewer-detail-semantics.yaml`
  - `examples/content-moderation/canonical/vocabulary/viewer-detail-semantics.yaml`
  - `examples/order-payment/canonical/vocabulary/viewer-detail-semantics.yaml`
  - `packages/ddd-spec-core/goldens/connection-card-review.business-spec.json`
  - `packages/ddd-spec-projection-viewer/goldens/connection-card-review.viewer-spec.json`
  - `packages/ddd-spec-projection-typescript/goldens/connection-card-review.generated.ts`
  - `apps/ddd-spec-viewer/public/generated/viewer-spec.json`
  - `.ralph-tui/progress.md`
- **Learnings:**
  - Patterns discovered
    - The viewer contract is now the source of truth for default view ordering, so any vNext view-set change must move contract metadata and viewer selection logic in the same patch.
    - Semantic help is part of the viewer contract surface in practice; if a new detail key only lands in projection code, fixtures and init templates drift immediately.
  - Gotchas encountered
    - The existing canonical model still lacks first-class `context/actor/system` source data, so the new primary views need a transitional projection layer that maps current aggregate/process data into vNext semantics without reintroducing `composition` as the default story.
  - Snapshot tests span core bundle output, viewer projection, and TypeScript projection, so changing viewer semantics requires regenerating multiple checked-in goldens, not just the viewer JSON.
---

## 2026-03-27 - knowledge-alchemy-app-v2-iol
- Defined a new vNext canonical schema surface as `version: 3` under `packages/ddd-spec-core/schema/vnext/`, centered on `contexts`, `actors`, `systems`, `scenarios`, `messages`, `aggregates`, and `policies`.
- Added a minimal repo-owned vNext example under `examples/vnext-minimal/canonical-vnext/` that exercises the full top-level directory layout with one context, two actors, one external system, one scenario, five messages, one aggregate, and one policy.
- Extended `packages/ddd-spec-core/validation.test.ts` to validate the new v3 index shape, reject legacy `domain`-centered keys, and prove the minimal example passes all new schema files.
- Updated `docs/ddd-spec/README.md` and added `docs/ddd-spec/vnext-canonical-schema.md` so schema version, index shape, and directory-layout authority are explicit alongside the product-design doc.
- Files changed:
  - `packages/ddd-spec-core/schema/vnext/`
  - `examples/vnext-minimal/canonical-vnext/`
  - `packages/ddd-spec-core/validation.test.ts`
  - `docs/ddd-spec/README.md`
  - `docs/ddd-spec/vnext-canonical-schema.md`
  - `.ralph-tui/progress.md`
- **Learnings:**
  - Patterns discovered
    - Defining vNext schema resources and sample inputs ahead of the loader is viable as long as they live in an isolated `vnext/` + `canonical-vnext/` lane and are verified by dedicated schema tests.
  - Gotchas encountered
    - Ajv resolves cross-file `$ref` relative to each schema `$id`, so sibling refs inside `packages/ddd-spec-core/schema/vnext/` must use relative paths like `shared.schema.json#...` rather than repeating the `vnext/` prefix.
---
