# Repository Guidelines

## Project Structure & Module Organization
This repository currently stores product-design documentation rather than application source code. Use [docs/README.md](./docs/README.md) as the top-level index. Keep prototype materials in [docs/prototype](./docs/prototype) and UML/domain modeling materials in [docs/uml-diagrams](./docs/uml-diagrams). The root-level `design.pen` file is the editable design artifact; update it only when the accompanying docs change with it.

## Build, Test, and Development Commands
No application build, package manager, or automated test suite is checked in here. Day-to-day work is document review:

- `rg --files docs` lists all documentation files.
- `sed -n '1,120p' docs/prototype/README.md` previews the prototype entrypoint.
- `sed -n '1,120p' docs/uml-diagrams/README.md` previews the UML index.

Before submitting changes, use your editor's Markdown preview to verify heading structure, Mermaid rendering, and relative links.

## Coding Style & Naming Conventions
Write concise Markdown with clear heading depth and short task-oriented paragraphs. Follow the existing filename pattern: lowercase kebab-case, such as `prototype-page-spec.md` or `use-case-diagram.md`. Preserve the current writing style used in the repo: Chinese explanatory text, English product terms in backticks, and relative links between related docs. Add diagrams or fenced blocks only when they clarify behavior or structure.

## Markdown Links
Use relative Markdown links in repository files, including every `AGENTS.md`. Do not use absolute filesystem paths such as `/Users/...` in Markdown links.

## Testing Guidelines
Testing in this repository is documentation QA. Check that new files are linked from the nearest README, cross-references resolve, and any Mermaid blocks still render cleanly. When modifying roadmap, page-spec, or UML content, confirm the terminology stays consistent across neighboring documents.

## Commit & Pull Request Guidelines
This checkout does not include `.git` metadata, so commit-message conventions could not be derived from local history. Until repository history is available, use short imperative messages with a scope, for example `docs: refine prototype flow interaction`. Pull requests should state which area changed (`prototype` or `uml-diagrams`), list affected files, and include screenshots when diagram layout or wireframe presentation changes.

## AI Context Tips
When sharing this repo with an agent, start from [docs/prototype/README.md](./docs/prototype/README.md) or [docs/uml-diagrams/README.md](./docs/uml-diagrams/README.md) instead of pasting the entire tree at once.
