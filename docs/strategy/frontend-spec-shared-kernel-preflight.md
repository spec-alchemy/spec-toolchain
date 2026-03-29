# `frontend-spec` shared kernel preflight

本文件定义 US-006 的 `frontend-spec` 预演结果，用于验证 `frontend-spec` 若作为候选 `spec family`，接入当前 `shared kernel` skeleton 时需要哪些最小边界、哪些能力仍必须留在 family-specific 层，以及当前 skeleton 还缺什么。

本文档只做 preflight，不承诺 `frontend-spec` 的正式 `contract`、CLI 或 public package boundary，也不把 `frontend-spec` 误降格为 `ddd-spec` 的实现细节子模块。

## Preflight outcome

- `frontend-spec` 是检验 `shared kernel` 是否真正支持“实现边界与依赖治理”这一设计域的关键候选，因为它天然要求 dependency rules、contract consistency 和 impact analysis 三类能力同时成立。
- 当前 skeleton 足以支撑 `frontend-spec` 的第一轮边界评审，尤其是 diagnostics 和 `artifact manifest`；但还不足以支撑正式接入，缺口集中在 cross-family `stable ID` 引用、共享 dependency/provenance seam，以及可复用的 analysis summary envelope。

## Minimum canonical input

`frontend-spec` 的 minimum canonical input 应聚焦“前端实现边界 + 依赖方向 + 契约约束”，而不是直接从 bundler 配置、源码 import 图或 lint 输出反推。

建议的最小核心资产如下：

| Asset | Purpose | Why it belongs to `frontend-spec` |
| --- | --- | --- |
| module boundary map | 定义 app layer、feature、shared module、integration adapter 等实现边界 | 模块边界本身是前端架构的 `source asset`，不应退化成目录结构的偶然结果 |
| dependency rule set | 定义允许/禁止的依赖方向、层级穿透、循环与隔离规则 | dependency rules 是 `semantic validation` 的核心对象，不应只存在于 lint 配置或口头约定 |
| implementation `contract` set | 定义 route module、client adapter、state adapter、component implementation seam 等接口边界 | `frontend-spec` 需要把实现约束结构化，而不是把所有接口语义都塞回 `ui-spec` 或 `ddd-spec` |
| impact slice declaration | 定义关键变更切面、风险区域和受影响范围聚合规则 | impact analysis 是前端架构治理对象，不应只依赖临时图分析或 PR 经验判断 |

最小 canonical 输入可以先被组织成单入口、可枚举的 frontend spec tree，但第一阶段不应承诺具体目录名、YAML kinds 或文件拆分策略。

## Runtime surface fit

`frontend-spec` 需要接入 `spec-family-map.md` 定义的四个主要 runtime surfaces，但 shared 侧只应承接薄边界，不应把前端词表错误上提。

| Runtime surface | How `frontend-spec` would use it | Shared need | Must remain `frontend-spec`-specific |
| --- | --- | --- | --- |
| `validation` | 对模块边界、依赖规则、接口引用做 `schema validation`；对依赖方向、层级隔离、契约一致性、禁止耦合做 `semantic validation` | 通用 diagnostics shape、validator/result seam、cross-file 引用定位 | 分层词表、依赖合法性规则、模块分类、违例豁免策略 |
| `analysis` | 推导依赖图、边界穿透、影响面、风险切面和 contract drift | `artifact manifest` envelope、analysis diagnostics、未来 provenance seam | impact scoring、切面分类、依赖风险模型、contract drift heuristic |
| `generation` | 生成 `lint`/`dep-rule` 配置、client `contract` 类型、脚手架或边界校验配置 | 可枚举 `artifact` contract、source linkage | 具体生成 target、工程集成方式、框架绑定和构建工具语义 |
| `viewer` | 以架构拓扑、依赖图、contract seam 和影响面做结构化 inspection，并链接 `ui-spec`、`ddd-spec`、`qa-spec` | shared `viewer contract` primitives、node/edge/detail skeleton | 模块层级导航、依赖聚合视图、风险切面呈现与实现语义分组 |

## Core asset sketch

第一版 `frontend-spec` 预演应至少承认以下核心对象：

| Object | Role in `frontend-spec` | Shared dependency | Family-specific boundary |
| --- | --- | --- | --- |
| module boundary | 定义实现单元、责任边界与允许暴露的 seam | shared diagnostics location、artifact locator | 模块分类、边界层级、框架/运行时语义 |
| dependency rule | 定义模块之间允许或禁止的依赖模式 | cross-file 引用 diagnostics、未来 cross-family `stable ID` | 依赖方向词表、循环定义、例外机制 |
| implementation `contract` | 定义 route module、client adapter、state adapter、component implementation seam 的输入/输出约束 | artifact manifest、related resource shape | 前端接口分类、适配器模式、状态管理绑定策略 |
| impact slice | 定义关键变更切面、风险面和受影响对象聚合逻辑 | analysis/result envelope、provenance seam | 影响面算法、风险阈值、治理策略 |

这些对象与 [`spec-family-map.md`](./spec-family-map.md) 中 `frontend-spec` 的定义一致：重点是前端架构边界、模块依赖与实现契约，而不是 UI 语义或领域协作语义。

## Cross-family links

`frontend-spec` 不能只是 `ddd-spec` 的一个子模块，因为它建模的是“前端实现与架构治理”这一独立设计域，而不是领域模型的投影层。

| Neighbor family | Link target for `frontend-spec` | Why the link matters |
| --- | --- | --- |
| `ui-spec` | view/component contract、route ownership、state handoff seam | 前端实现边界需要承接 UI 结构与交互语义，但不能反过来决定 UI canonical object model |
| `ddd-spec` | 场景入口、消息消费点、业务 `contract` 映射、领域状态来源 | 前端实现需要证明哪些模块消费了哪些领域协作语义，但这些语义的 `source of truth` 仍在 `ddd-spec` |
| `qa-spec` | coverage target、gate、evidence link、risk slice | QA 需要把 coverage 和 gate 挂到真实模块边界、契约和影响面上，而不是只停留在业务描述层 |

如果没有这些结构化链接，`frontend-spec` 只能退化成“静态依赖图配置”，无法形成跨 family `traceability` 和 drift control。

## Shared needs against current skeleton

### Already covered by the current skeleton

| Shared surface | Current status | Why it helps `frontend-spec` |
| --- | --- | --- |
| diagnostics `contract` | available in [`packages/spec-toolchain-shared-kernel/`](../../packages/spec-toolchain-shared-kernel/) | 能表达依赖方向违规、边界穿透、contract mismatch、失效引用等通用 diagnostics shape |
| `artifact manifest` skeleton | available in [`packages/spec-toolchain-shared-kernel/`](../../packages/spec-toolchain-shared-kernel/) | 能枚举 dependency graph、impact report、contract index、viewer payload 等前端架构 `artifact` |
| extension-point placeholder | `reserved` / `candidate` only | 允许先为 dependency/provenance seam、analysis summary 和 viewer primitives 预留挂点，而不承诺 runtime behavior |

### Still missing for `frontend-spec`

| Gap | Why the current skeleton is insufficient | What future extraction should validate |
| --- | --- | --- |
| cross-family `stable ID` reference `contract` | 现在只有 diagnostics related resource shape，没有正式 shared 引用语义 | 是否需要统一 family、kind、stable ID、path 和 version hint 的薄 `contract` |
| shared provenance seam for dependency and impact analysis | `artifact manifest` 只能枚举 artifact，不能表达“哪个模块依赖规则或 impact slice 由哪些 upstream 对象推导” | 是否先抽 source linkage graph skeleton，再决定是否需要更强的 `traceability` model |
| shared analysis summary envelope | diagnostics shape 足够报错，但不足以表达 dependency risk、contract drift、impact summary 等结构化摘要 | 是否需要一层通用 analysis result envelope，而不把前端风险词表提升到 shared |
| shared `viewer contract` primitives | 当前 skeleton 还没有正式 shared 的 node/edge/detail value 骨架 | 是否能抽出不带前端或 DDD 语义的 inspector primitives，供多个 family 复用 |

## Boundary decision

### Safe shared-kernel candidate surfaces for future frontend-related extraction

- diagnostics severity、location、related resource shape
- 可枚举前端架构 `artifact` 的 manifest envelope
- cross-family reference 与 provenance 的薄 `contract`，前提是不引入 module、adapter、route 等前端词表
- `viewer contract` primitives 与 analysis summary envelope，前提是只表达结构，不承载前端治理语义

### Must remain `frontend-spec`-specific

- module boundary、dependency rule、implementation `contract`、impact slice 的 canonical object model
- 依赖方向规则、层级治理、违例处理、性能/安全/可维护性风险分类
- bundler、framework、runtime、state management 与工程集成语义
- 前端拓扑 viewer 导航、风险聚合与实现语义分组

## Why it is not a `ddd-spec` submodule

`frontend-spec` 不应被视为 `ddd-spec` 的一个子模块，原因有四点：

1. 它的核心对象不是聚合、消息、场景或业务规则，而是 module boundary、dependency rule、implementation `contract` 和 impact slice。
2. 它的主要 `semantic validation` 目标是依赖方向、边界穿透和 contract consistency，这些规则不属于 DDD 语义层。
3. 它天然需要链接 `ui-spec` 与 `qa-spec`，作为“实现边界”这一独立设计域的中介，而不是仅消费领域模型。
4. 如果把它收进 `ddd-spec`，会把 `ddd-spec` 错误塑造成品牌级总模型，并模糊未来独立 family 的 package boundary 与准入评审。

因此，`frontend-spec` 应被视为候选 `spec family`，只在 shared seams 上与 `ddd-spec` 协作，而不是成为其内部子模块。

## Readiness conclusion

当前 shared skeleton 足以支撑 `frontend-spec` preflight，但还不足以支撑其进入正式实现或 family admission。

原因如下：

1. 还没有 cross-family `stable ID` 引用语义，`frontend-spec` 无法稳定链接到 `ui-spec`、`ddd-spec` 和 `qa-spec` 的 canonical 对象。
2. 还没有 shared provenance seam，因此 dependency rules、contract consistency 和 impact analysis 之间缺少统一、可检查的推导桥接。
3. 还没有 shared `viewer contract` primitives 或 analysis summary envelope，`frontend-spec` 只能各自定义拓扑 inspection shape，复用边界还不够稳。

因此，`frontend-spec` 当前适合作为 shared extraction 的验证对象，但不应直接承诺新产品实现。

## Review notes

- 战略一致性：本文把 `frontend-spec` 定义为候选 `spec family`，围绕 `shared kernel` 接入讨论，没有把它降格为 `ddd-spec` 的实现附属模块，也没有把它伪装成 `ui-spec` 的部署细节。
- package boundary 一致性：变更只落在 [`docs/strategy/`](./README.md)；没有新增 public package boundary，也没有把 consumer-facing promise 从 [`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/) 挪走。
- Markdown 与术语一致性：仅使用仓库内相对 Markdown 路径，并遵循 [`terminology.md`](./terminology.md) 中的 `spec family`、`shared kernel`、`contract`、`artifact`、`viewer`、`traceability`、`stable ID` 等规定写法。
