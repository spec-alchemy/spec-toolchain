# Agent Instructions

## Package Manager
- Use `npm`
- Root install: `npm install`
- Preferred viewer entry: `npm run dev:design-spec-viewer`

## Commands
| Task | Command |
|------|---------|
| Build canonical outputs | `npm run build:design-spec` |
| Test projection outputs | `npm run test:ddd-spec` |
| Verify spec pipeline | `npm run verify:design-spec` |
| Start React viewer from root | `npm run dev:design-spec-viewer` |
| Start viewer inside app | `npm --prefix apps/design-spec-viewer run dev` |
| Build viewer inside app | `npm --prefix apps/design-spec-viewer run build` |

## Commit Attribution
- AI commits MUST include `Co-Authored-By: Codex <codex@openai.com>`

## Structure
- `ddd-spec.config.yaml`: repo-local DDD spec CLI config for canonical entry, outputs, and viewer sync targets
- `design-spec/canonical/`: single source of truth
- `packages/ddd-spec-core/`: shared DDD spec core implementation
- `packages/ddd-spec-cli/`: config-driven DDD spec CLI entrypoints
- `packages/ddd-spec-viewer-contract/`: shared viewer JSON contract used by projection and app
- `packages/ddd-spec-projection-viewer/`: viewer projection generator from canonical graph IR
- `packages/ddd-spec-projection-typescript/`: TypeScript projection generator
- `design-spec/tools/`: repo-local wrappers around the shared core and config-driven CLI
- `design-spec/artifacts/`: generated outputs; do not hand edit
- `design-spec/generated/`: generated TypeScript outputs; do not hand edit
- `examples/connection-card-review/`: example-specific helper layer for the current domain
- `apps/design-spec-viewer/`: React viewer consuming generated `public/generated/viewer-spec.json`

## Key Conventions
- Change business rules in `design-spec/canonical/` first
- Put reusable modeling logic in `packages/ddd-spec-core/`, not in `design-spec/tools/`
- Keep example-specific helpers in `examples/connection-card-review/`
- Do not hand edit generated files under `design-spec/artifacts/`, `design-spec/generated/`, or `apps/design-spec-viewer/public/generated/`
- Use relative Markdown links
- `design-spec/AGENTS.md` overrides this file for work inside `design-spec/`
