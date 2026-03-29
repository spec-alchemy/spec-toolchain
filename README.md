# Spec Toolchain

Spec Toolchain is the `spec-alchemy` maintainer monorepo. It extracts durable modeling, analysis, generation, and projection capabilities for AI-readable specs without embedding product-specific assets in this repository.

Chinese documentation: [README.zh-CN.md](./README.zh-CN.md)

## Public Package

The current public package is [`@spec-alchemy/ddd-spec`](./packages/ddd-spec-cli/README.md), a zero-config CLI and packaged viewer for DDD modeling.

- Default workspace: `domain-model/`
- Default entry: `domain-model/index.yaml`
- Default generated output: `.ddd-spec/`
- Supported Node.js: `>=18`

Install it in your project with:

```sh
npm install --save-dev @spec-alchemy/ddd-spec
```

## Quick Start

For a normal consumer workspace, use the zero-config path:

```sh
npm install --save-dev @spec-alchemy/ddd-spec
npm exec ddd-spec init
npm exec ddd-spec editor setup
npm exec ddd-spec dev
```

For explicit one-shot commands:

```sh
npm exec ddd-spec validate
npm exec ddd-spec build
npm exec ddd-spec serve -- --port 4173
```

The recommended viewer walkthrough is:

1. `Context Map`
2. `Scenario Story`
3. `Message Flow / Trace`
4. `Lifecycle`

`Policy / Saga` remains available as a secondary view when the primary path is no longer enough.

## Repository Scope

This repository is a maintainer workspace, not a consumer project template.

- [`packages/ddd-spec-cli/`](./packages/ddd-spec-cli/) is the only public npm package boundary.
- [`apps/ddd-spec-viewer/`](./apps/ddd-spec-viewer/) contains the private viewer source.
- [`examples/`](./examples/) contains repo-local dogfood inputs used for regression coverage and maintainer workflows.
- Reusable modeling logic belongs in [`packages/ddd-spec-core/`](./packages/ddd-spec-core/).

Spec Alchemy develops general-purpose spec infrastructure. Business-specific implementation belongs in separate consumer repositories rather than inside this monorepo.

## Maintainer Commands

| Task | Command |
|------|---------|
| Validate repo example flow | `npm run repo:validate` |
| Build repo example outputs | `npm run repo:build` |
| Launch packaged viewer example flow | `npm run repo:viewer` |
| Run package regressions | `npm run pkg:test` |
| Verify packaged CLI + viewer workspace | `npm run verify` |
| Run viewer Vite dev server | `npm run dev --workspace=apps/ddd-spec-viewer` |
| Build viewer workspace | `npm run build --workspace=apps/ddd-spec-viewer` |

## Repository Layout

- [`packages/ddd-spec-core/`](./packages/ddd-spec-core/): model loading, schema validation, semantic validation, and analysis
- [`packages/ddd-spec-cli/`](./packages/ddd-spec-cli/): public CLI package, config loading, build orchestration, and packaged viewer serving
- [`packages/ddd-spec-projection-viewer/`](./packages/ddd-spec-projection-viewer/): viewer projection implementation
- [`packages/ddd-spec-projection-typescript/`](./packages/ddd-spec-projection-typescript/): TypeScript projection implementation
- [`packages/ddd-spec-viewer-contract/`](./packages/ddd-spec-viewer-contract/): shared viewer contract types
- [`apps/ddd-spec-viewer/`](./apps/ddd-spec-viewer/): private React viewer source
- [`examples/`](./examples/): maintained repo-local examples

## Contributing And Security

- Contribution guide: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Code of conduct: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- Security reporting: [SECURITY.md](./SECURITY.md)
- Release process: [`.changeset/README.md`](./.changeset/README.md)
