# DDD Spec Workflow Monorepo

This repository develops the DDD spec compiler packages, the shared viewer app, and the regression fixtures that pressure-test the modeling boundary. It is not itself a zero-config consumer repo.

## Root Workflow

1. `npm run ddd-spec:validate`
2. `npm run ddd-spec:build`
3. `npm run ddd-spec:test`
4. `npm run ddd-spec:verify`
5. `npm run ddd-spec:viewer`

The root `ddd-spec:*` scripts target [`apps/design-spec-viewer/ddd-spec.config.yaml`](./apps/design-spec-viewer/ddd-spec.config.yaml). That repo-local config builds the shared [`test/fixtures/connection-card-review/`](./test/fixtures/connection-card-review/) fixture into `./.ddd-spec/` and syncs the viewer fallback asset into [`apps/design-spec-viewer/public/generated/viewer-spec.json`](./apps/design-spec-viewer/public/generated/viewer-spec.json).

## Repository Layout

- [`packages/ddd-spec-core/`](./packages/ddd-spec-core/): canonical loading, schema validation, semantic validation, graph IR, and analysis
- [`packages/ddd-spec-cli/`](./packages/ddd-spec-cli/): CLI commands, config loading, build orchestration, and viewer launch helpers
- [`packages/ddd-spec-projection-viewer/`](./packages/ddd-spec-projection-viewer/): viewer JSON projection
- [`packages/ddd-spec-projection-typescript/`](./packages/ddd-spec-projection-typescript/): TypeScript projection
- [`packages/ddd-spec-viewer-contract/`](./packages/ddd-spec-viewer-contract/): shared viewer contract types
- [`apps/design-spec-viewer/`](./apps/design-spec-viewer/): React viewer app and repo-local dogfood consumer
- [`test/fixtures/connection-card-review/`](./test/fixtures/connection-card-review/): shared canonical fixture used by package regression tests and viewer dogfood
- [`examples/order-payment/`](./examples/order-payment/): self-contained example domain for regression pressure testing
- [`examples/content-moderation/`](./examples/content-moderation/): second self-contained example domain for cross-domain pressure testing
- [`./.ddd-spec/artifacts/`](./.ddd-spec/artifacts/): generated bundle, analysis, and viewer outputs
- [`./.ddd-spec/generated/`](./.ddd-spec/generated/): generated TypeScript outputs

## Consumer Note

The CLI still supports zero-config consumer repos with `ddd-spec/canonical/index.yaml`, `ddd-spec init`, and standard `.ddd-spec/` outputs. That workflow is now exercised in CLI regression tests rather than by maintaining a business domain at this repo root.

## Further Reading

- [`docs/ddd-spec/README.md`](./docs/ddd-spec/README.md): repo internals, boundaries, and roadmap notes
- [`apps/design-spec-viewer/README.md`](./apps/design-spec-viewer/README.md): viewer-specific behavior and app-local development notes
