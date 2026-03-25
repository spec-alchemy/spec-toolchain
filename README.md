# DDD Spec Workflow Monorepo

`@knowledge-alchemy/ddd-spec` is an installable CLI for DDD-style business modeling. In a consumer workspace, you write YAML under `ddd-spec/canonical/`, validate the model, build generated outputs into `.ddd-spec/`, and open a local viewer to inspect the result.

This repository is also the private maintainer monorepo for that toolchain. The repo root hosts the npm workspace graph, maintainer scripts, release docs, and repo-local dogfood inputs; the installed-package workflow below is the path ordinary users should follow in their own projects.

## Consumer Quick Start

Start here if you want to use `@knowledge-alchemy/ddd-spec` inside your own project. The package requires Node `>=18`.

Install the package into your workspace:

```sh
npm install --save-dev @knowledge-alchemy/ddd-spec
```

Initialize a starter domain:

```sh
npm exec ddd-spec init
```

That creates a minimal modeling tree:

```text
ddd-spec/canonical/
  index.yaml
  objects/
  commands/
  events/
  aggregates/
  processes/
  vocabulary/
```

The standard day-to-day workflow is:

```sh
# edit ddd-spec/canonical/
npm exec ddd-spec validate
npm exec ddd-spec build
npm exec ddd-spec viewer -- --open
```

## What You Edit

The model lives in `ddd-spec/canonical/`:

- `index.yaml`: the canonical entry point that wires the domain together
- `objects/`: business entities and their fields
- `commands/`: business intents or actions
- `events/`: domain facts emitted by behavior
- `aggregates/`: state transitions, accepted commands, and emitted events
- `processes/`: cross-aggregate flow orchestration
- `vocabulary/`: viewer-facing labels and semantic descriptions

If you want concrete examples before starting from scratch, inspect:

- [`examples/order-payment/canonical/index.yaml`](./examples/order-payment/canonical/index.yaml)
- [`examples/content-moderation/canonical/index.yaml`](./examples/content-moderation/canonical/index.yaml)

## What You Get

`npm exec ddd-spec build` writes the default generated outputs into `.ddd-spec/`:

- `.ddd-spec/artifacts/business-spec.json`: bundled canonical spec
- `.ddd-spec/artifacts/business-spec.analysis.json`: analysis output and diagnostics
- `.ddd-spec/artifacts/viewer-spec.json`: viewer projection consumed by the packaged viewer
- `.ddd-spec/generated/business-spec.generated.ts`: generated TypeScript source

`npm exec ddd-spec viewer` rebuilds the workspace viewer artifact if needed and then serves the packaged viewer at `http://localhost:4173/` by default.

## Advanced Config

Zero-config is the default product path. Reach for `--config <path>` only when your workspace needs custom entry paths, output locations, or viewer sync targets.

```sh
npm exec ddd-spec validate --config ./ddd-spec.config.yaml
npm exec ddd-spec build --config ./ddd-spec.config.yaml
npm exec ddd-spec viewer --config ./ddd-spec.config.yaml -- --host 0.0.0.0
```

The published package README at [`packages/ddd-spec-cli/README.md`](./packages/ddd-spec-cli/README.md) documents the consumer command surface in more detail.

## About This Repo

The repo root stays `private: true` and should be read as maintainer infrastructure, not as the example of a normal consumer workspace.

## Package Boundary

- The repo root stays `private: true`; it is the maintainer workspace shell, not the external product package.
- [`packages/ddd-spec-cli/`](./packages/ddd-spec-cli/) is the single public npm package boundary, published under the working name `@knowledge-alchemy/ddd-spec`.
- The consumer README for installed-package usage lives at [`packages/ddd-spec-cli/README.md`](./packages/ddd-spec-cli/README.md).
- [`apps/ddd-spec-viewer/`](./apps/ddd-spec-viewer/) remains private source. The shipped viewer is the static bundle emitted into `packages/ddd-spec-cli/dist/ddd-spec-cli/static/viewer/` during package build.
- [`examples/`](./examples/), [`test/fixtures/`](./test/fixtures/), and [`docs/ddd-spec/`](./docs/ddd-spec/) are repo-only dogfood, regression, and maintainer materials. They do not ship in the published tarball.
- All other workspace packages remain private implementation units behind the CLI package boundary.

## Maintainer Workflow

| Task | Command |
|------|---------|
| Validate repo-local fixture flow | `npm run ddd-spec:validate` |
| Build repo-local fixture outputs | `npm run ddd-spec:build` |
| Run package regressions | `npm run ddd-spec:test` |
| Verify packaged CLI and viewer workspace | `npm run ddd-spec:verify` |
| Launch packaged viewer against the repo fixture | `npm run ddd-spec:viewer` |
| Run the viewer Vite dev server | `npm run dev:ddd-spec-viewer` |
| Build the viewer workspace only | `npm run build:ddd-spec-viewer` |

The root `ddd-spec:*` scripts target [`apps/ddd-spec-viewer/ddd-spec.config.yaml`](./apps/ddd-spec-viewer/ddd-spec.config.yaml). That repo-local config builds the shared [`test/fixtures/connection-card-review/`](./test/fixtures/connection-card-review/) fixture into `./.ddd-spec/` and syncs the internal app fallback asset into [`apps/ddd-spec-viewer/public/generated/viewer-spec.json`](./apps/ddd-spec-viewer/public/generated/viewer-spec.json).
These root scripts are maintainer workflows for dogfooding and regression around the public package boundary, not consumer install instructions. `npm run ddd-spec:test` exercises the packaged CLI contract, while `npm run ddd-spec:verify` adds the private viewer workspace build on top.

## Viewer Delivery

`npm run ddd-spec:viewer` builds the public package, regenerates the repo-local viewer artifact through the explicit config above, and then launches the packaged CLI viewer server. That server serves the bundled SPA plus the current workspace viewer output at `/generated/viewer-spec.json`, so the same frontend path works for install-mode product usage and repo-local maintainer dogfooding.

`npm run dev:ddd-spec-viewer` stays separate on purpose. It is the private Vite development path for [`apps/ddd-spec-viewer/`](./apps/ddd-spec-viewer/), and it reads [`apps/ddd-spec-viewer/public/generated/viewer-spec.json`](./apps/ddd-spec-viewer/public/generated/viewer-spec.json) after a repo-local `npm run ddd-spec:build`.

## Release Dry Run

Use changesets at the repo root to manage versions for the single public package boundary:

1. `npm run changeset`
2. `npm run changeset:status`
3. `npm run ddd-spec:release:dry-run`

`npm run ddd-spec:release:dry-run` is designed for a disposable checkout or the reusable
[`release-dry-run.yml`](./.github/workflows/release-dry-run.yml) workflow. It runs the normal
repo verification flow, applies `changeset version`, and then executes
`npm publish --dry-run --workspace=packages/ddd-spec-cli` without publishing anything.

The real publish handoff stays manual or CI-controlled on purpose: review the dry-run output,
commit the version and changelog files produced by `changeset version`, merge that release commit,
and then publish `packages/ddd-spec-cli` from a trusted environment with npm credentials.
See [`RELEASING.md`](./RELEASING.md) for the full maintainer checklist and workflow details.

## Repository Layout

- [`packages/ddd-spec-core/`](./packages/ddd-spec-core/): canonical loading, schema validation, semantic validation, graph IR, and analysis
- [`packages/ddd-spec-cli/`](./packages/ddd-spec-cli/): the single external package boundary for `@knowledge-alchemy/ddd-spec`, including CLI commands, config loading, build orchestration, and viewer launch helpers
- `packages/ddd-spec-cli/dist/ddd-spec-cli/static/viewer/`: packaged static viewer assets built from [`apps/ddd-spec-viewer/`](./apps/ddd-spec-viewer/) and shipped inside the public package output
- [`packages/ddd-spec-projection-viewer/`](./packages/ddd-spec-projection-viewer/): private viewer JSON projection implementation
- [`packages/ddd-spec-projection-typescript/`](./packages/ddd-spec-projection-typescript/): private TypeScript projection implementation
- [`packages/ddd-spec-viewer-contract/`](./packages/ddd-spec-viewer-contract/): private shared viewer contract types
- [`apps/ddd-spec-viewer/`](./apps/ddd-spec-viewer/): private React viewer source used for dogfooding and packaged bundle generation
- [`test/fixtures/connection-card-review/`](./test/fixtures/connection-card-review/): shared canonical fixture used by package regression tests and viewer dogfood; not published
- [`examples/order-payment/`](./examples/order-payment/): self-contained example domain for regression pressure testing; not published
- [`examples/content-moderation/`](./examples/content-moderation/): second self-contained example domain for cross-domain pressure testing; not published
- [`docs/ddd-spec/`](./docs/ddd-spec/): tracked maintainer notes and roadmap context; not published
- [`./.ddd-spec/artifacts/`](./.ddd-spec/artifacts/): generated bundle, analysis, and viewer outputs
- [`./.ddd-spec/generated/`](./.ddd-spec/generated/): generated TypeScript outputs

## Consumer Note

Consumer usage belongs to [`packages/ddd-spec-cli/README.md`](./packages/ddd-spec-cli/README.md): start with zero-config `ddd-spec init`, `ddd-spec/canonical/index.yaml`, and standard `.ddd-spec/` outputs. Use `--config <path>` only as an advanced consumer path when a workspace needs custom layout. This repo root keeps the maintainer workflow only.

## Further Reading

- [`RELEASING.md`](./RELEASING.md): maintainer release dry-run and publish handoff
- [`docs/ddd-spec/README.md`](./docs/ddd-spec/README.md): repo internals, boundaries, and roadmap notes
- [`apps/ddd-spec-viewer/README.md`](./apps/ddd-spec-viewer/README.md): viewer-specific behavior and app-local development notes
