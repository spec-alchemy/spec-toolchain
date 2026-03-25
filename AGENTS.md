# Agent Instructions

## Package Manager
- Use `npm`: `npm install`
- Preferred maintainer viewer entry: `npm run ddd-spec:viewer`

## Maintainer Commands
| Task | Command |
|------|---------|
| Validate repo fixture flow | `npm run ddd-spec:validate` |
| Build repo fixture outputs | `npm run ddd-spec:build` |
| Run package regressions | `npm run ddd-spec:test` |
| Verify packaged CLI + viewer workspace | `npm run ddd-spec:verify` |
| Launch packaged viewer dogfood flow | `npm run ddd-spec:viewer` |
| Run viewer Vite dev server | `npm run dev:ddd-spec-viewer` |
| Build viewer workspace | `npm run build:ddd-spec-viewer` |

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
- Root `ddd-spec:*` scripts always dogfood [`apps/ddd-spec-viewer/ddd-spec.config.yaml`](./apps/ddd-spec-viewer/ddd-spec.config.yaml); do not add repo-root `ddd-spec/canonical/`
- [`apps/ddd-spec-viewer/`](./apps/ddd-spec-viewer/) is private source; the shipped viewer is the built bundle under `packages/ddd-spec-cli/dist/ddd-spec-cli/static/viewer/`
- [`examples/`](./examples/), [`test/fixtures/`](./test/fixtures/), and [`docs/ddd-spec/`](./docs/ddd-spec/) are repo-only inputs/docs and are not published in the product tarball
- Put reusable modeling logic in [`packages/ddd-spec-core/`](./packages/ddd-spec-core/); keep the rest of `packages/*` private unless the package boundary intentionally changes
- Do not hand edit generated files under `.ddd-spec/artifacts/`, `.ddd-spec/generated/`, or `apps/ddd-spec-viewer/public/generated/`
