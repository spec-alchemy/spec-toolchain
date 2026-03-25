# `@knowledge-alchemy/ddd-spec`

`@knowledge-alchemy/ddd-spec` is the external CLI package for the DDD spec workflow.
Zero-config is the default product path: run `ddd-spec init`, model under `ddd-spec/canonical/`, and let the CLI write build outputs into `.ddd-spec/`. Use `--config <path>` only when a workspace needs custom entry paths, output locations, or viewer sync targets.

## Supported Published-Package Commands

The published package supports these commands:

- `init`
- `validate`
- `bundle`
- `analyze`
- `build`
- `viewer`
- `generate-viewer`
- `generate-typescript`

`init` creates a teaching-oriented approval workflow under `ddd-spec/canonical/` for consumer workspaces and adds `.ddd-spec/` to `.gitignore` when needed.

The `viewer` command launches a local static server backed by packaged assets under `dist/ddd-spec-cli/static/viewer/`. It serves the current workspace viewer output at `/generated/viewer-spec.json`, so the same command works after `npm install`, `npm exec`, or `npx`.

## Zero-Config Default Workflow

Start here for a normal consumer workspace:

```sh
npx @knowledge-alchemy/ddd-spec init
# edit the generated approval workflow in ddd-spec/canonical/
npx @knowledge-alchemy/ddd-spec validate
npx @knowledge-alchemy/ddd-spec build
npx @knowledge-alchemy/ddd-spec viewer -- --port 4173
```

## Advanced `--config` Workflow

Use `--config <path>` when you want an explicit config file instead of the default `ddd-spec/canonical/index.yaml` and `.ddd-spec/` layout. `init` remains zero-config only.

```sh
npx @knowledge-alchemy/ddd-spec validate --config ./ddd-spec.config.yaml
npx @knowledge-alchemy/ddd-spec build --config ./ddd-spec.config.yaml
npx @knowledge-alchemy/ddd-spec viewer --config ./ddd-spec.config.yaml -- --host 0.0.0.0
```

## Installed Command Usage

Install the package globally if you want a direct `ddd-spec` shell command with the same zero-config defaults:

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
npm exec ddd-spec build --config ./ddd-spec.config.yaml
npm exec ddd-spec viewer -- --port 4173
npx --no-install ddd-spec validate
```
