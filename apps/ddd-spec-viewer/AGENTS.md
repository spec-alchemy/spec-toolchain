# Agent Instructions

## Package Manager
- Use `npm`
- Install from repo root: `npm install`

## File-Scoped Commands
- No dedicated file-scoped lint or test commands are configured in this app.
- Use `npm run build --workspace=apps/ddd-spec-viewer` for app-level typecheck and production build validation from the repo root.

## Commands
| Task | Command |
|------|---------|
| Dev from repo root | `npm run repo:viewer` |
| Dev from repo root without rebuild pipeline | `npm run dev --workspace=apps/ddd-spec-viewer` |
| Build viewer | `npm run build --workspace=apps/ddd-spec-viewer` |
| Preview build | `npm run preview --workspace=apps/ddd-spec-viewer` |

## Commit Attribution
- AI commits MUST include `Co-Authored-By: Codex <codex@openai.com>`

## Key Conventions
- Treat `public/generated/viewer-spec.json` as generated input; regenerate it from the root repo-local example pipeline (`npm run repo:build`) instead of hand editing it.
- The root maintainer scripts read [`ddd-spec.config.yaml`](./ddd-spec.config.yaml), not a repo-root `ddd-spec/canonical/`.
- [`ddd-spec.config.yaml`](./ddd-spec.config.yaml) is the tracked repo-local cross-context example path; if the default maintainer demo changes, update this config, the root docs, and config tests together.
- Keep repeated viewer display tokens in shared constants under `src/lib/`.
- Do not inline hex colors or other repeated presentation literals in React components; reuse `src/lib/viewer-colors.ts`.
- Reuse the shared viewer color mappings for MiniMap, legend items, and flow edge styling.
- Inspector detail rendering is contract-driven: consume structured `ViewerDetailValue` data rather than parsing prose back into UI structure.
- New viewer kinds and new inspector sections should reuse the generic detail renderer path where possible; introduce new detail node kinds only when the semantics cannot be expressed by existing primitives.

## DOM Debug Contract
- Keep Chrome DevTools-readable DOM markers on viewer UI: `data-component` on component roots, `data-slot` on stable internal regions, and `data-kind` / `data-state` for domain state.
- Do not use Tailwind utility class names as the DOM debugging contract.
- Shared wrappers in `src/components/ui/` should provide generic `data-component` / `data-slot` defaults; feature components may override them with more specific names.
- Keep marker names stable and semantic; prefer component and slot names over visual descriptions.
