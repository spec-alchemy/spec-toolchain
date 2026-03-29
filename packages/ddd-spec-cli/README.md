# `@spec-alchemy/ddd-spec`

`@spec-alchemy/ddd-spec` is the external CLI package for the DDD modeling workbench.
Zero-config is the default product path: run `ddd-spec init`, model under `domain-model/`, keep `domain-model/index.yaml` as the default entry, and let the CLI write build outputs into `.ddd-spec/`. Use `ddd-spec editor setup` when you want VS Code YAML schema integration. Use `--config <path>` only when a workspace needs custom entry paths, output locations, or viewer sync targets.

Repository and maintainer documentation live in the root [Spec Toolchain README](../../README.md). This package README is the npm-facing usage guide.

## Preferred Onboarding

Start here for a normal consumer workspace. The preferred path is `install -> init -> editor setup -> dev`.

```sh
npm install --save-dev @spec-alchemy/ddd-spec
npm exec ddd-spec init
npm exec ddd-spec editor setup
# edit the generated starter in domain-model/
npm exec ddd-spec dev
```

`init` creates a starter under `domain-model/`, with `domain-model/index.yaml` as the default entry, plus one bounded context, one core scenario, one message flow, and one lifecycle. It also adds `.ddd-spec/` to `.gitignore` when needed. `editor setup` configures VS Code YAML schema assets, settings, and extension recommendations for the workspace.

The default zero-config build writes bundle, analysis, and viewer outputs into `.ddd-spec/`. TypeScript projection is not part of the default path yet, so the starter intentionally skips generated TypeScript output for now.

The `dev` command is the recommended iteration loop. It runs the initial validation/build, starts the packaged viewer server, opens the browser automatically by default, and keeps watching domain model inputs so edits trigger rebuilds without restarting the session. After each successful rebuild, the already-open viewer automatically reloads the current workspace viewer spec. If a rebuild fails, the terminal tells you what broke, keeps the watcher alive, and the viewer keeps showing the last successful result with an in-app warning until the next build passes.

## Maturity And Compatibility

`ddd-spec` is currently `beta`.

The public `contract` currently supports `version: 1` domain models only. Within `version: 1`, additive optional fields may be introduced, but existing field meaning, reference resolution rules, and the default zero-config workflow do not change silently. Changes that add new resource kinds, change reference semantics, or break current `version: 1` meaning are treated as `contract` changes and must ship with updated validation, examples, and regression coverage.

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

- `Policy / Saga`

## Init To Viewer Demo

For the normal zero-config path:

```sh
npm install --save-dev @spec-alchemy/ddd-spec
npm exec ddd-spec init
npm exec ddd-spec editor setup
npm exec ddd-spec dev
```

For the explicit one-shot path:

```sh
npm exec ddd-spec validate
npm exec ddd-spec build
npm exec ddd-spec serve -- --port 4173
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
npm exec ddd-spec serve -- --port 4173
```

## Supported Published-Package Commands

The published package supports these commands:

- `init`
- `validate`
- `validate schema`
- `validate semantics`
- `validate analysis`
- `generate bundle`
- `generate analysis`
- `generate viewer`
- `generate typescript`
- `build`
- `serve`
- `watch`
- `dev`
- `clean`
- `doctor`
- `editor setup`
- `config print`

## Advanced `--config` Workflow

Use `--config <path>` when you want an explicit config file instead of the default `domain-model/index.yaml` and `.ddd-spec/` layout.

```sh
npm exec ddd-spec validate --config ./ddd-spec.config.yaml
npm exec ddd-spec dev --config ./ddd-spec.config.yaml -- --no-open
npm exec ddd-spec build --config ./ddd-spec.config.yaml
npm exec ddd-spec serve --config ./ddd-spec.config.yaml -- --host 0.0.0.0
```

## Installed Command Usage

Install the package globally if you want a direct `ddd-spec` shell command with the same zero-config defaults:

```sh
npm install -g @spec-alchemy/ddd-spec
ddd-spec init
ddd-spec editor setup
ddd-spec dev
ddd-spec serve -- --host 0.0.0.0
```

For a project-local install, use `npm exec` or `npx --no-install` after adding the package:

```sh
npm install --save-dev @spec-alchemy/ddd-spec
npm exec ddd-spec init
npm exec ddd-spec editor setup
npm exec ddd-spec dev
npm exec ddd-spec build
npm exec ddd-spec build --config ./ddd-spec.config.yaml
npm exec ddd-spec serve -- --port 4173
npx --no-install ddd-spec validate
```
