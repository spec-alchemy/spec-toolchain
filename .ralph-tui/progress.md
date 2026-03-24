# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- Zero-config CLI migrations work best when config loading is split into two explicit branches: convention-based defaults when no `--config` is provided, and hidden compatibility loading when a config path is supplied. Add a `cwd` override to command/config helpers so integration tests can exercise the zero-config path without mutating global process state.
- When the repository itself migrates to zero-config conventions, switch root automation to the zero-config CLI path too; keep repo-specific follow-up work like syncing viewer assets into app-local `public/` folders in a thin repo-local post-build script instead of pushing that behavior down into the shared CLI.
- Bootstrap commands for strict spec toolchains should emit a one-aggregate starter model and self-validate it before returning; empty directory scaffolds do not survive schema and semantic validation once zero-config `validate` becomes the default onboarding path.
- For zero-config viewer startup, keep the shared CLI responsible for rebuilding the canonical viewer artifact and launching the existing viewer app, then inject the artifact path into the dev server as the default spec source; keep the repo-local `public/generated/` sync only for static build/preview workflows.
- When migrating public onboarding from legacy repo-specific script names to a zero-config product path, add product-shaped root aliases first, keep legacy names as thin delegating wrappers, and update README/help/UI copy to mention only the new aliases so compatibility does not keep leaking into onboarding.

---

## 2026-03-25 - US-002
- Implemented zero-config resolution in `packages/ddd-spec-cli/` so `validate` and `build` default to `ddd-spec/canonical/index.yaml`, use the package-owned schema, and write build outputs to `./.ddd-spec/artifacts/` plus `./.ddd-spec/generated/`.
- Added user-facing missing-canonical errors that point users to `ddd-spec init`, kept `--config` as a hidden compatibility path, and updated CLI help text to document the zero-config defaults instead of advertising `--config`.
- Added regression coverage for zero-config config resolution, missing-entry diagnostics, hidden help behavior, and zero-config validate/build output paths.
- Hardened repo quality-gate scripts so `npm run verify:design-spec` runs reliably in this environment by using `node --import tsx` for the build step and a local TypeScript binary for verification.
- Files changed:
  - `package.json`
  - `packages/ddd-spec-cli/commands.ts`
  - `packages/ddd-spec-cli/config.ts`
  - `packages/ddd-spec-cli/console.ts`
  - `packages/ddd-spec-cli/example-regression.test.ts`
- **Learnings:**
  - The CLI already had a clean config-loading seam, so zero-config support fit best in `loadDddSpecConfig()` rather than by adding a second command path.
  - A `cwd` injection point in `runCliCommand()` and `loadDddSpecConfig()` is enough to make zero-config integration tests deterministic without `process.chdir()` side effects.
  - The sandbox rejects the standalone `tsx` CLI IPC path, but `node --import tsx` is a behaviorally equivalent way to run the same entrypoint for repo scripts.
  - Root verification can reuse `apps/design-spec-viewer/node_modules/typescript/bin/tsc` once the viewer dependency directory is present; a directory existence probe avoids unnecessary reinstall work in already-bootstrapped environments.
---

## 2026-03-25 - US-001
- Migrated the repo-owned canonical source from `design-spec/canonical/` to `ddd-spec/canonical/`, moved repo outputs to `./.ddd-spec/`, and updated runtime imports, test fixtures, docs, and agent guidance to use the new user-facing paths.
- Switched the root `build:design-spec` workflow to the zero-config CLI path, removed the now-obsolete root `ddd-spec.config.yaml`, and added a repo-local post-build sync script so the viewer app still receives `public/generated/viewer-spec.json`.
- Reviewed the in-flight zero-config story changes and fixed the High-severity workflow gap where root automation still hardcoded `--config`, which meant the main repo path was bypassing the zero-config branch entirely.
- Files changed:
  - `.gitignore`
  - `AGENTS.md`
  - `apps/design-spec-viewer/AGENTS.md`
  - `apps/design-spec-viewer/README.md`
  - `apps/design-spec-viewer/src/App.tsx`
  - `ddd-spec/canonical/*`
  - `design-spec/AGENTS.md`
  - `design-spec/README.md`
  - `design-spec/index.ts`
  - `design-spec/tools/cli/*.ts`
  - `design-spec/tools/config.ts`
  - `design-spec/tools/sync-viewer-spec.ts`
  - `examples/connection-card-review/index.ts`
  - `package.json`
  - `packages/ddd-spec-core/test-fixtures.ts`
  - `packages/ddd-spec-projection-typescript/index.test.ts`
  - `packages/ddd-spec-projection-viewer/index.test.ts`
  - `tsconfig.json`
  - Removed `ddd-spec.config.yaml`
  - Removed `design-spec/canonical/*`
- **Learnings:**
  - Once zero-config defaults exist, leaving root scripts on `--config` is effectively a production-path fork; treat that as a migration blocker, not a documentation cleanup.
  - Repo-specific sync targets such as `apps/design-spec-viewer/public/generated/viewer-spec.json` are better handled in a small repo-local script than by teaching the shared CLI about app-specific conventions.
  - Moving the generated TypeScript output to `./.ddd-spec/generated/` requires updating any repo-local convenience modules that import the compiled spec, not just the canonical YAML location.
---

## 2026-03-25 - US-003
- Implemented `ddd-spec init` in `packages/ddd-spec-cli/` so a new repo can scaffold `ddd-spec/canonical/index.yaml`, the required canonical subdirectories, a minimal starter model, and a `.gitignore` entry for `.ddd-spec/`.
- Made init refuse to overwrite an existing canonical entry or starter scaffold file, and clean up generated scaffold files if initialization fails before completion so the command can be retried safely.
- Added regression coverage for init success, `.gitignore` creation and update behavior, duplicate ignore handling, help text exposure, and refusal to overwrite an existing canonical entry.
- Files changed:
  - `.ralph-tui/progress.md`
  - `packages/ddd-spec-cli/commands.ts`
  - `packages/ddd-spec-cli/config.ts`
  - `packages/ddd-spec-cli/console.ts`
  - `packages/ddd-spec-cli/example-regression.test.ts`
  - `packages/ddd-spec-cli/index.ts`
  - `packages/ddd-spec-cli/init.ts`
- **Learnings:**
  - The current business spec schema requires at least one object, command, event, aggregate, process, and viewer vocabulary entry, so `init` has to generate a tiny but valid model rather than empty lists or placeholder comments.
  - Self-validating the generated scaffold inside `init` keeps the bootstrap output aligned with the same zero-config `validate` path that new users will run next.
  - If initialization can fail after writing starter files, cleaning those files back up avoids trapping users in a partially scaffolded state that blocks a second `ddd-spec init`.
---

## 2026-03-25 - US-004
- Implemented `ddd-spec viewer` in `packages/ddd-spec-cli/` so the command rebuilds the current spec outputs, verifies the shared viewer app exists, installs app dependencies on demand, and launches the existing `apps/design-spec-viewer` dev server with the generated viewer artifact injected as the default spec source.
- Updated the React viewer to accept an injected default spec URL/label while preserving the existing `public/generated/viewer-spec.json` fallback for static builds and app-local dev, and switched the root `npm run dev:design-spec-viewer` automation to the new CLI path.
- Added regression coverage for the new CLI command, viewer argument passthrough, help text exposure, and zero-config artifact wiring; reran `npm run test:ddd-spec` and `npm run verify:design-spec` successfully.
- Files changed:
  - `.ralph-tui/progress.md`
  - `apps/design-spec-viewer/README.md`
  - `apps/design-spec-viewer/src/App.tsx`
  - `apps/design-spec-viewer/src/lib/load-viewer-spec.ts`
  - `apps/design-spec-viewer/src/vite-env.d.ts`
  - `apps/design-spec-viewer/vite.config.ts`
  - `design-spec/README.md`
  - `package.json`
  - `packages/ddd-spec-cli/commands.ts`
  - `packages/ddd-spec-cli/console.ts`
  - `packages/ddd-spec-cli/example-regression.test.ts`
  - `packages/ddd-spec-cli/index.ts`
  - `packages/ddd-spec-cli/viewer.ts`
- **Learnings:**
  - Injecting the viewer artifact path into Vite startup lets the shared CLI own the zero-config viewer default without forcing the shared package to manage repo-local `public/generated/` sync semantics.
  - A small launch hook seam is enough to regression-test long-running CLI commands like `viewer` without booting the real frontend process in test runs.
  - Root repo automation should delegate to the new CLI command once it exists; otherwise the zero-config viewer path splits between script glue and CLI behavior.
---

## 2026-03-25 - US-005
- Added a root [`README.md`](../README.md) and rewrote the primary repo docs to present the standard path as `init -> edit canonical -> validate -> build -> viewer`, with `ddd-spec/canonical/` as the user-owned source of truth.
- Added root `ddd-spec:*` npm scripts for `init`, `validate`, `build`, `viewer`, `test`, and `verify`, while keeping `build:design-spec`, `verify:design-spec`, and `dev:design-spec-viewer` as thin compatibility aliases.
- Updated maintainer docs, viewer docs, CLI help text, and the viewer load-failure hint to reference the new zero-config entrypoints instead of the legacy `design-spec` script names.
- Added regression coverage for the new CLI help narrative and the root package script aliases, then reran `npm run test:ddd-spec` and `npm run verify:design-spec` successfully.
- Reviewed the current story diff and found no remaining High-severity issues after the cutover.
- Files changed:
  - `.ralph-tui/progress.md`
  - `README.md`
  - `package.json`
  - `AGENTS.md`
  - `design-spec/AGENTS.md`
  - `apps/design-spec-viewer/AGENTS.md`
  - `design-spec/README.md`
  - `apps/design-spec-viewer/README.md`
  - `apps/design-spec-viewer/src/App.tsx`
  - `packages/ddd-spec-cli/console.ts`
  - `packages/ddd-spec-cli/example-regression.test.ts`
- **Learnings:**
  - If legacy npm script names must survive for compatibility, keep them as one-line wrappers and move every user-facing example to the new zero-config aliases; otherwise the old names keep reappearing in onboarding.
  - A root README is the cleanest way to move onboarding out of package-internal docs without deleting maintainers' deeper reference material.
---
