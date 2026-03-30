# `qa-spec` shared kernel preflight

本文件定义 US-007 的 `qa-spec` 预演结果，用于验证 `qa-spec` 若作为下一批 `spec family` 候选，接入当前 `shared kernel` skeleton 时需要哪些最小边界、哪些能力仍必须留在 family-specific 层，以及当前 skeleton 还缺什么。

本文档只做 preflight，不承诺 `qa-spec` 的正式 `contract`、CLI 或 public package boundary，也不把 `execution` 过早冻结成共享抽象。

## Preflight outcome

- `qa-spec` 可以作为 `shared kernel candidate` 的压力测试对象，因为它同时依赖 `traceability`、`evidence chain`、diagnostics 和可选 `execution`，比单一建模 family 更容易暴露 shared surface 的不足。
- 当前 skeleton 足以支撑 `qa-spec` 的第一轮边界讨论，但还不足以支撑其成为正式 `spec family` 的前置条件；缺口主要在 `traceability` `contract`、evidence attachment 和 gate result envelope。

## Minimum canonical input

`qa-spec` 的 minimum canonical input 应聚焦在“覆盖模型 + 断言 + 门禁”，而不是直接从测试代码反推。

建议的最小核心资产如下：

| Asset | Purpose | Why it belongs to `qa-spec` |
| --- | --- | --- |
| coverage target | 定义需要覆盖的用户路径、领域场景、接口契约或风险条目 | 覆盖对象本身是 QA 建模对象，不应退化成自由文本测试计划 |
| assertion set | 定义预期行为、可观察结果、前置条件和失败信号 | `qa-spec` 需要把“如何判定通过/失败”作为结构化 `contract` 固化 |
| gate | 定义发布前或回归阶段必须满足的 coverage / severity / evidence 门槛 | 质量门禁是 QA 的独立运行时表面，不能只是其他 family 的附注 |
| evidence link | 记录断言或 gate 依赖的 upstream `stable ID`、artifact 或执行结果引用 | 没有 evidence link，就无法建立 `traceability` 与 `evidence chain` |

最小 canonical 输入可以先被组织成一个单入口、可枚举的 QA spec tree，但第一阶段不应承诺具体目录名、YAML kinds 或文件拆分策略。

## Core asset sketch

第一版 `qa-spec` 预演应至少承认以下核心对象：

| Object | Role in `qa-spec` | Shared dependency | Family-specific boundary |
| --- | --- | --- | --- |
| coverage target | 定义要覆盖的对象与风险层级 | 需要 cross-family `stable ID`、shared diagnostics location | 覆盖分层模型、风险分级词表和覆盖聚合逻辑仍是 QA 专有 |
| assertion | 定义输入条件、观察点、通过/失败标准 | 需要可链接 artifact/source 的 `traceability` shape | 断言语义、断言类型和编排规则应保留在 `qa-spec` |
| gate | 定义质量门槛与阻断条件 | 需要通用 diagnostics severity 和 artifact manifest locator | gate 类型、通过策略、例外机制仍是 QA 专有 |
| evidence record | 把 coverage / assertion / gate 连接到上游设计与下游运行结果 | 需要共享 `evidence chain` / provenance seam | evidence 的采集方式、保留策略和执行接入仍属 `qa-spec` |

这些对象与 `spec-family-map.md` 中的 `qa-spec` 定义一致：重点不是“测试脚本目录”，而是 coverage、assertion、gate 和 evidence 的结构化设计资产。

## Cross-family links

`qa-spec` 不能作为 `ddd-spec` 的附属模块存在，因为它的核心工作是把多个 family 的设计资产收束到统一的质量闭环里。

| Upstream family | Link target for `qa-spec` | Why the link matters |
| --- | --- | --- |
| `ui-spec` | 用户路径、视图状态、交互事件、可访问性约束 | QA 需要判断关键路径是否被覆盖，并把断言绑定到可观察 UI 状态与交互结果 |
| `frontend-spec` | 模块边界、接口 `contract`、依赖规则、风险切面 | QA 需要把断言和 gate 绑定到真实实现边界，而不是只停留在 UI 文案层 |
| `ddd-spec` | 场景、消息、聚合生命周期、业务规则来源 | QA 需要证明关键业务协作路径有 coverage，且 failure 能追溯到领域场景或规则出处 |

对 `qa-spec` 而言，这些链接都应是显式结构化引用，而不是 prose 备注。否则 `semantic validation` 无法阻断上游漂移造成的失效引用。

## Shared needs against current skeleton

### Already covered by the current skeleton

| Shared surface | Current status | Why it helps `qa-spec` |
| --- | --- | --- |
| diagnostics `contract` | available in [`packages/spec-toolchain-shared-kernel/`](../../packages/spec-toolchain-shared-kernel/) | 能表达 coverage 缺失、失效引用、gate 阻断等通用诊断 shape |
| `artifact manifest` skeleton | available in [`packages/spec-toolchain-shared-kernel/`](../../packages/spec-toolchain-shared-kernel/) | 能枚举 coverage matrix、gate report、evidence index 之类的 QA `artifact` |
| cross-family reference `contract` | available in [`packages/spec-toolchain-shared-kernel/reference.ts`](../../packages/spec-toolchain-shared-kernel/reference.ts) | 能用同一条 family-agnostic seam 表达 QA canonical objects 对 `ui-spec`、`frontend-spec`、`ddd-spec` 的结构化引用 |
| extension-point placeholder | `reserved` / `candidate` only | 允许先为 QA 预留 evidence / gate 相关 `contract` seam，而不承诺 runtime behavior |

### Still missing for `qa-spec`

| Gap | Why the current skeleton is insufficient | What future extraction should validate |
| --- | --- | --- |
| `traceability` / `evidence chain` envelope | `artifact manifest` 只能列出产物，不能表达“这条 assertion 由哪些上游对象和哪些执行证据支撑” | 是否先抽 provenance graph skeleton，再决定是否需要更强的 evidence schema |
| gate result envelope | 目前没有共享方式表达 gate pass/fail、blocking reason、waiver 或 severity aggregation | 是否可以先抽薄 result shape，而把 gate strategy 留在 `qa-spec` |
| execution handoff seam | skeleton 明确未覆盖 `execution` | 是否只需要 artifact-level handoff，还是需要独立 execution `contract` |

## Boundary decision

### Safe shared-kernel candidate surfaces for future QA-related extraction

- diagnostics severity、location、related resource shape
- 可枚举 QA `artifact` 的 manifest envelope
- evidence / gate / coverage 的 extension-point reservation
- cross-family reference 与 provenance 的薄 `contract`，前提是不引入 QA 词表或 DDD 对象名

### Must remain `qa-spec`-specific

- coverage taxonomy、风险分级、回归集裁剪逻辑
- assertion kinds、assertion composition、fixture/data setup semantics
- gate policy、waiver policy、release-stage mapping
- execution adapter、test runner integration、evidence capture mechanics

## Readiness conclusion

当前 shared skeleton 只能支撑 `qa-spec` 的 preflight，不足以支撑其进入正式 family admission。

原因如下：

1. 还没有 shared `traceability` / `evidence chain` `contract`，因此无法稳定承载 QA 最关键的 cross-family 闭环。
2. `execution` 仍然故意留空，这是正确的范围控制，但意味着 QA 目前还不能证明第二个 runtime surface 的可落地接缝。

因此，`qa-spec` 当前更适合作为下一轮 shared extraction 的验证对象，而不是直接进入实现。

## Review notes

- 战略一致性：本文把 `qa-spec` 定义为候选 `spec family`，围绕 `shared kernel` 接入讨论，没有把它降格为 `ddd-spec` 的测试附属模块，也没有提前承诺新产品实现。
- package boundary 一致性：变更只落在 [`docs/strategy/`](./README.md)；没有新增 public package boundary，也没有把 consumer-facing promise 从 [`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/) 挪走。
- Markdown 与术语一致性：仅使用仓库内相对 Markdown 路径，并遵循 [`terminology.md`](./terminology.md) 中的 `spec family`、`shared kernel`、`contract`、`artifact`、`traceability`、`evidence chain`、`stable ID` 等规定写法。
