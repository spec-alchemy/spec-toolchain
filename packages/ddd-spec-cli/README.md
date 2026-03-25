# `@knowledge-alchemy/ddd-spec`

`@knowledge-alchemy/ddd-spec` is the external CLI package for the DDD spec workflow.

## Supported Published-Package Commands

The published package supports these commands against either zero-config `ddd-spec/canonical/index.yaml` repos or explicit `--config` files:

- `init`
- `validate`
- `bundle`
- `analyze`
- `build`
- `viewer`
- `generate-viewer`
- `generate-typescript`

The `viewer` command launches a local static server backed by packaged assets under `dist/ddd-spec-cli/static/viewer/`. It serves the current workspace viewer output at `/generated/viewer-spec.json`, so the same command works after `npm install`, `npm exec`, or `npx`.

## `npx` Usage

Run the package without a prior install:

```sh
npx @knowledge-alchemy/ddd-spec init
npx @knowledge-alchemy/ddd-spec validate
npx @knowledge-alchemy/ddd-spec build
npx @knowledge-alchemy/ddd-spec viewer -- --port 4173
```

## Installed Command Usage

Install the package globally if you want a direct `ddd-spec` shell command:

```sh
npm install -g @knowledge-alchemy/ddd-spec
ddd-spec init
ddd-spec validate
ddd-spec build
ddd-spec viewer -- --host 0.0.0.0
```

For a project-local install, use `npm exec` or `npx --no-install` after adding the package:

```sh
npm install --save-dev @knowledge-alchemy/ddd-spec
npm exec ddd-spec build
npm exec ddd-spec viewer -- --port 4173
npx --no-install ddd-spec validate
```
