# Agent Instructions

## Package Manager
- Use `npm`: `npm install`
- Preferred maintainer viewer entry: `npm run repo:viewer`

## Maintainer Commands
| Task | Command |
|------|---------|
| Validate repo scenario flow | `npm run repo:validate` |
| Build repo scenario outputs | `npm run repo:build` |
| Run package regressions | `npm run pkg:test` |
| Verify packaged CLI + viewer workspace | `npm run verify` |
| Launch packaged viewer scenario flow | `npm run repo:viewer` |
| Run viewer Vite dev server | `npm run dev --workspace=apps/ddd-spec-viewer` |
| Build viewer workspace | `npm run build --workspace=apps/ddd-spec-viewer` |

## Targeted Commands
| Task | Command |
|------|---------|
| Build the public package only | `npm run build --workspace=packages/ddd-spec-cli` |
| Run the CLI regression file | `node --import tsx --test packages/ddd-spec-cli/example-regression.test.ts` |
| Build the viewer workspace directly | `npm run build --workspace=apps/ddd-spec-viewer` |

## Commit Attribution
- AI commits MUST include `Co-Authored-By: Codex <codex@openai.com>`

## Key Conventions
- Root package is a private maintainer workspace; the only public npm boundary is [`packages/ddd-spec-cli/`](./packages/ddd-spec-cli/)
- Root `repo:*` scripts always target [`apps/ddd-spec-viewer/ddd-spec.config.yaml`](./apps/ddd-spec-viewer/ddd-spec.config.yaml); do not add repo-root `ddd-spec/canonical/`
- [`apps/ddd-spec-viewer/`](./apps/ddd-spec-viewer/) is private source; the shipped viewer is the built bundle under `packages/ddd-spec-cli/dist/ddd-spec-cli/static/viewer/`
- [`scenarios/`](./scenarios/), [`examples/`](./examples/), [`test/fixtures/`](./test/fixtures/), and [`docs/ddd-spec/`](./docs/ddd-spec/) are repo-only inputs/docs and are not published in the product tarball
- Put reusable modeling logic in [`packages/ddd-spec-core/`](./packages/ddd-spec-core/); keep the rest of `packages/*` private unless the package boundary intentionally changes
- Do not hand edit generated files under `.ddd-spec/artifacts/`, `.ddd-spec/generated/`, or `apps/ddd-spec-viewer/public/generated/`

## Viewer Detail Contract
- Treat viewer detail data as structured contract data, not prose templates.
- When adding a new viewer type or expanding inspector coverage for an existing type, prefer `ViewerDetailValue` structures that preserve semantics such as sections, lists, records, and fields instead of flattening them into display-only strings.
- If a change introduces new structured viewer detail shape, update the contract, projection, viewer renderer, and tests together so all viewer types follow the same spec boundary.
