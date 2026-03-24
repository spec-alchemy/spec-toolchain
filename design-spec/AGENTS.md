# Design-Spec Agent Instructions

## Package Manager
- Use `npm`
- Build canonical outputs: `npm run build:design-spec`
- Verify canonical pipeline: `npm run verify:design-spec`
- Start viewer from repo root: `npm run dev:design-spec-viewer`

## Commands
| Task | Command |
|------|---------|
| Build spec outputs | `npm run build:design-spec` |
| Verify spec and TypeScript projection | `npm run verify:design-spec` |
| Start React viewer from root | `npm run dev:design-spec-viewer` |
| Read viewer app locally | `npm --prefix apps/design-spec-viewer run dev` |

## Commit Attribution
- AI commits MUST include `Co-Authored-By: Codex <codex@openai.com>`

## Structure
- [canonical/](./canonical/): single source of truth
- [schema/](./schema/): bundled JSON Schema validation
- [tools/](./tools/): YAML loading, semantic validation, graph analysis, artifact generation
- [artifacts/](./artifacts/): generated JSON and Mermaid outputs; do not hand edit
- [generated/](./generated/): generated TypeScript outputs; do not hand edit
- [state/](./state/): TypeScript/XState projection only, not source of truth
- [../apps/design-spec-viewer/](../apps/design-spec-viewer/): React viewer consuming generated `viewer-spec.json`

## Key Conventions
- Change business truth in [canonical/](./canonical/) first
- Keep `state/` aligned to canonical; do not invent rules there
- Keep `derived-types.ts` as a convenience layer only
- Do not hand edit [artifacts/](./artifacts/) or [generated/](./generated/)
- Use relative Markdown links
