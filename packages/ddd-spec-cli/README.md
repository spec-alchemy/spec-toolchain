# `@knowledge-alchemy/ddd-spec`

`@knowledge-alchemy/ddd-spec` is the external CLI package for the DDD modeling workbench.
Zero-config is the default product path: run `ddd-spec init`, model under `domain-model/`, keep `domain-model/index.yaml` as the default entry, and let the CLI write build outputs into `.ddd-spec/`. Use `--config <path>` only when a workspace needs custom entry paths, output locations, or viewer sync targets.

Package naming and versioning stay on a separate axis from schema contracts: the current domain model schema version and viewer spec version both start at `1`, but this reset does not rename the package, does not rename the `ddd-spec` CLI command, and does not imply an npm semver reset just because schema or viewer contract versions change.

## Preferred Onboarding

Start here for a normal consumer workspace. The preferred path is `install -> init -> dev`.

```sh
npm install --save-dev @knowledge-alchemy/ddd-spec
npm exec ddd-spec init
# edit the generated starter in domain-model/
npm exec ddd-spec dev
```

`init` creates a starter under `domain-model/`, with `domain-model/index.yaml` as the default entry, plus one bounded context, one core scenario, one message flow, and one lifecycle. It also adds `.ddd-spec/` to `.gitignore` when needed.

The default zero-config build writes bundle, analysis, and viewer outputs into `.ddd-spec/`. TypeScript projection is not part of the default path yet, so the starter intentionally skips generated TypeScript output for now.

The `dev` command is the recommended iteration loop. It runs the initial validation/build, starts the packaged viewer server, opens the browser automatically by default, and keeps watching domain model inputs so edits trigger rebuilds without restarting the session. After each successful rebuild, the already-open viewer automatically reloads the current workspace viewer spec. If a rebuild fails, the terminal tells you what broke, keeps the watcher alive, and the viewer keeps showing the last successful result with an in-app warning until the next build passes.

## What `init` Teaches

The default starter is intentionally aligned to the current product story:

- `contexts/`, `actors/`, and `systems/` define the `Context Map`
- `scenarios/` defines the `Scenario Story`
- `messages/` defines the `Message Flow / Trace`
- `aggregates/` adds `Lifecycle` detail only where state complexity is real
- `policies/` remains available for secondary `Policy / Saga` expansion

The default teaching order is `boundaries -> scenario -> message flow -> lifecycle`. The package no longer treats aggregate/process modeling as the primary onboarding story.

## Default Viewer Surface

The packaged viewer default surface is the four primary product views:

- `Context Map`
- `Scenario Story`
- `Message Flow / Trace`
- `Lifecycle`

Secondary views stay available when the primary path is no longer enough:

- `Aggregate Boundary / Domain Structure`
- `Policy / Saga`

## Init To Viewer Demo

For the normal zero-config path:

```sh
npm install --save-dev @knowledge-alchemy/ddd-spec
npm exec ddd-spec init
npm exec ddd-spec dev
```

For the explicit one-shot path:

```sh
npm exec ddd-spec validate
npm exec ddd-spec build
npm exec ddd-spec viewer -- --port 4173
```

After a successful build, open the packaged viewer and walk the primary product path in this order:

1. `Context Map`
2. `Scenario Story`
3. `Message Flow / Trace`
4. `Lifecycle`

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

## Advanced `--config` Workflow

Use `--config <path>` when you want an explicit config file instead of the default `domain-model/index.yaml` and `.ddd-spec/` layout.

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
