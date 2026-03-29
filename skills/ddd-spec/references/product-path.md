# Product Path

## Product Boundary

Guide usage through the public package `@knowledge-alchemy/ddd-spec`.

- Treat `domain-model/` as the user-owned design asset.
- Treat `.ddd-spec/` as generated output.
- Treat the viewer as a packaged consumer surface over generated viewer artifacts.
- Avoid maintainer commands from the repo root unless the user is explicitly working on the product itself.

## Default Workflow

Prefer this path for a normal consumer workspace:

```sh
npm install --save-dev @knowledge-alchemy/ddd-spec
npm exec ddd-spec init
npm exec ddd-spec dev
```

Use this explicit path when the user wants one-shot steps:

```sh
npm exec ddd-spec validate
npm exec ddd-spec build
npm exec ddd-spec serve -- --port 4173
```

## Command Selection

- `init`: scaffold the default `domain-model/` starter
- `dev`: best default loop; validate, build, watch, and serve
- `watch`: rebuild on changes without serving the viewer
- `serve`: serve an existing viewer artifact only
- `build`: validate and generate configured outputs
- `validate`: run the default validation stack
- `validate schema`: check per-file structure
- `validate semantics`: check cross-file modeling rules
- `validate analysis`: check the analysis layer
- `generate bundle`: write the canonical bundle only
- `generate analysis`: write analysis output only
- `generate viewer`: write viewer artifact only
- `generate typescript`: write TypeScript projection only
- `doctor`: inspect blocking config, input, or viewer readiness issues
- `editor setup`: configure VS Code YAML schema mappings for the workspace
- `config print`: print the resolved config

## Migration Notes

Translate old commands when users mention them:

- `ddd-spec viewer` means `ddd-spec serve`
- `ddd-spec bundle` means `ddd-spec generate bundle`
- `ddd-spec analyze` means `ddd-spec generate analysis`
- `ddd-spec generate-viewer` means `ddd-spec generate viewer`
- `ddd-spec generate-typescript` means `ddd-spec generate typescript`

## Zero-Config Defaults

- Entry: `domain-model/index.yaml`
- Input root: `domain-model/`
- Generated outputs: `.ddd-spec/`
- Default teaching order:
  1. `Context Map`
  2. `Scenario Story`
  3. `Message Flow / Trace`
  4. `Lifecycle`

Use `--config <path>` only when the user needs a non-default entry path, output path, or viewer sync target.
