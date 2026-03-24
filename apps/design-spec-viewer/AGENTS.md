# Agent Instructions

## Package Manager
- Use `npm`
- Install in app: `npm install`

## File-Scoped Commands
- No dedicated file-scoped lint or test commands are configured in this app.
- Use `npm --prefix apps/design-spec-viewer run build` for app-level typecheck and production build validation.

## Commands
| Task | Command |
|------|---------|
| Dev from repo root | `npm run ddd-spec:viewer` |
| Dev in app | `npm --prefix apps/design-spec-viewer run dev` |
| Build viewer | `npm --prefix apps/design-spec-viewer run build` |
| Preview build | `npm --prefix apps/design-spec-viewer run preview` |

## Commit Attribution
- AI commits MUST include `Co-Authored-By: Codex <codex@openai.com>`

## Key Conventions
- Treat `public/generated/viewer-spec.json` as generated input; regenerate it from the root zero-config DDD spec pipeline (`npm run ddd-spec:build`) instead of hand editing it.
- Keep repeated viewer display tokens in shared constants under `src/lib/`.
- Do not inline hex colors or other repeated presentation literals in React components; reuse `src/lib/viewer-colors.ts`.
- Reuse the shared viewer color mappings for MiniMap, legend items, and flow edge styling.
