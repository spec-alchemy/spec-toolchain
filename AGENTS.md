# Agent Instructions

## Package Manager
- Use `npm`: `npm install`
- Preferred maintainer viewer entry: `npm run repo:viewer`

## Maintainer Commands
| Task | Command |
|------|---------|
| Validate repo scenario flow | `npm run repo:validate` |
| Build repo scenario outputs | `npm run repo:build` |
| Run package regressions | `npm run pkg:test` |
| Verify packaged CLI + viewer workspace | `npm run verify` |
| Launch packaged viewer scenario flow | `npm run repo:viewer` |
| Run viewer Vite dev server | `npm run dev --workspace=apps/ddd-spec-viewer` |
| Build viewer workspace | `npm run build --workspace=apps/ddd-spec-viewer` |

## Targeted Commands
| Task | Command |
|------|---------|
| Build the public package only | `npm run build --workspace=packages/ddd-spec-cli` |
| Run the CLI regression file | `node --import tsx --test packages/ddd-spec-cli/example-regression.test.ts` |
| Build the viewer workspace directly | `npm run build --workspace=apps/ddd-spec-viewer` |

## Commit Attribution
- AI commits MUST include `Co-Authored-By: Codex <codex@openai.com>`

## Key Conventions
- Root package is a private maintainer workspace; the only public npm boundary is [`packages/ddd-spec-cli/`](./packages/ddd-spec-cli/)
- Root `repo:*` scripts always target [`apps/ddd-spec-viewer/ddd-spec.config.yaml`](./apps/ddd-spec-viewer/ddd-spec.config.yaml); do not add repo-root `ddd-spec/canonical/`
- [`apps/ddd-spec-viewer/`](./apps/ddd-spec-viewer/) is private source; the shipped viewer is the built bundle under `packages/ddd-spec-cli/dist/ddd-spec-cli/static/viewer/`
- Follow the viewer UI DOM debug contract in [`apps/ddd-spec-viewer/AGENTS.md`](./apps/ddd-spec-viewer/AGENTS.md) when editing that app.
- [`scenarios/`](./scenarios/), [`examples/`](./examples/), [`test/fixtures/`](./test/fixtures/), and [`docs/ddd-spec/`](./docs/ddd-spec/) are repo-only inputs/docs and are not published in the product tarball
- Put reusable modeling logic in [`packages/ddd-spec-core/`](./packages/ddd-spec-core/); keep the rest of `packages/*` private unless the package boundary intentionally changes
- Do not hand edit generated files under `.ddd-spec/artifacts/`, `.ddd-spec/generated/`, or `apps/ddd-spec-viewer/public/generated/`

## Viewer Detail Contract
- Treat viewer detail data as structured contract data, not prose templates.
- When adding a new viewer type or expanding inspector coverage for an existing type, prefer `ViewerDetailValue` structures that preserve semantics such as sections, lists, records, and fields instead of flattening them into display-only strings.
- If a change introduces new structured viewer detail shape, update the contract, projection, viewer renderer, and tests together so all viewer types follow the same spec boundary.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
