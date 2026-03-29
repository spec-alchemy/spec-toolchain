# Changesets

This repo uses Changesets to manage versions for the single public package boundary at
[`../packages/ddd-spec-cli/`](../packages/ddd-spec-cli/).
Private workspaces stay unversioned, so every maintainer-authored changeset should target
`@knowledge-alchemy/ddd-spec` only.

Schema version resets and viewer spec version resets are product-contract changes inside that
existing public package history. They do not rename `@knowledge-alchemy/ddd-spec`, they do not
rename the `ddd-spec` CLI, and they do not imply an npm semver reset. Any future public-package
rename or split needs a separate story or PRD plus dedicated release planning.

## Maintainer Flow

1. Run `npm run changeset` and select `@knowledge-alchemy/ddd-spec`.
2. Commit the generated `.changeset/*.md` file with the feature or fix.
3. Review the pending release plan with `npm run changeset:status`.
4. Run `npm run release:dry-run` locally or via
   [`../.github/workflows/release-dry-run.yml`](../.github/workflows/release-dry-run.yml)
   to re-run `npm run verify`, apply `changeset version`, and execute
   `npm publish --dry-run` from the package boundary without mutating the checkout.
5. Merge the changeset-bearing PR to `main`.
6. Let [`../.github/workflows/release.yml`](../.github/workflows/release.yml) run on `main`:
   it verifies the repo, then either opens or updates the release PR, or publishes an already
   versioned release and creates GitHub Releases notes from the resulting Changesets changelog.
7. Merge the release PR when the version/changelog diff is correct. The next `main` push triggers
   the publish path automatically.

## Trusted Publishing Setup

Configure npm trusted publishing for `@knowledge-alchemy/ddd-spec` against the exact GitHub
Actions workflow file [`release.yml`](../.github/workflows/release.yml). npm validates the
workflow filename exactly, so renaming the workflow file requires updating npm package settings.

The release workflow is intentionally split:

- `release-dry-run.yml` is verification-only and never publishes.
- `release.yml` runs `npm run verify` first, then performs version-PR or publish actions.

`release.yml` uses GitHub Actions OIDC with `id-token: write` and publishes with
`npm publish --provenance --access public`. Per npm's trusted publishing guidance, provenance is
generated automatically when the package is published from a public repository via trusted
publishing. If the repository is still private during prelaunch testing, the publish can still use
trusted publishing, but npm provenance attestations will not be emitted until the repository is
public.

After trusted publishing is confirmed, npm recommends enabling "Require two-factor authentication
and disallow tokens" for the package and revoking any no-longer-needed automation tokens.
