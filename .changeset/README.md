# Changesets

This repo uses changesets to manage versions for the single public package boundary at
[`../packages/ddd-spec-cli/`](../packages/ddd-spec-cli/).
Private workspaces stay unversioned, so every maintainer-authored changeset should target
`@knowledge-alchemy/ddd-spec` only.

## Maintainer Flow

1. Run `npm run changeset` and select `@knowledge-alchemy/ddd-spec`.
2. Commit the generated `.changeset/*.md` file with the feature or fix.
3. Review the pending release plan with `npm run changeset:status`.
4. Run `npm run ddd-spec:release:dry-run` from a disposable checkout or
   [`../.github/workflows/release-dry-run.yml`](../.github/workflows/release-dry-run.yml)
   to apply `changeset version` and execute `npm publish --dry-run` without publishing.

For real releases, keep the dry-run green, commit the versioned files produced by
`changeset version`, and publish only from a trusted maintainer environment or CI job with npm
credentials.
