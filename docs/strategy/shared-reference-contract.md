# shared reference contract

本文件冻结 US-003 的最小 cross-family reference seam，用于让一个 `spec family` 结构化指向另一个 family 的 canonical source object，同时保持 `shared kernel` 只定义连接协议，不定义 family-specific 业务语义。

本文档只定义第一阶段必须成立的 shared reference `contract`，不承诺正式解析器、family runtime 接入、完整 provenance graph 或新的 public package boundary。

## Minimum contract

第一阶段的 shared reference 落在 [`packages/spec-toolchain-shared-kernel/reference.ts`](../../packages/spec-toolchain-shared-kernel/reference.ts)：

| Field | Status | Purpose |
| --- | --- | --- |
| `target` | required | 解析字段，承载被引用 canonical object 的 shared identity，复用 [`SharedStableId`](../../packages/spec-toolchain-shared-kernel/stable-identity.ts) |
| `path` | optional diagnostic hint | 辅助定位字段，用于给 validator、review 或迁移提示提供可读 locator；第一阶段不能成为解析成功前提 |

## Resolver fields vs diagnostic hints

- 解析字段只有 `target.family`、`target.kind`、`target.value`。
- `target.versionHint` 只作为可选迁移或诊断辅助位，不能成为解析前提。
- `path` 只作为可选 locator hint，帮助人或 agent 更快定位引用意图；它不定义 shared path grammar，也不参与 canonical identity 解析。

## Boundary

- 该 shape 只表达“一个 canonical source object 指向另一个 canonical source object”的最小 shared seam。
- 该 shape 不定义 family-specific canonical object model、引用生命周期、ownership rule、路径语法或版本协商机制。
- diagnostics、provenance 或 future validator surfaces 可以复用这条 seam，但不能借此把 DDD、UI、frontend、QA 的对象词表提升到 `shared kernel`。

## Fit for the next candidate families

| Candidate family | How it would use the seam |
| --- | --- |
| `ui-spec` | 用 interaction、state 或 component contract 结构化引用 `frontend-spec` 实现边界、`qa-spec` coverage target 或 `ddd-spec` canonical objects，而不依赖 prose 备注 |
| `frontend-spec` | 用 implementation `contract`、dependency rule 或 impact slice 结构化引用 `ui-spec` view contract、`ddd-spec` business source 或 `qa-spec` gate target |
| `qa-spec` | 用 coverage target、assertion 或 evidence record 结构化引用 `ui-spec`、`frontend-spec`、`ddd-spec` 的 canonical objects，作为后续 provenance / `traceability` 的连接锚点 |

## Review notes

- 战略一致性：本 seam 对应 [`spec-family-map.md`](./spec-family-map.md) 中的 cross-family 引用需求，只冻结最薄连接协议，不提前抽 family rule taxonomy、analysis summary 或 execution surface。
- package boundary 一致性：shared reference type 只落在 private maintainer package [`packages/spec-toolchain-shared-kernel/`](../../packages/spec-toolchain-shared-kernel/)；[`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/) 仍是唯一 public package boundary。
- Markdown 与术语一致性：仅使用仓库内相对 Markdown 路径，并遵循 [`terminology.md`](./terminology.md) 中的 `shared kernel`、`spec family`、`contract`、`stable ID`、canonical source object 等规定写法。
