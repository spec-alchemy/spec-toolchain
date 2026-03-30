# `shared kernel` extraction-ready prep

本文件收束 US-008 的 preflight 回刷结果，用于明确 `ui-spec`、`frontend-spec`、`qa-spec` 现在如何消费已落地的 shared seam、哪些缺口已经被覆盖、哪些仍阻断 family admission，以及下一轮 `ralph-loop` 应该从哪里继续推进。

本文档只组织 extraction-ready 边界，不启动新的 `spec family` 实现，不触发 `ddd-spec` 迁移，也不改变 [`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/) 作为唯一 public package boundary 的事实。

## What is now covered

当前 [`packages/spec-toolchain-shared-kernel/`](../../packages/spec-toolchain-shared-kernel/) 已经具备以下可复用 seam：

| Shared seam | Current landing | Current review value |
| --- | --- | --- |
| `stable ID` | [`stable-identity.ts`](../../packages/spec-toolchain-shared-kernel/stable-identity.ts) | 给 canonical source object 提供统一 identity seam，并显式排除 artifact-local derived IDs |
| cross-family reference | [`reference.ts`](../../packages/spec-toolchain-shared-kernel/reference.ts) | 给 family 之间的结构化引用提供统一 target shape 与最小诊断 hint 位 |
| provenance / `traceability` | [`provenance.ts`](../../packages/spec-toolchain-shared-kernel/provenance.ts) | 给 artifact/output 到多个 upstream canonical source objects 的连接提供最薄 shared linkage |
| invalid-reference diagnostics expectation | [`diagnostics.ts`](../../packages/spec-toolchain-shared-kernel/diagnostics.ts) | 给失效引用暴露统一 shared category 和最小目标信息，而不冻结 family-specific taxonomy |
| focused contract tests | [`shared-kernel-contracts.test.ts`](../../packages/spec-toolchain-shared-kernel/shared-kernel-contracts.test.ts) | 用非 DDD family 示例证明上述 seam 已经形成可回归的 package boundary |

这意味着 `SK-LOOP-03` 的最小完成定义已经成立：shared package 中已有 reference / provenance skeleton、相关 identity seam、invalid-reference diagnostics expectation 和 focused tests。

## `ddd-spec` reference sample now proven

当前 `ddd-spec` 已经把下列 shared seam 接到真实代码与产物里，可作为后续 family-adoption PRD 的参考样板：

| Adopted seam | `ddd-spec` proof point | Why it matters for later families |
| --- | --- | --- |
| `stable ID` | `analysis` artifact 中的 canonical source objects 直接携带 shared stable identity | 证明 shared identity 已经能落到真实 family output，而不是只停留在 type 层 |
| reference | `analysis` IR 中的关系、message flow endpoint、policy coordinate 已改为 shared reference-backed shape | 证明 resolver identity 与 family-local hints 可以分层，而不把 DDD 解析语义抬升到 shared |
| provenance / `traceability` | `messageFlows` 输出携带 shared provenance record，并链接多个 upstream canonical source objects | 证明一对多 source linkage 已经能在真实 artifact 中成立 |
| invalid-reference diagnostics | canonical missing-resource diagnostics 附带 shared invalid-reference payload | 证明 family-specific diagnostic taxonomy 可以保留，同时暴露统一 shared inspection seam |
| `artifact manifest` | `ddd-spec` generate/build 输出写入 shared artifact manifest | 证明 family-agnostic artifact enumeration 已经有真实 consumer，而不需要修改既有 artifact layout |

这份样板的停止线同样已经验证通过：[`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/) 仍是唯一 public package boundary，viewer external `contract` 没有被本轮接入反向改变。

## How each candidate family would consume the seam

| Candidate family | Shared seam it can consume now | Immediate use | Remaining blocker |
| --- | --- | --- | --- |
| `ui-spec` | `stable ID`, reference, provenance, invalid-reference diagnostics | 给 interaction、state、component contract 提供 canonical identity、跨 family 引用和 output-to-source `traceability` | shared `viewer contract` primitives、shared semantic result envelope 仍缺 |
| `frontend-spec` | `stable ID`, reference, provenance, invalid-reference diagnostics | 给 module boundary、dependency rule、implementation `contract` 和 impact output 提供 shared linking seam | shared analysis summary envelope、shared `viewer contract` primitives 仍缺 |
| `qa-spec` | `stable ID`, reference, provenance, invalid-reference diagnostics | 给 coverage target、assertion、gate output 和 evidence index 提供 shared linking seam | evidence attachment envelope、gate result envelope、execution handoff seam 仍缺 |

## Covered gaps vs remaining gaps

### Covered in this loop

- canonical source object identity 现在已有 shared `stable ID` seam，可作为 cross-family linking 锚点
- cross-family reference 现在已有独立 shared `contract`，不再需要在 diagnostics 或 family prose 中重复内联 identity tuple
- provenance / `traceability` 现在已有 manifest-linked skeleton，可把 artifact-local output 和 upstream canonical source objects 区分开
- invalid-reference diagnostics 现在已有统一 shared expectation，可让 family validator 在不共享 taxonomy 的前提下报告结构化失效链接

### Still deferred after this loop

- shared `viewer contract` primitives
- shared analysis summary / semantic result envelope
- QA-specific evidence attachment envelope
- QA-specific gate result envelope
- any shared `execution` abstraction or handoff runtime
- any `ddd-spec` migration into the shared package

这些 deferred 项同时构成后续 family-adoption PRD 的验证清单：`ui-spec` / `frontend-spec` 仍需继续证明 viewer primitives 与 analysis/result seam，`qa-spec` 仍需继续证明 evidence、gate 和 execution 相关边界。

## Extraction-ready order for the next `ralph-loop`

下一轮应继续按“先证明 shape 稳定，再考虑迁移”的顺序推进：

1. 先评审 shared `viewer contract` primitives。
2. 再判断 shared analysis summary / semantic result envelope 是否真的存在跨 family 稳定 shape。
3. 然后把结论收束成第一批 extraction-ready change set checklist。
4. 最后再准备首个真正的 extraction bead，而不是产品 feature bead。

对应现有 backlog，这意味着：

| Next loop | Why it is next | Why it is not migration yet |
| --- | --- | --- |
| `SK-LOOP-04` | `ui-spec` 与 `frontend-spec` 现在都把 viewer primitives 列为共同阻断，且该 seam 仍停留在 `defer` | 只评审 node/edge/detail skeleton 是否可抽，不接入任何 family runtime |
| `SK-LOOP-06` | `ui-spec`、`frontend-spec`、`qa-spec` 对 analysis/result 的 shared 需求仍未证明有统一 shape | 只决定“抽薄 shape”还是“继续暂缓”，不冻结 family metrics 或 gate semantics |
| `SK-LOOP-07` | 需要把已覆盖 seam 与仍缺 seam 转成可执行 change set | 只形成 checklist、owner、测试与回滚边界，不做搬迁 |
| `SK-LOOP-08` | 需要把 checklist 压缩成单个 bead-ready extraction task | 仍然是 shared seam 提炼，不是第二个 family 的实现启动 |

## `SK-LOOP-03` completion boundary

### Completed

- shared package 中已有 `stable ID`、reference、provenance 与 invalid-reference diagnostics 的最小 skeleton
- focused tests 已覆盖这些 seam，且示例不依赖新的 family 实现代码
- 三份 family preflight 已回刷，明确哪些 shared gaps 已被覆盖，哪些仍阻断 family admission

### Explicitly not completed

- 不做 `ddd-spec` 到 shared package 的迁移
- 不做 `ui-spec`、`frontend-spec`、`qa-spec` 的 package、CLI、runtime 或 canonical input 实现
- 不做 shared analysis/result、viewer、evidence、gate 或 execution abstraction 的正式落地

## Review notes

- 战略一致性：本文只收束 [`shared-kernel-extraction-matrix.md`](./shared-kernel-extraction-matrix.md) 中已经标记为 `extract-now` 的 seam 落地结果，并把后续工作继续限定在 [`spec-family-map.md`](./spec-family-map.md) 已定义的 shared surfaces 内。
- package boundary 一致性：新增内容只落在 [`docs/strategy/`](./README.md)；所有 shared code 仍收敛在 private maintainer package [`packages/spec-toolchain-shared-kernel/`](../../packages/spec-toolchain-shared-kernel/)，[`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/) 仍是唯一 public package boundary。
- Markdown 与术语一致性：仅使用仓库内相对 Markdown 路径，并遵循 [`terminology.md`](./terminology.md) 中的 `spec family`、`shared kernel`、`contract`、`artifact`、`traceability`、`stable ID`、canonical source object 等规定写法。
