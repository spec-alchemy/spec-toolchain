# Contributing to Spec Toolchain

Thanks for contributing to `spec-toolchain`.

This repository is a maintainer workspace for AI-readable spec tooling. The only public npm package
boundary is [`packages/ddd-spec-cli/`](./packages/ddd-spec-cli/), published as
`@spec-alchemy/ddd-spec`. Other workspaces support that package and are not separate public
package surfaces.

The release lanes are intentionally simple:

- `main` publishes stable releases to npm dist-tag `latest`.
- `beta` publishes prereleases to npm dist-tag `beta`.

## Before You Start

- Read [`README.md`](./README.md) for the current product and repository boundaries.
- Use Node `22` or `24` for this maintainer workspace.
- Install dependencies from the repo root with `npm ci`.
- For security issues, follow [`SECURITY.md`](./SECURITY.md) instead of opening a public report.

## Ways To Contribute

- Bug reports and feature requests for the public package or repository workflows.
- Tests, fixes, and refactors that improve the current `@spec-alchemy/ddd-spec` workflow.
- Documentation corrections when code, tests, examples, or scripts are not already a better source
  of truth.

## Development Workflow

Run these from the repository root:

```sh
npm ci
npm run verify
npm run release:dry-run
```

`npm run verify` is the baseline contribution gate. `npm run release:dry-run` is required for
changes that affect the public package release surface.

The published `@spec-alchemy/ddd-spec` package keeps its own runtime compatibility floor. The
maintainer workspace uses a higher Node baseline because the private viewer build toolchain follows
current Vite support.

## Contribution Expectations

- Keep changes aligned with the single public package boundary in
  [`packages/ddd-spec-cli/`](./packages/ddd-spec-cli/).
- Keep Markdown minimal. Prefer code, tests, examples, schemas, and scripts as the durable source
  of truth.
- If you change the public CLI workflow, package behavior, authoring rules, diagnostics, or
  examples that affect AI guidance, check whether [`skills/ddd-spec/`](./skills/ddd-spec/) needs
  an update in the same change.
- If you change domain-model contracts, schemas, resource kinds, or allowed references, update
  semantic validation and regression tests in the same change.
- Do not hand edit generated files under `.ddd-spec/artifacts/`, `.ddd-spec/generated/`, or
  `apps/ddd-spec-viewer/public/generated/`.

## Pull Requests

- Keep pull requests focused and explain the user-visible or maintainer-visible impact.
- Add or update tests when behavior changes.
- Add a Changeset when the change should affect the published `@spec-alchemy/ddd-spec`
  package version or changelog.
- Make sure the branch passes `npm run verify` and `npm run release:dry-run` before asking for
  review.
- `main` is protected on GitHub. Do not push directly to `main`; use a feature branch and merge
  through a pull request instead.
- Name feature branches with a Conventional Commit style prefix:
  `feat/`, `fix/`, `docs/`, `refactor/`, `test/`, `chore/`, `build/`, `ci/`, `perf/`, or
  `revert/`.
- Use lowercase, kebab-case topic names after the prefix, for example
  `feat/viewer-detail-contract` or `fix/release-dry-run`. Do not use `_`, `.`, or additional `/`
  segments in contributor branch names.
- Treat local verification as the contributor baseline and GitHub-required checks as the merge gate
  for `main`.

## Release Notes

This repo uses Changesets for the public package. For maintainers, the release flow is documented
in [`.changeset/README.md`](./.changeset/README.md), including the `main` stable lane and the
`beta` prerelease lane.

Routine package publication should run through GitHub Actions trusted publishing, not ad hoc local
`npm publish` commands.

## Conduct

By participating in this project, you agree to follow [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).
