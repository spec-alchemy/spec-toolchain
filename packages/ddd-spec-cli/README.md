# `@knowledge-alchemy/ddd-spec`

`@knowledge-alchemy/ddd-spec` is the external CLI package for the DDD spec workflow.
Zero-config is the default product path: run `ddd-spec init`, model under `ddd-spec/canonical-vnext/`, and let the CLI write build outputs into `.ddd-spec/`. Use `--config <path>` only when a workspace needs custom entry paths, output locations, or viewer sync targets.

## Preferred Onboarding

Start here for a normal consumer workspace. The preferred path is `install -> init -> dev`.

```sh
npm install --save-dev @knowledge-alchemy/ddd-spec
npm exec ddd-spec init
# edit the generated vNext starter in ddd-spec/canonical-vnext/
npm exec ddd-spec dev
```

`init` creates a vNext starter under `ddd-spec/canonical-vnext/` with one bounded context, one core scenario, one message flow, and one lifecycle. It also adds `.ddd-spec/` to `.gitignore` when needed. That no-argument path remains the recommended first-time experience.

The default zero-config build writes bundle, analysis, and viewer outputs into `.ddd-spec/`. TypeScript projection is still version-2-only, so the vNext starter intentionally skips generated TypeScript output until that projection path lands.

The `dev` command is the recommended iteration loop. It runs the initial validation/build, starts the packaged viewer server, opens the browser automatically by default, and keeps watching canonical inputs so edits trigger rebuilds without restarting the session. After each successful rebuild, the already-open viewer automatically reloads the current workspace viewer spec. If a rebuild fails, the terminal tells you what broke, keeps the watcher alive, and the viewer keeps showing the last successful result with an in-app warning until the next build passes.

## Step-by-Step Alternative

When you want explicit one-shot commands instead of the watch loop, use this sequence:

```sh
npm exec ddd-spec validate
npm exec ddd-spec build
npm exec ddd-spec viewer -- --port 4173
```

The `viewer` command launches a local static server backed by packaged assets under `dist/ddd-spec-cli/static/viewer/`. It serves the current workspace viewer output at `/generated/viewer-spec.json`, so the same command works after `npm install`, `npm exec`, or `npx`.

## Supported Published-Package Commands

The published package supports these commands:

- `init`
- `validate`
- `bundle`
- `analyze`
- `build`
- `dev`
- `viewer`
- `generate-viewer`
- `generate-typescript`

## Advanced Init Templates

Most users should keep using plain `ddd-spec init`. Advanced users can opt into an explicit scaffold with `--template <name>` when they want a different starting shape without changing the default path.

Supported packaged templates:

- `default`: the same vNext approval starter created by `ddd-spec init`
- `minimal`: the smallest valid legacy scaffold with one object, command, event, aggregate, and process
- `order-payment`: a legacy example-style order and payment workflow

Example commands:

```sh
npm exec ddd-spec init --template default
npm exec ddd-spec init --template minimal
npm exec ddd-spec init --template order-payment
```

## Advanced `--config` Workflow

Use `--config <path>` when you want an explicit config file instead of the default `ddd-spec/canonical-vnext/index.yaml` and `.ddd-spec/` layout. `init` still defaults to zero-config, and explicit template selection is a separate advanced path for choosing packaged starter scaffolds.

```sh
npm exec ddd-spec validate --config ./ddd-spec.config.yaml
npm exec ddd-spec dev --config ./ddd-spec.config.yaml -- --no-open
npm exec ddd-spec build --config ./ddd-spec.config.yaml
npm exec ddd-spec viewer --config ./ddd-spec.config.yaml -- --host 0.0.0.0
```

## Installed Command Usage

Install the package globally if you want a direct `ddd-spec` shell command with the same zero-config defaults:

```sh
npm install -g @knowledge-alchemy/ddd-spec
ddd-spec init
ddd-spec dev
ddd-spec viewer -- --host 0.0.0.0
```

For a project-local install, use `npm exec` or `npx --no-install` after adding the package:

```sh
npm install --save-dev @knowledge-alchemy/ddd-spec
npm exec ddd-spec init
npm exec ddd-spec dev
npm exec ddd-spec build
npm exec ddd-spec build --config ./ddd-spec.config.yaml
npm exec ddd-spec viewer -- --port 4173
npx --no-install ddd-spec validate
```
