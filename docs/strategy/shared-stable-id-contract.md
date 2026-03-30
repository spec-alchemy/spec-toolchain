# shared `stable ID` contract

本文件冻结 US-002 的最小 `stable ID` seam，用于给多个 `spec family` 提供同一套 canonical source object identity，而不把任何 family-specific 词表抬升到 `shared kernel`。

本文档只定义第一阶段必须成立的 shared identity `contract`，不承诺 cross-family reference 解析、provenance graph、runtime migration 或新的 public package boundary。

## Minimum contract

第一阶段的 shared `stable ID` 落在 [`packages/spec-toolchain-shared-kernel/stable-identity.ts`](../../packages/spec-toolchain-shared-kernel/stable-identity.ts)：

| Field | Status | Purpose |
| --- | --- | --- |
| `family` | required | 标识 canonical object 所属的 `spec family`，例如 `ui-spec`、`frontend-spec`、`qa-spec` |
| `kind` | required | 标识 family 内部对象类别，但 shared layer 不冻结具体词表 |
| `value` | required | 标识 family 内稳定可引用的 canonical object identity |
| `versionHint` | reserved optional | 只作为未来迁移或诊断辅助位，第一阶段不能成为解析前提 |

## Boundary

- `stable ID` 只用于 canonical source objects。
- `stable ID` 不用于 artifact-local derived IDs、viewer node IDs、analysis row IDs 或一次性生成物局部标识。
- shared layer 只要求 `family + kind + value` 这一层 identity seam，不定义 scenario、view、module、coverage target 等 family-specific canonical object model。

## Why it stays family-agnostic

- `family` 只回答“这个 identity 属于哪个 `spec family`”，不回答该 family 的业务语义。
- `kind` 允许各 family 自己维护对象分类，但 shared layer 不提供通用枚举，也不把 DDD、UI、frontend、QA 的词表当成 shared taxonomy。
- `value` 只要求稳定可引用，不要求固定命名风格、路径语法或 slug 规则。

## Fit for the next candidate families

| Candidate family | How it would use the seam |
| --- | --- |
| `ui-spec` | 给 view、interaction、state、component contract 等 canonical UI objects 暴露稳定 identity，供 `frontend-spec`、`qa-spec`、`ddd-spec` 结构化引用 |
| `frontend-spec` | 给 module boundary、dependency rule、implementation `contract`、impact slice 等 canonical objects 暴露稳定 identity，避免把实现路径偶然性当成 shared key |
| `qa-spec` | 给 coverage target、assertion、gate、evidence record 等 canonical QA objects 暴露稳定 identity，支撑后续 cross-family reference 与 `traceability` |

## Review notes

- 战略一致性：本 seam 对应 [`spec-family-map.md`](./spec-family-map.md) 中的 cross-family `stable ID` 需求，只冻结 identity 锚点，不提前抽 analysis、viewer 或 execution 语义。
- package boundary 一致性：shared identity type 只落在 private maintainer package [`packages/spec-toolchain-shared-kernel/`](../../packages/spec-toolchain-shared-kernel/)；[`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/) 仍是唯一 public package boundary。
- Markdown 与术语一致性：仅使用仓库内相对 Markdown 路径，并遵循 [`terminology.md`](./terminology.md) 中的 `shared kernel`、`spec family`、`contract`、`stable ID`、canonical source object 等规定写法。
