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
| Run spec regression tests | `npm run test:ddd-spec` |
| Verify spec and TypeScript projection | `npm run verify:design-spec` |
| Start React viewer from root | `npm run dev:design-spec-viewer` |
| Read viewer app locally | `npm --prefix apps/design-spec-viewer run dev` |

## Commit Attribution
- AI commits MUST include `Co-Authored-By: Codex <codex@openai.com>`

## Structure
- [../ddd-spec/canonical/](../ddd-spec/canonical/): repo-owned single source of truth
- [schema/](./schema/): bundled JSON Schema validation
- [tools/](./tools/): repo-local wrappers and helper scripts around the shared core and zero-config CLI
- [../.ddd-spec/artifacts/](../.ddd-spec/artifacts/): generated JSON outputs; do not hand edit
- [../.ddd-spec/generated/](../.ddd-spec/generated/): generated TypeScript outputs; do not hand edit
- [../packages/ddd-spec-core/](../packages/ddd-spec-core/): shared DDD spec core implementation
- [../packages/ddd-spec-cli/](../packages/ddd-spec-cli/): config-driven CLI for validate/analyze/build/generate
- [../packages/ddd-spec-viewer-contract/](../packages/ddd-spec-viewer-contract/): shared viewer JSON contract for projection and app
- [../packages/ddd-spec-projection-viewer/](../packages/ddd-spec-projection-viewer/): viewer projection generator
- [../packages/ddd-spec-projection-typescript/](../packages/ddd-spec-projection-typescript/): TypeScript projection generator
- [../examples/connection-card-review/](../examples/connection-card-review/): example-specific helper layer for the current domain
- [../examples/order-payment/](../examples/order-payment/): second canonical example domain for regression pressure testing
- [../examples/content-moderation/](../examples/content-moderation/): third canonical example domain for additional cross-domain pressure testing
- [../apps/design-spec-viewer/](../apps/design-spec-viewer/): React viewer consuming generated `viewer-spec.json`

## Key Conventions
- Change business truth in [../ddd-spec/canonical/](../ddd-spec/canonical/) first
- Put reusable modeling logic in [../packages/ddd-spec-core/](../packages/ddd-spec-core/), not in example-specific wrappers
- Keep `Connection/Card` style helpers under [../examples/connection-card-review/](../examples/connection-card-review/), not in the shared core
- Keep additional example domains under [../examples/](../examples/), not in the shared core
- Keep `derived-types.ts` as a convenience layer only
- Do not hand edit [../.ddd-spec/artifacts/](../.ddd-spec/artifacts/) or [../.ddd-spec/generated/](../.ddd-spec/generated/)
- Use relative Markdown links
