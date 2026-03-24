# Design-Spec Agent Instructions

## Package Manager
- Use `npm`
- Build canonical outputs: `npm run build:design-spec`
- Verify canonical pipeline: `npm run verify:design-spec`
- Start viewer from repo root: `npm run dev:design-spec-viewer`

## Commands
| Task | Command |
|------|---------|
| Build spec outputs | `npm run build:design-spec` |
| Verify spec and TypeScript projection | `npm run verify:design-spec` |
| Start React viewer from root | `npm run dev:design-spec-viewer` |
| Read viewer app locally | `npm --prefix apps/design-spec-viewer run dev` |

## Commit Attribution
- AI commits MUST include `Co-Authored-By: Codex <codex@openai.com>`

## Structure
- [canonical/](./canonical/): single source of truth
- [schema/](./schema/): bundled JSON Schema validation
- [tools/](./tools/): current example domain wrappers around the shared core and repo config
- [artifacts/](./artifacts/): generated JSON and Mermaid outputs; do not hand edit
- [generated/](./generated/): generated TypeScript outputs; do not hand edit
- [state/](./state/): TypeScript/XState projection only, not source of truth
- [../packages/ddd-spec-core/](../packages/ddd-spec-core/): shared DDD spec core implementation
- [../packages/ddd-spec-cli/](../packages/ddd-spec-cli/): config-driven CLI for validate/analyze/build/generate
- [../ddd-spec.config.yaml](../ddd-spec.config.yaml): repo-local config wiring this example domain into the generic CLI
- [../examples/connection-card-review/](../examples/connection-card-review/): example-specific helper layer for the current domain
- [../apps/design-spec-viewer/](../apps/design-spec-viewer/): React viewer consuming generated `viewer-spec.json`

## Key Conventions
- Change business truth in [canonical/](./canonical/) first
- Put reusable modeling logic in [../packages/ddd-spec-core/](../packages/ddd-spec-core/), not in example-specific wrappers
- Keep `Connection/Card` style helpers under [../examples/connection-card-review/](../examples/connection-card-review/), not in the shared core
- Keep `state/` aligned to canonical; do not invent rules there
- Keep `derived-types.ts` as a convenience layer only
- Do not hand edit [artifacts/](./artifacts/) or [generated/](./generated/)
- Use relative Markdown links
