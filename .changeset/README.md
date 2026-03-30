# Changesets

This repo uses Changesets to manage versions for the single public package boundary at
[`../packages/ddd-spec-cli/`](../packages/ddd-spec-cli/).
Private workspaces stay unversioned, so every maintainer-authored changeset should target
`@spec-alchemy/ddd-spec` only.

This repository is launching under a fresh public identity. The public package line starts at
`@spec-alchemy/ddd-spec@0.0.1`, and private workspaces remain unpublished implementation detail.

## Release Lanes

- `main` is the stable release lane and publishes to npm dist-tag `latest`.
- `beta` is the prerelease lane and publishes to npm dist-tag `beta`.
- This repo does not maintain separate long-lived `release/*` branches at this stage.
- Use Changesets prerelease mode on `beta`; keep normal stable versioning on `main`.

## Stable Maintainer Flow

1. Run `npm run changeset` and select `@spec-alchemy/ddd-spec`.
2. Commit the generated `.changeset/*.md` file with the feature or fix.
3. Review the pending release plan with `npm run check:release:status`.
4. Run `npm run gate:release` locally to confirm release readiness without publish side effects.
5. Run `npm run ops:release:dry-run` locally or via
   [`../.github/workflows/release-dry-run.yml`](../.github/workflows/release-dry-run.yml)
   to apply `changeset version` and execute `npm publish --dry-run` from the package boundary
   without mutating the checkout. If Changesets reports no pending package releases, the dry run
   exits successfully after the release-status check.
6. Merge the changeset-bearing PR to `main`.
7. Let [`../.github/workflows/release.yml`](../.github/workflows/release.yml) run on `main`:
   it runs `npm run gate:release`, then either opens or updates the release PR, or publishes an
   already versioned release and creates GitHub Releases notes from the resulting Changesets
   changelog.
8. Merge the release PR when the version/changelog diff is correct. The next `main` push triggers
   the publish path automatically.

## Beta Prerelease Flow

1. Branch from the current stable line onto `beta` when you need a prerelease train.
2. Enter Changesets prerelease mode on `beta` with `npm exec changeset pre enter beta`.
3. Merge prerelease-ready changes into `beta`, keeping their Changesets files in place.
4. Run `npm run gate:release` and `npm run ops:release:dry-run` on `beta` to verify the
   prerelease version plan and npm publish simulation against dist-tag `beta`.
5. Let [`../.github/workflows/release.yml`](../.github/workflows/release.yml) run on `beta`:
   it runs `npm run gate:release` and publishes prerelease packages with npm dist-tag `beta`.
6. When the prerelease train is ready to promote, exit prerelease mode on `beta` with
   `npm exec changeset pre exit`, then merge the finalized release back to `main` for the stable
   `latest` publish path.

## Trusted Publishing Setup

Configure npm trusted publishing for `@spec-alchemy/ddd-spec` against the exact GitHub
Actions workflow file [`release.yml`](../.github/workflows/release.yml). npm validates the
workflow filename exactly, so renaming the workflow file requires updating npm package settings.

The release workflow is intentionally split:

- `release-dry-run.yml` is verification-only and never publishes.
- `release.yml` runs `npm run gate:release` first, then performs version-PR or publish actions.
- `main` publishes stable releases to npm dist-tag `latest`.
- `beta` publishes prereleases to npm dist-tag `beta`.

`release.yml` uses GitHub Actions OIDC with `id-token: write` and publishes with
`npm publish --provenance --access public` on `main` and
`npm publish --tag beta --provenance --access public` on `beta`. Per npm's trusted publishing
guidance, provenance is generated automatically when the package is published from a public
repository via trusted publishing. If the repository is still private during prelaunch testing,
the publish can still use trusted publishing, but npm provenance attestations will not be emitted
until the repository is public.

After trusted publishing is confirmed, npm recommends enabling "Require two-factor authentication
and disallow tokens" for the package and revoking any no-longer-needed automation tokens.
