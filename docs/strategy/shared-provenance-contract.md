# shared provenance contract

本文件冻结 US-004 的最小 provenance / `traceability` seam，用于让 generated artifact 或 analysis output 能结构化追溯到多个上游 canonical source objects，同时保持 `shared kernel` 只定义连接协议，不定义 evidence chain 或 execution semantics。

本文档只定义第一阶段必须成立的 shared provenance `contract`，不承诺完整 graph API、gate result envelope、execution handoff 或新的 public package boundary。

## Minimum contract

第一阶段的 shared provenance 落在 [`packages/spec-toolchain-shared-kernel/provenance.ts`](../../packages/spec-toolchain-shared-kernel/provenance.ts)：

| Field | Status | Purpose |
| --- | --- | --- |
| `subject.artifactId` | required | 对齐 [`SharedArtifactManifestEntry.id`](../../packages/spec-toolchain-shared-kernel/artifact-manifest.ts)，指出 provenance 记录对应哪个 artifact |
| `subject.outputId` | optional | 标识 artifact 内部的 output-local object；它是 artifact-local derived identity，不是 shared `stable ID` |
| `subject.path` | optional diagnostic hint | 帮助定位 artifact 内部的 output 片段，但不定义 shared path grammar |
| `upstream` | required | 表达一个 output 至少可链接到零个或多个上游 source link；第一阶段用数组承载多源关联 |
| `upstream[].derivationKind` | required | 暴露最小关系语义，区分仅关联、派生或聚合，不扩张成完整 evidence taxonomy |
| `upstream[].source` | required | 原样复用 [`SharedReference`](../../packages/spec-toolchain-shared-kernel/reference.ts)，确保 provenance 继续锚定 canonical source objects |

## Relationship to the artifact manifest

- `artifact manifest` 负责回答“产物有哪些”。
- provenance `contract` 负责回答“某个 artifact 内的 output 由哪些 canonical source objects 关联或派生而来”。
- 第一阶段通过 `subject.artifactId` 把 provenance record 挂到 [`SharedArtifactManifest`](../../packages/spec-toolchain-shared-kernel/artifact-manifest.ts) 的 entry 上，而不是让 provenance 重新定义一套 artifact envelope。
- `subject.outputId` 明确属于 artifact-local derived identity，避免与 shared `stable ID` 混淆。

## Boundary

- 该 shape 只表达 output subject 与多个 upstream canonical source objects 之间的最小 shared linkage。
- 该 shape 不定义 evidence attachment schema、execution step semantics、graph traversal API、waiver/gate result、path grammar 或 family-specific rule taxonomy。
- `derivationKind` 只冻结最小 shared 关系位，用于区分 `associated-with`、`derived-from`、`aggregated-from`；它不是完整 provenance vocabulary。

## Fit for the next candidate families

| Candidate family | How it would use the seam |
| --- | --- |
| `ui-spec` | 把 flow analysis、state map 或 viewer detail output 链接回 interaction/state/component canonical objects，并继续把 UI-specific analysis semantics 留在 family 内 |
| `frontend-spec` | 把 dependency report、impact slice 或 contract index output 链接回 module boundary、dependency rule、implementation `contract` 等 canonical objects |
| `qa-spec` | 把 coverage matrix、gate report 或 evidence index output 链接回 coverage target、assertion 引用的 upstream canonical objects；完整 evidence chain 与 execution 仍继续留空 |

## Review notes

- 战略一致性：本 seam 对应 [`shared-kernel-extraction-matrix.md`](./shared-kernel-extraction-matrix.md) 中 provenance / `traceability` 的 `extract-now` 范围，只冻结最薄 source linkage 协议，不提前抽 evidence chain 或 execution abstraction。
- package boundary 一致性：shared provenance type 只落在 private maintainer package [`packages/spec-toolchain-shared-kernel/`](../../packages/spec-toolchain-shared-kernel/)；[`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/) 仍是唯一 public package boundary。
- Markdown 与术语一致性：仅使用仓库内相对 Markdown 路径，并遵循 [`terminology.md`](./terminology.md) 中的 `shared kernel`、`spec family`、`contract`、`traceability`、`stable ID`、canonical source object 等规定写法。
