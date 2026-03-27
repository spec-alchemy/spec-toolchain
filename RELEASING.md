# Releasing `@knowledge-alchemy/ddd-spec`

This repo uses changesets to manage versions for the single public package boundary at
[`packages/ddd-spec-cli/`](./packages/ddd-spec-cli/).
Version management lives under [`.changeset/`](./.changeset/), and
[`.changeset/config.json`](./.changeset/config.json) keeps private workspace packages unversioned
and untagged so release planning only affects `@knowledge-alchemy/ddd-spec`.

The current release boundary remains unchanged during the default workspace and contract reset:
the published npm package stays `@knowledge-alchemy/ddd-spec`, the CLI name stays `ddd-spec`,
and schema/viewer version resets do not imply an npm semver reset or a public package rename.
If a future change needs to rename or split the public package, treat that as a separate story or
PRD with its own release plan.

## Maintainer Dry Run

Run the release preview from a disposable checkout or via
[`.github/workflows/release-dry-run.yml`](./.github/workflows/release-dry-run.yml):

1. `npm run changeset`
2. `npm run changeset:status`
3. `npm run release:dry-run`

`npm run release:dry-run` runs `npm run verify`, applies `changeset version`,
and then executes `npm publish --dry-run --workspace=packages/ddd-spec-cli`.
It is safe for CI and temporary worktrees because it never publishes, but it does update versioned
files in-place inside the checked-out tree.

The GitHub Actions workflow supports both `workflow_dispatch` and `workflow_call`, so maintainers
can trigger the dry run manually or compose it into a larger trusted release pipeline later.

## Real Publish Handoff

After the dry run succeeds:

1. Review the generated version and changelog changes from `changeset version`.
2. Commit the updated release files together with the consumed `.changeset/*.md` entries.
3. Merge that release commit into the trusted publish branch.
4. Run `npm publish --workspace=packages/ddd-spec-cli` from a maintainer machine or CI job with
   npm credentials.

The repo intentionally stops short of automated publish in this story; the handoff to a real
publish remains explicit and trust-gated.
