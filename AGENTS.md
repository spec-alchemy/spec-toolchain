# Agent Instructions

## Package Manager
- Use `npm`: `npm install`
- Preferred maintainer viewer entry: `npm run repo:viewer`

## Maintainer Commands
| Task | Command |
|------|---------|
| Validate repo example flow | `npm run repo:validate` |
| Build repo example outputs | `npm run repo:build` |
| Run package regressions | `npm run pkg:test` |
| Verify packaged CLI + viewer workspace | `npm run verify` |
| Launch packaged viewer example flow | `npm run repo:viewer` |
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

## Git Commit Rules
- All git commit subjects MUST follow Conventional Commits.
- Use the format `<type>(<scope>): <subject>` when a scope is helpful, or `<type>: <subject>` otherwise.
- Prefer these commit types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `build`, `ci`, `perf`, `revert`.
- Do not use vague commit subjects such as `update`, `misc`, or `cleanup` without a precise conventional type and subject.

## Key Conventions
- Root package is a private maintainer workspace; the only public npm boundary is [`packages/ddd-spec-cli/`](./packages/ddd-spec-cli/)
- Root `repo:*` scripts always target [`apps/ddd-spec-viewer/ddd-spec.config.yaml`](./apps/ddd-spec-viewer/ddd-spec.config.yaml); do not add repo-root `ddd-spec/canonical/`
- The root viewer config now targets the tracked [`examples/cross-context/`](./examples/cross-context/) `domain-model/` input; keep repo-local maintainer docs and tests aligned with that default path
- [`examples/`](./examples/) are the only maintained repo-local dogfood inputs; prefer `domain-model/` examples when adding or updating maintainer coverage
- No legacy v2 compatibility requirement: remove `canonical/`, `objects/commands/events/processes`, and related legacy tests/goldens instead of preserving them
- Do not reintroduce a repo-root [`scenarios/`](./scenarios/) tree; keep maintainer inputs under [`examples/`](./examples/) `domain-model/`
- [`apps/ddd-spec-viewer/`](./apps/ddd-spec-viewer/) is private source; the shipped viewer is the built bundle under `packages/ddd-spec-cli/dist/ddd-spec-cli/static/viewer/`
- Follow the viewer UI DOM debug contract in [`apps/ddd-spec-viewer/AGENTS.md`](./apps/ddd-spec-viewer/AGENTS.md) when editing that app.
- [`examples/`](./examples/) and [`docs/ddd-spec/`](./docs/ddd-spec/) are repo-only maintainer assets and are not published in the product tarball
- Put reusable modeling logic in [`packages/ddd-spec-core/`](./packages/ddd-spec-core/); keep the rest of `packages/*` private unless the package boundary intentionally changes
- Do not hand edit generated files under `.ddd-spec/artifacts/`, `.ddd-spec/generated/`, or `apps/ddd-spec-viewer/public/generated/`
- `.beads/` and `.ralph-tui/` are personal local tool directories in this repo context; do not add or re-track files from them.

## Viewer Detail Contract
- Treat viewer detail data as structured contract data, not prose templates.
- When adding a new viewer type or expanding inspector coverage for an existing type, prefer `ViewerDetailValue` structures that preserve semantics such as sections, lists, records, and fields instead of flattening them into display-only strings.
- If a change introduces new structured viewer detail shape, update the contract, projection, viewer renderer, and tests together so all viewer types follow the same spec boundary.
