# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- Zero-config CLI migrations work best when config loading is split into two explicit branches: convention-based defaults when no `--config` is provided, and hidden compatibility loading when a config path is supplied. Add a `cwd` override to command/config helpers so integration tests can exercise the zero-config path without mutating global process state.
- When the repository itself migrates to zero-config conventions, switch root automation to the zero-config CLI path too; keep repo-specific follow-up work like syncing viewer assets into app-local `public/` folders in a thin repo-local post-build script instead of pushing that behavior down into the shared CLI.

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
