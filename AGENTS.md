# Agent Instructions

## Package Manager
- Use `npm`
- Root install: `npm install`
- Preferred viewer entry: `npm run dev:design-spec-viewer`

## Commands
| Task | Command |
|------|---------|
| Build canonical outputs | `npm run build:design-spec` |
| Verify spec pipeline | `npm run verify:design-spec` |
| Start React viewer from root | `npm run dev:design-spec-viewer` |
| Start viewer inside app | `npm --prefix apps/design-spec-viewer run dev` |
| Build viewer inside app | `npm --prefix apps/design-spec-viewer run build` |

## Commit Attribution
- AI commits MUST include `Co-Authored-By: Codex <codex@openai.com>`

## Structure
- `design-spec/canonical/`: single source of truth
- `design-spec/tools/`: validation, analysis, bundling, diagram, and viewer generation
- `design-spec/artifacts/`: generated outputs; do not hand edit
- `design-spec/generated/`: generated TypeScript outputs; do not hand edit
- `design-spec/state/`: TypeScript/XState projection only, not source of truth
- `apps/design-spec-viewer/`: React viewer consuming generated `public/generated/viewer-spec.json`

## Key Conventions
- Change business rules in `design-spec/canonical/` first
- Do not hand edit generated files under `design-spec/artifacts/`, `design-spec/generated/`, or `apps/design-spec-viewer/public/generated/`
- Use relative Markdown links
- `design-spec/AGENTS.md` overrides this file for work inside `design-spec/`
