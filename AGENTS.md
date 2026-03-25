# Agent Instructions

## Package Manager
- Use `npm`
- Root install: `npm install`
- Preferred viewer entry: `npm run ddd-spec:viewer`

## Commands
| Task | Command |
|------|---------|
| Validate repo-local viewer fixture config | `npm run ddd-spec:validate` |
| Build repo-local viewer fixture outputs | `npm run ddd-spec:build` |
| Run spec regression tests | `npm run ddd-spec:test` |
| Verify spec pipeline and viewer build | `npm run ddd-spec:verify` |
| Start React viewer from root | `npm run ddd-spec:viewer` |
| Start viewer inside app | `npm --prefix apps/design-spec-viewer run dev` |
| Build viewer inside app | `npm --prefix apps/design-spec-viewer run build` |

## Commit Attribution
- AI commits MUST include `Co-Authored-By: Codex <codex@openai.com>`

## Structure
- `apps/design-spec-viewer/ddd-spec.config.yaml`: repo-local config used by root maintainer scripts
- `test/fixtures/connection-card-review/`: shared canonical fixture for regression tests and viewer dogfood
- `packages/ddd-spec-core/`: shared DDD spec core implementation
- `packages/ddd-spec-cli/`: shared DDD spec CLI entrypoints
- `packages/ddd-spec-viewer-contract/`: shared viewer JSON contract used by projection and app
- `packages/ddd-spec-projection-viewer/`: viewer projection generator from canonical graph IR
- `packages/ddd-spec-projection-typescript/`: TypeScript projection generator
- `.ddd-spec/artifacts/`: generated outputs; do not hand edit
- `.ddd-spec/generated/`: generated TypeScript outputs; do not hand edit
- `examples/order-payment/`: second canonical example domain for regression pressure testing
- `examples/content-moderation/`: third canonical example domain for additional cross-domain pressure testing
- `apps/design-spec-viewer/`: React viewer consuming generated `public/generated/viewer-spec.json`
- `docs/ddd-spec/`: repo internals, boundaries, and roadmap notes

## Key Conventions
- Do not add a repo-level `ddd-spec/canonical/`; this repo is the tooling monorepo, not a consumer workspace
- Put reusable modeling logic in `packages/ddd-spec-core/`, not in repo-local wrappers
- Keep shared regression domains under `test/fixtures/`
- Keep self-contained example domains under `examples/`
- Do not hand edit generated files under `.ddd-spec/artifacts/`, `.ddd-spec/generated/`, or `apps/design-spec-viewer/public/generated/`
- Root `ddd-spec:*` scripts intentionally run against `apps/design-spec-viewer/ddd-spec.config.yaml`
- If you need to exercise zero-config consumer behavior, use CLI tests or a scratch directory instead of scaffolding this repo root
- Use relative Markdown links
