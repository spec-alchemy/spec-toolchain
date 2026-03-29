# `ui-spec` shared kernel preflight

本文件定义 US-005 的 `ui-spec` 预演结果，用于验证 `ui-spec` 若作为第二个 `spec family` 候选，接入当前 `shared kernel` skeleton 时需要哪些最小边界、哪些能力仍必须留在 family-specific 层，以及当前 skeleton 还缺什么。

本文档只做 preflight，不承诺 `ui-spec` 的正式 `contract`、CLI 或 public package boundary，也不把 `ui-spec` 误降格为 `frontend-spec` 或 `qa-spec` 的附属建模层。

## Preflight outcome

- `ui-spec` 是当前最适合验证 `shared kernel` 的第二个 family 候选，因为它天然覆盖 `validation`、`analysis`、`generation`、`viewer` 四个 runtime surfaces，但其 canonical input 与对象语义又明显不同于 `ddd-spec`。
- 当前 skeleton 足以承接 `ui-spec` 的第一轮边界评审，尤其是 diagnostics 和 `artifact manifest`；但还不足以支撑正式接入，缺口集中在 `viewer contract` primitives、cross-family `stable ID` 引用语义，以及用于状态/导航分析的 shared provenance seam。

## Minimum canonical input

`ui-spec` 的 minimum canonical input 应聚焦“界面结构 + 交互流 + 状态语义”，而不是从组件代码、设计稿截图或测试用例反推。

建议的最小核心资产如下：

| Asset | Purpose | Why it belongs to `ui-spec` |
| --- | --- | --- |
| view map | 定义页面、局部视图、布局容器与入口/出口关系 | UI 信息架构本身就是独立 `source asset`，不应退化成前端路由配置的副产品 |
| interaction flow | 定义用户触发、导航跳转、分支与返回路径 | 交互流是 `ui-spec` 的核心行为对象，不应由 prose 原型说明替代 |
| state model | 定义 UI 状态、状态切换、可见性与 loading/error/empty 等语义 | UI 状态机是 `semantic validation`、可访问性检查和 QA 链接的前提 |
| component contract | 定义关键组件的输入/输出、可组合关系与语义槽位 | 组件结构与交互语义必须以 UI 视角建模，而不是直接复用实现层组件树 |

最小 canonical 输入可以先被组织成单入口、可枚举的 UI spec tree，但第一阶段不应承诺具体目录名、YAML kinds 或文件拆分策略。

## Runtime surface fit

`ui-spec` 需要完整接入 `spec-family-map.md` 定义的四个主要 runtime surfaces，但每个 surface 的 shared 需求都应停留在薄边界。

| Runtime surface | How `ui-spec` would use it | Shared need | Must remain `ui-spec`-specific |
| --- | --- | --- | --- |
| `validation` | 对视图、组件、状态、交互事件做 `schema validation`；对导航闭包、状态转换、命名一致性、可达性做 `semantic validation` | 通用 diagnostics shape、validator/result seam、cross-file 引用定位 | 视图 kinds、状态类别、可访问性规则、导航合法性词表 |
| `analysis` | 推导关键用户路径覆盖、状态复杂度、交互一致性和可访问性风险 | `artifact manifest` envelope、analysis diagnostics、后续 provenance seam | 路径评分、状态复杂度算法、UI 风险分类与启发式 |
| `generation` | 生成 routes/state/contracts、inspection artifact、必要时生成 QA stub 或 design handoff artifact | 可枚举 `artifact` contract、source linkage | 具体生成 target、文件布局、UI 设计 token/组件映射语义 |
| `viewer` | 以 IA、flow、state、component 关系做结构化 inspection，并链接到 `frontend-spec` 与 `qa-spec` | shared `viewer contract` primitives、node/edge/detail skeleton | 视图层级导航、状态图语义、UI inspector 信息架构 |

## Core asset sketch

第一版 `ui-spec` 预演应至少承认以下核心对象：

| Object | Role in `ui-spec` | Shared dependency | Family-specific boundary |
| --- | --- | --- | --- |
| view | 定义界面节点、层级与入口关系 | shared diagnostics location、artifact locator | 视图分类、展示语义、布局层级规则 |
| interaction | 定义用户动作、系统反馈与路径跳转 | cross-file 引用 diagnostics、未来 cross-family `stable ID` | 交互事件语义、导航模式、微交互约束 |
| state | 定义 UI 状态与状态切换 | analysis/result envelope、viewer detail primitives | 状态分类、切换规则、可见性与容错模型 |
| component contract | 定义关键组件接口与组合边界 | artifact manifest、related resource shape | 组件槽位、组合限制、设计系统绑定策略 |

这些对象与 [`spec-family-map.md`](./spec-family-map.md) 中 `ui-spec` 的定义一致：重点是 UI 设计资产的结构化 `source of truth`，而不是代码实现细节或设计稿截图。

## Cross-family links

`ui-spec` 不能只是 `frontend-spec` 的一个子模块，因为它要表达的是用户可见结构、状态和交互语义，而不是实现依赖图。

| Neighbor family | Link target for `ui-spec` | Why the link matters |
| --- | --- | --- |
| `frontend-spec` | route module、component implementation boundary、client `contract`、dependency rule | UI 需要把关键视图和组件 contract 映射到真实实现边界，避免设计与实现漂移 |
| `qa-spec` | coverage target、assertion、gate、evidence link | QA 需要把断言与 coverage 挂到关键路径、状态和交互结果上 |
| `ddd-spec` | 场景、消息、业务状态来源、关键术语 | UI 需要把用户路径与业务协作场景对齐，避免 UI 流转脱离领域行为 |

这些链接都应是显式结构化引用，而不是 prose 备注。否则 `semantic validation` 无法阻断失效链接，也无法形成后续 `traceability`。

## Shared needs against current skeleton

### Already covered by the current skeleton

| Shared surface | Current status | Why it helps `ui-spec` |
| --- | --- | --- |
| diagnostics `contract` | available in [`packages/spec-toolchain-shared-kernel/`](../../packages/spec-toolchain-shared-kernel/) | 能表达导航断裂、状态未定义、组件 contract 缺失、跨 family 链接失效等通用 diagnostics shape |
| `artifact manifest` skeleton | available in [`packages/spec-toolchain-shared-kernel/`](../../packages/spec-toolchain-shared-kernel/) | 能枚举 IA graph、flow analysis、state map、viewer payload 等 UI `artifact` |
| extension-point placeholder | `reserved` / `candidate` only | 允许先为 `viewer contract` primitives、cross-family reference seam 预留挂点，而不承诺 runtime behavior |

### Still missing for `ui-spec`

| Gap | Why the current skeleton is insufficient | What future extraction should validate |
| --- | --- | --- |
| shared `viewer contract` primitives | 当前 skeleton 还没有正式 shared 的 node/edge/detail value 骨架 | 是否能抽出不带 UI/DDD 语义的 inspector primitives，供多个 family 复用 |
| cross-family `stable ID` reference `contract` | 现在只有 diagnostics related resource shape，没有正式 shared 引用语义 | 是否需要统一引用 family、kind、stable ID、path 和 version hint 的薄 `contract` |
| provenance / `traceability` seam for analysis outputs | `artifact manifest` 只能枚举 artifact，不能表达“哪个路径/状态由哪些上游对象推导而来” | 是否先抽 source linkage graph skeleton，再决定是否需要更强的 trace model |
| shared semantic result envelope | diagnostics shape 足够报错，但不足以表达 UI path coverage、state complexity 等分析摘要 | 是否需要一层通用 analysis summary envelope，而不把 UI 专有指标词表提升到 shared |

## Boundary decision

### Safe shared-kernel candidate surfaces for future UI-related extraction

- diagnostics severity、location、related resource shape
- 可枚举 UI `artifact` 的 manifest envelope
- `viewer contract` primitives，例如 detail value、node/edge、section/list/field skeleton
- cross-family reference 与 provenance 的薄 `contract`，前提是不引入 view、state、route 等 UI 词表

### Must remain `ui-spec`-specific

- view、interaction、state、component contract 的 canonical object model
- 可访问性规则、导航合法性规则、状态机语义
- UI analysis 指标、设计系统映射、handoff/generation targets
- UI-specific viewer navigation、inspector layout 与 visual grouping

## Readiness conclusion

当前 shared skeleton 足以支撑 `ui-spec` preflight，但还不足以支撑其进入正式实现或 family admission。

原因如下：

1. 还没有 shared `viewer contract` primitives，`ui-spec` 无法稳定承接 IA、flow、state inspection 而不重复造一套 viewer shape。
2. 还没有 cross-family `stable ID` 引用语义，`ui-spec` 不能可靠链接到 `frontend-spec`、`qa-spec` 与 `ddd-spec` 的 canonical 对象。
3. 还没有 shared provenance / `traceability` seam，因此 UI analysis 与后续 QA coverage 之间还缺可检查的结构化桥接。

因此，`ui-spec` 当前适合作为 shared extraction 的下一轮验证对象，但不应直接承诺新的产品实现。

## Review notes

- 战略一致性：本文把 `ui-spec` 定义为候选 `spec family`，围绕 `shared kernel` 接入讨论，没有把它收缩成设计稿管理工具，也没有把它伪装成 `frontend-spec` 的附属模块。
- package boundary 一致性：变更只落在 [`docs/strategy/`](./README.md)；没有新增 public package boundary，也没有把 consumer-facing promise 从 [`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/) 挪走。
- Markdown 与术语一致性：仅使用仓库内相对 Markdown 路径，并遵循 [`terminology.md`](./terminology.md) 中的 `spec family`、`shared kernel`、`contract`、`artifact`、`viewer`、`traceability`、`stable ID` 等规定写法。
