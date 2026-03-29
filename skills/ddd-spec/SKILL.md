---
name: ddd-spec
description: Guide consumer use of @spec-alchemy/ddd-spec and teach how to write, validate, and fix domain-model YAML correctly. Use when an AI agent needs to help a user install the package, run init/validate/generate/build/serve/watch/dev/doctor/editor setup/config print, explain the zero-config workflow, teach how to author contexts, actors, systems, scenarios, messages, aggregates, or policies, or diagnose schema, semantic, analysis, and viewer-artifact issues in a consumer workspace.
---

# DDD Spec

Guide the user as a consumer of `@spec-alchemy/ddd-spec`, not as a maintainer of this monorepo. Treat `domain-model/` as the product surface and treat the viewer as a projection layer over generated artifacts.

## Start Here

Use the zero-config consumer path by default:

1. Install `@spec-alchemy/ddd-spec`
2. Run `ddd-spec init`
3. Edit `domain-model/`
4. Prefer `ddd-spec dev` for the main loop

Use `--config <path>` only when the user explicitly needs custom entry paths, outputs, or viewer sync targets.

Read references in this order:

1. `references/product-path.md` for command selection and consumer workflow
2. `references/yaml-types.md` for file-type responsibilities and authoring guidance
3. `references/modeling-diagnostics.md` for error classification and repair flow

## Command Rules

Prefer the current command surface:

- `ddd-spec init`
- `ddd-spec validate`
- `ddd-spec validate schema`
- `ddd-spec validate semantics`
- `ddd-spec validate analysis`
- `ddd-spec generate bundle|analysis|viewer|typescript`
- `ddd-spec build`
- `ddd-spec serve`
- `ddd-spec watch`
- `ddd-spec dev`
- `ddd-spec clean`
- `ddd-spec doctor`
- `ddd-spec editor setup`
- `ddd-spec config print`

Do not recommend removed commands as the normal path. If the user mentions one, translate it:

- `viewer` -> `serve`
- `bundle` -> `generate bundle`
- `analyze` -> `generate analysis`
- `generate-viewer` -> `generate viewer`
- `generate-typescript` -> `generate typescript`

## Modeling Rules

Teach the smallest model that can validate and explain why each file exists.

Use this authoring order unless the user already has a workspace in progress:

1. `contexts`, `actors`, `systems`
2. `scenarios`
3. `messages`
4. `aggregates`
5. `policies`

Apply these defaults:

- Start from one core scenario, not a full domain inventory.
- Add `aggregate` only when lifecycle state matters.
- Add `policy` only when a triggered coordination rule is real.
- Explain responsibilities first, then fields.
- Treat passing schema as insufficient; require semantic correctness too.

## Diagnostic Rules

Classify the problem before proposing edits:

- Use `validate schema` for wrong file shape, missing required fields, invalid enums, or illegal properties.
- Use `validate semantics` for broken cross-file references, missing owners, broken scenario linkage, bad step topology, invalid lifecycle transitions, or policy coordination problems.
- Use `validate analysis` when the structure and semantics load but the analysis layer fails.
- Use `doctor` when the workspace, config, or generated viewer readiness is unclear.
- Use `build` or `generate viewer` before `serve` when viewer artifacts are missing.

When fixing a problem, always state:

1. Which layer failed: schema, semantics, analysis, or artifact readiness
2. Which YAML or config file should change first
3. Which command to rerun after the edit

## Consumer Boundary

Keep the user on the public package path. Do not redirect them into monorepo maintainer flows, repo-root `repo:*` scripts, or private viewer source code unless they explicitly ask about implementation internals.
