# DDD Spec vNext Modeling Workbench Monorepo

`@knowledge-alchemy/ddd-spec` currently ships a DDD modeling workbench: a zero-config CLI plus a packaged viewer that take teams from `Context Map` to `Scenario Story` to `Message Flow / Trace` to `Lifecycle`.

In a consumer workspace, the default path is `ddd-spec/canonical-vnext/`: define the model, validate and build into `.ddd-spec/`, then open the local viewer to inspect the same four primary views. This repository is the private maintainer monorepo for that toolchain; the installed-package workflow below is the path ordinary users should follow in their own projects.

## Consumer Quick Start

Start here if you want to use `@knowledge-alchemy/ddd-spec` inside your own project. The package requires Node `>=18`.

Install the package into your workspace:

```sh
npm install --save-dev @knowledge-alchemy/ddd-spec
```

Initialize the default vNext starter:

```sh
npm exec ddd-spec init
```

That creates a modeling tree under `ddd-spec/canonical-vnext/`:

```text
ddd-spec/canonical-vnext/
  index.yaml
  contexts/
  actors/
  systems/
  scenarios/
  messages/
  aggregates/
  policies/
```

The standard day-to-day workflow is:

```sh
# edit ddd-spec/canonical-vnext/
npm exec ddd-spec dev
```

If you want the explicit step-by-step flow instead of the watch loop:

```sh
npm exec ddd-spec validate
npm exec ddd-spec build
npm exec ddd-spec viewer -- --port 4173
```

## What You Model

The vNext model lives in `ddd-spec/canonical-vnext/`:

- `index.yaml`: the canonical entry point that wires the vNext collections together
- `contexts/`: bounded contexts and their relationships
- `actors/`: people or roles that trigger business behavior
- `systems/`: external systems that participate in flows
- `scenarios/`: ordered business stories and step sequences
- `messages/`: commands, events, and queries that connect the story
- `aggregates/`: lifecycle-bearing boundaries inside a context
- `policies/`: explicit coordination rules for follow-up behavior

The default authoring order is the same one taught by the product:

1. define context boundaries, actors, and systems
2. model one core scenario story
3. attach the message flow to that scenario
4. add lifecycle detail only where state complexity is real

## What You See

The packaged viewer default surface is the four primary views:

- `Context Map`
- `Scenario Story`
- `Message Flow / Trace`
- `Lifecycle`

The viewer also keeps two secondary expansions available when needed:

- `Aggregate Boundary / Domain Structure`
- `Policy / Saga`

If you want concrete examples before starting from scratch, inspect:

- [`examples/vnext-minimal/canonical-vnext/index.yaml`](./examples/vnext-minimal/canonical-vnext/index.yaml): the smallest repo-owned vNext example and the closest match to `ddd-spec init`
- [`examples/vnext-cross-context/README.md`](./examples/vnext-cross-context/README.md): a fuller cross-context example that walks all four primary views end to end

## Init To Viewer Demo

For the normal installed-package demo, the product path remains:

```sh
npm install --save-dev @knowledge-alchemy/ddd-spec
npm exec ddd-spec init
npm exec ddd-spec dev
```

For a repo-local demonstration against the tracked vNext example, use the root maintainer scripts:

```sh
npm run repo:validate
npm run repo:build
npm run repo:viewer -- --port 4173
```

These commands resolve through [`apps/ddd-spec-viewer/ddd-spec.config.yaml`](./apps/ddd-spec-viewer/ddd-spec.config.yaml), which now points at the tracked [`examples/vnext-cross-context/`](./examples/vnext-cross-context/) canonical-vNext input while still syncing the app fallback asset into [`apps/ddd-spec-viewer/public/generated/viewer-spec.json`](./apps/ddd-spec-viewer/public/generated/viewer-spec.json).

## What You Get

`npm exec ddd-spec build` writes the default generated outputs into `.ddd-spec/`:

- `.ddd-spec/artifacts/business-spec.json`: bundled canonical spec
- `.ddd-spec/artifacts/business-spec.analysis.json`: analysis output and diagnostics
- `.ddd-spec/artifacts/viewer-spec.json`: viewer projection consumed by the packaged viewer
- `.ddd-spec/generated/business-spec.generated.ts`: generated TypeScript source when TypeScript projection is enabled

On the default vNext path, the viewer artifact is the main generated product surface. TypeScript projection is not part of the zero-config vNext starter yet, so `.ddd-spec/generated/business-spec.generated.ts` is intentionally absent for now.

`npm exec ddd-spec dev` runs the initial validation/build, opens the packaged viewer automatically by default, and keeps rebuilding when canonical files change.

`npm exec ddd-spec viewer` rebuilds the workspace viewer artifact if needed and then serves the packaged viewer at `http://localhost:4173/` by default when you want the explicit one-shot flow instead.

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
- [`packages/ddd-spec-cli/`](./packages/ddd-spec-cli/) is the single public npm package boundary, published under the current package name `@knowledge-alchemy/ddd-spec`.
- The schema version reset and viewer spec version reset belong to product contract evolution, not npm package naming. This reset does not rename `@knowledge-alchemy/ddd-spec` or the `ddd-spec` CLI, and it does not imply a package semver reset.
- The consumer README for installed-package usage lives at [`packages/ddd-spec-cli/README.md`](./packages/ddd-spec-cli/README.md).
- [`apps/ddd-spec-viewer/`](./apps/ddd-spec-viewer/) remains private source. The shipped viewer is the static bundle emitted into `packages/ddd-spec-cli/dist/ddd-spec-cli/static/viewer/` during package build.
- [`examples/`](./examples/) and [`docs/ddd-spec/`](./docs/ddd-spec/) are repo-only maintainer example and design materials. They do not ship in the published tarball.
- All other workspace packages remain private implementation units behind the CLI package boundary.

## Maintainer Workflow

| Task | Command |
|------|---------|
| Validate repo-local vNext example flow | `npm run repo:validate` |
| Build repo-local vNext example outputs | `npm run repo:build` |
| Run package regressions | `npm run pkg:test` |
| Verify packaged CLI and viewer workspace | `npm run verify` |
| Launch packaged viewer against the tracked repo example | `npm run repo:viewer` |
| Run the viewer Vite dev server | `npm run dev --workspace=apps/ddd-spec-viewer` |
| Build the viewer workspace only | `npm run build --workspace=apps/ddd-spec-viewer` |

The root `repo:*` scripts target [`apps/ddd-spec-viewer/ddd-spec.config.yaml`](./apps/ddd-spec-viewer/ddd-spec.config.yaml). That repo-local config builds the tracked [`examples/vnext-cross-context/`](./examples/vnext-cross-context/) input into `./.ddd-spec/` and syncs the internal app fallback asset into [`apps/ddd-spec-viewer/public/generated/viewer-spec.json`](./apps/ddd-spec-viewer/public/generated/viewer-spec.json).
These root scripts are maintainer workflows for repo-local example validation and regression around the public package boundary, not consumer install instructions. `npm run pkg:test` exercises the packaged CLI contract, while `npm run verify` adds the private viewer workspace build on top.

## Viewer Delivery

`npm run repo:viewer` builds the public package, regenerates the repo-local viewer artifact through the explicit config above, and then launches the packaged CLI viewer server. That server serves the bundled SPA plus the current workspace viewer output at `/generated/viewer-spec.json`, so the same frontend path works for install-mode product usage and repo-local maintainer example validation.

`npm run dev --workspace=apps/ddd-spec-viewer` stays separate on purpose. It is the private Vite development path for [`apps/ddd-spec-viewer/`](./apps/ddd-spec-viewer/), and it reads [`apps/ddd-spec-viewer/public/generated/viewer-spec.json`](./apps/ddd-spec-viewer/public/generated/viewer-spec.json) after a repo-local `npm run repo:build`.

## Release Dry Run

Use changesets at the repo root to manage versions for the single public package boundary:

1. `npm run changeset`
2. `npm run changeset:status`
3. `npm run release:dry-run`

The release toolchain still targets the existing public package boundary only: `@knowledge-alchemy/ddd-spec` and the `ddd-spec` CLI name remain unchanged for this reset. Schema version and viewer spec version resets are documented product-contract changes inside the existing package history; they do not reset npm semver and they do not imply a package rename. Any future public-package rename or split must be proposed as a separate story or PRD.

`npm run release:dry-run` is designed for a disposable checkout or the reusable
[`release-dry-run.yml`](./.github/workflows/release-dry-run.yml) workflow. It runs the normal
repo verification flow, applies `changeset version`, and then executes
`npm publish --dry-run --workspace=packages/ddd-spec-cli` without publishing anything.

The real publish handoff stays manual or CI-controlled on purpose: review the dry-run output,
commit the version and changelog files produced by `changeset version`, merge that release commit,
and then publish `packages/ddd-spec-cli` from a trusted environment with npm credentials.
See [`RELEASING.md`](./RELEASING.md) for the full maintainer checklist and workflow details.

## Near-Term Roadmap

These items are maintainer backlog, not a public product promise:

- Formalize public contract compatibility for the canonical schema, diagnostics, and viewer JSON, including a clearer deprecation and migration policy.
- Keep hardening install-mode and release-mode verification so tarball smoke, packaged viewer delivery, and release dry-runs stay trustworthy as the CLI evolves.
- Expand downstream projection and integration guidance only after the current bundle, TypeScript, and viewer outputs remain stable across more consumer workspaces.
- Evaluate viewer enhancements such as deep links, focused filtering, and relationship highlighting without breaking the current single-workspace default flow.
- Improve maintainer-facing docs around long-term package boundaries, extension points, and what remains intentionally private inside the monorepo.

## Repository Layout

- [`packages/ddd-spec-core/`](./packages/ddd-spec-core/): canonical loading, schema validation, semantic validation, graph IR, and analysis
- [`packages/ddd-spec-cli/`](./packages/ddd-spec-cli/): the single external package boundary for `@knowledge-alchemy/ddd-spec`, including CLI commands, config loading, build orchestration, and viewer launch helpers
- `packages/ddd-spec-cli/dist/ddd-spec-cli/static/viewer/`: packaged static viewer assets built from [`apps/ddd-spec-viewer/`](./apps/ddd-spec-viewer/) and shipped inside the public package output
- [`packages/ddd-spec-projection-viewer/`](./packages/ddd-spec-projection-viewer/): private viewer JSON projection implementation
- [`packages/ddd-spec-projection-typescript/`](./packages/ddd-spec-projection-typescript/): private TypeScript projection implementation
- [`packages/ddd-spec-viewer-contract/`](./packages/ddd-spec-viewer-contract/): private shared viewer contract types
- [`apps/ddd-spec-viewer/`](./apps/ddd-spec-viewer/): private React viewer source used for repo-local example validation and packaged bundle generation
- [`examples/vnext-minimal/`](./examples/vnext-minimal/): minimal repo-owned vNext example that mirrors the zero-config starter; not published
- [`examples/vnext-cross-context/`](./examples/vnext-cross-context/): full cross-context vNext example for the default four-view product story; not published
- [`docs/ddd-spec/`](./docs/ddd-spec/): tracked maintainer notes and supporting internals; not published
- [`./.ddd-spec/artifacts/`](./.ddd-spec/artifacts/): generated bundle, analysis, and viewer outputs
- [`./.ddd-spec/generated/`](./.ddd-spec/generated/): generated TypeScript outputs

## Consumer Note

Consumer usage belongs to [`packages/ddd-spec-cli/README.md`](./packages/ddd-spec-cli/README.md): start with zero-config `ddd-spec init`, model under `ddd-spec/canonical-vnext/`, and let the viewer walk through `Context Map`, `Scenario Story`, `Message Flow / Trace`, and `Lifecycle`. Use `--config <path>` only as an advanced consumer path when a workspace needs custom layout. This repo root keeps the maintainer workflow only.

## Further Reading

- [`RELEASING.md`](./RELEASING.md): maintainer release dry-run and publish handoff
- [`docs/ddd-spec/README.md`](./docs/ddd-spec/README.md): repo internals, boundaries, and supporting notes
- [`apps/ddd-spec-viewer/README.md`](./apps/ddd-spec-viewer/README.md): viewer-specific behavior and app-local development notes
