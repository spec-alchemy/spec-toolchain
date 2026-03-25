# DDD Spec Workflow Monorepo

This repository is a private maintainer monorepo for the DDD spec toolchain. The root package is only the workspace shell for `packages/*` and `apps/*`; it is not itself the external product package or a zero-config consumer repo.

## Package Boundary

- The repo root stays `private: true` and exists to host the npm workspace graph plus maintainer scripts.
- [`packages/ddd-spec-cli/`](./packages/ddd-spec-cli/) is the single external product package boundary, with the working npm package name `@knowledge-alchemy/ddd-spec`.
- The product README for published-package usage lives at [`packages/ddd-spec-cli/README.md`](./packages/ddd-spec-cli/README.md).
- All other workspace packages remain private implementation units behind that external package boundary, and the viewer app remains a private dogfood app.

## Root Workflow

1. `npm run ddd-spec:validate`
2. `npm run ddd-spec:build`
3. `npm run ddd-spec:test`
4. `npm run ddd-spec:verify`
5. `npm run ddd-spec:viewer`

The root `ddd-spec:*` scripts target [`apps/ddd-spec-viewer/ddd-spec.config.yaml`](./apps/ddd-spec-viewer/ddd-spec.config.yaml). That repo-local config builds the shared [`test/fixtures/connection-card-review/`](./test/fixtures/connection-card-review/) fixture into `./.ddd-spec/` and syncs the viewer fallback asset into [`apps/ddd-spec-viewer/public/generated/viewer-spec.json`](./apps/ddd-spec-viewer/public/generated/viewer-spec.json).

## Repository Layout

- [`packages/ddd-spec-core/`](./packages/ddd-spec-core/): canonical loading, schema validation, semantic validation, graph IR, and analysis
- [`packages/ddd-spec-cli/`](./packages/ddd-spec-cli/): the single external package boundary for `@knowledge-alchemy/ddd-spec`, including CLI commands, config loading, build orchestration, and viewer launch helpers
- `packages/ddd-spec-cli/dist/ddd-spec-cli/static/viewer/`: packaged static viewer assets built from [`apps/ddd-spec-viewer/`](./apps/ddd-spec-viewer/) and shipped inside the main package output
- [`packages/ddd-spec-projection-viewer/`](./packages/ddd-spec-projection-viewer/): private viewer JSON projection implementation
- [`packages/ddd-spec-projection-typescript/`](./packages/ddd-spec-projection-typescript/): private TypeScript projection implementation
- [`packages/ddd-spec-viewer-contract/`](./packages/ddd-spec-viewer-contract/): private shared viewer contract types
- [`apps/ddd-spec-viewer/`](./apps/ddd-spec-viewer/): React viewer app and repo-local dogfood consumer
- [`test/fixtures/connection-card-review/`](./test/fixtures/connection-card-review/): shared canonical fixture used by package regression tests and viewer dogfood
- [`examples/order-payment/`](./examples/order-payment/): self-contained example domain for regression pressure testing
- [`examples/content-moderation/`](./examples/content-moderation/): second self-contained example domain for cross-domain pressure testing
- [`./.ddd-spec/artifacts/`](./.ddd-spec/artifacts/): generated bundle, analysis, and viewer outputs
- [`./.ddd-spec/generated/`](./.ddd-spec/generated/): generated TypeScript outputs

## Consumer Note

The external package still supports zero-config consumer repos with `ddd-spec/canonical/index.yaml`, `ddd-spec init`, and standard `.ddd-spec/` outputs. That workflow is now exercised in CLI regression tests rather than by maintaining a business domain at this repo root.

## Further Reading

- [`docs/ddd-spec/README.md`](./docs/ddd-spec/README.md): repo internals, boundaries, and roadmap notes
- [`apps/ddd-spec-viewer/README.md`](./apps/ddd-spec-viewer/README.md): viewer-specific behavior and app-local development notes
