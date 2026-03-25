# `@knowledge-alchemy/ddd-spec`

`@knowledge-alchemy/ddd-spec` is the external CLI package for the DDD spec workflow.

## Supported Published-Package Commands

The published package supports these commands against either zero-config `ddd-spec/canonical/index.yaml` repos or explicit `--config` files:

- `init`
- `validate`
- `bundle`
- `analyze`
- `build`
- `generate-viewer`
- `generate-typescript`

The `viewer` command is a repo-local maintainer workflow. It expects a sibling `apps/ddd-spec-viewer/` app and is not part of the supported published-package `npx` or installed-command flow.
The package build also bundles the internal viewer static app under `dist/ddd-spec-cli/static/viewer/` so maintainer and packaging flows can ship viewer assets without depending on the repo-local Vite dev app at runtime.

## `npx` Usage

Run the package without a prior install:

```sh
npx @knowledge-alchemy/ddd-spec init
npx @knowledge-alchemy/ddd-spec validate
npx @knowledge-alchemy/ddd-spec build
```

## Installed Command Usage

Install the package globally if you want a direct `ddd-spec` shell command:

```sh
npm install -g @knowledge-alchemy/ddd-spec
ddd-spec init
ddd-spec validate
ddd-spec build
```

For a project-local install, use `npm exec` or `npx --no-install` after adding the package:

```sh
npm install --save-dev @knowledge-alchemy/ddd-spec
npm exec ddd-spec build
npx --no-install ddd-spec validate
```
