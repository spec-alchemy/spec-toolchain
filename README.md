# DDD Spec Workflow

This repository's standard modeling path is zero-config. Use the root `ddd-spec:*` scripts or the shared CLI defaults; do not start by writing `ddd-spec.config.yaml`.

## Standard Workflow

1. `npm run ddd-spec:init`
2. Edit [`ddd-spec/canonical/`](./ddd-spec/canonical/)
3. `npm run ddd-spec:validate`
4. `npm run ddd-spec:build`
5. `npm run ddd-spec:viewer`

If [`ddd-spec/canonical/index.yaml`](./ddd-spec/canonical/index.yaml) already exists, skip `init` and start editing the canonical files directly.

## Root Scripts

- `npm run ddd-spec:init`: scaffold a minimal starter model plus a `.gitignore` entry for `.ddd-spec/`
- `npm run ddd-spec:validate`: validate the zero-config canonical entry at `ddd-spec/canonical/index.yaml`
- `npm run ddd-spec:build`: validate the current model, generate `.ddd-spec/` outputs, and sync the static viewer input
- `npm run ddd-spec:viewer`: rebuild the canonical viewer artifact and launch the React viewer against it
- `npm run ddd-spec:test`: run the DDD spec regression suite
- `npm run ddd-spec:verify`: run the full repo quality gate, including viewer typecheck and production build

## Important Paths

- [`ddd-spec/canonical/`](./ddd-spec/canonical/): the repository-owned source of truth
- [`./.ddd-spec/artifacts/`](./.ddd-spec/artifacts/): generated bundle, analysis, and viewer outputs
- [`./.ddd-spec/generated/`](./.ddd-spec/generated/): generated TypeScript outputs
- [`apps/design-spec-viewer/`](./apps/design-spec-viewer/): the viewer app used by `npm run ddd-spec:viewer`

## Further Reading

- [`design-spec/README.md`](./design-spec/README.md): repo-local internals, schema notes, and helper scripts
- [`apps/design-spec-viewer/README.md`](./apps/design-spec-viewer/README.md): viewer-specific behavior and app-local development notes
