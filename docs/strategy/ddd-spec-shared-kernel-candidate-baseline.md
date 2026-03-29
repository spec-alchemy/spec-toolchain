# `ddd-spec` shared kernel candidate baseline

本文件是 `ddd-spec -> shared kernel` 的能力拆分基线，用于回答两个问题：

1. 当前 `ddd-spec` 已经落地了哪些 runtime surfaces。
2. 哪些能力可以进入第一阶段 `shared kernel candidate`，哪些必须继续留在 `ddd-spec`，哪些仍待验证。

本文档只定义边界，不直接触发 package 迁移，也不改变当前 public package boundary。

## 判定口径

- `shared-kernel candidate`
  - 可被多个 `spec family` 复用，且第一阶段可先抽成薄 `contract`、types 或 extension points
  - 不依赖 DDD 专有对象命名才成立
- `ddd-specific`
  - 含有 DDD 设计域语义，或当前价值主要来自 DDD 专有规则、视图、资源 kinds
- `undecided`
  - 可能需要 shared surface，但目前还无法证明抽上去后不会把 DDD 语义误升为 family 通用语义

## 能力拆分

| Capability | Current `ddd-spec` surface | Classification | Boundary decision for next stories | Basis / open question |
| --- | --- | --- | --- | --- |
| Spec IO `contract` | [`packages/ddd-spec-core/spec.ts`](../../packages/ddd-spec-core/spec.ts) 定义 `domain-model/index.yaml`、`version: 1`、resource collections、canonical load 规则 | `undecided` | 保留 `ddd-spec` canonical input；只考虑把“入口/输出/可枚举 artifact”的最薄 contract 提炼到 shared skeleton | family 共有的是“单入口 + 可枚举 artifact”模式，不是 `domain-model/`、resource kinds、`version: 1` 这些 DDD 约束 |
| `schema validation` | [`packages/ddd-spec-core/schema-validation.ts`](../../packages/ddd-spec-core/schema-validation.ts) + [`packages/ddd-spec-core/schema/domain-model/`](../../packages/ddd-spec-core/schema/domain-model/) | `shared-kernel candidate` | 先抽 validator-facing diagnostics/result shape 与 schema loader seam；DDD schema files 继续留在 `ddd-spec` | 多个 family 都需要单文件结构校验，但 schema 内容和 kinds 明显 family-specific |
| `semantic validation` | [`packages/ddd-spec-core/business-spec-semantic-validation.ts`](../../packages/ddd-spec-core/business-spec-semantic-validation.ts) 复用 [`packages/ddd-spec-core/business-spec-analysis.ts`](../../packages/ddd-spec-core/business-spec-analysis.ts) 中的规则与 diagnostics | `undecided` | 暂不抽 rule logic；只记录“跨文件引用/所有权/拓扑/一致性 diagnostics contract”作为候选 | shared 的是 validation category 和 diagnostic shape；DDD 的是 context ownership、aggregate lifecycle、policy/message rule 等具体规则 |
| `analysis` | [`packages/ddd-spec-core/business-spec-analysis.ts`](../../packages/ddd-spec-core/business-spec-analysis.ts) 产出 `BusinessSpecAnalysis`、IR、summary、diagnostics | `undecided` | 先保留 DDD IR；只把 analysis summary / diagnostics / artifact envelope 视为 shared 候选 | `analysis` 是 shared runtime surface，但当前 IR 强绑定 contexts、messages、aggregates、policies，不能直接升格成 shared contract |
| `generation` | [`packages/ddd-spec-cli/commands.ts`](../../packages/ddd-spec-cli/commands.ts) 管理 `bundle / analysis / viewer / typescript`；[`packages/ddd-spec-cli/artifact-io.ts`](../../packages/ddd-spec-cli/artifact-io.ts) 提供 artifact 写入 | `undecided` | 第一阶段只考虑 shared artifact manifest contract；各生成 target 与文件布局继续留在 `ddd-spec` | shared 的是“artifact 可枚举、可追溯、可重复构建”；不 shared 的是 DDD 的 bundle/analysis/viewer/typescript target 语义 |
| `viewer contract` | [`packages/ddd-spec-viewer-contract/index.ts`](../../packages/ddd-spec-viewer-contract/index.ts) 定义结构化 viewer spec；[`packages/ddd-spec-projection-viewer/viewer-spec.ts`](../../packages/ddd-spec-projection-viewer/viewer-spec.ts) 投影 DDD 视图 | `shared-kernel candidate` | 先抽通用 detail value / node-edge-view / locale artifact naming skeleton；DDD 视图 kinds 与导航语义继续留在 family 层 | 现有 viewer detail 已符合“structured contract, not prose”原则，但 view/node/edge kinds 仍混有 DDD 语义，需要 family extension slot |
| diagnostics | [`packages/ddd-spec-core/business-spec-analysis.ts`](../../packages/ddd-spec-core/business-spec-analysis.ts) 的 `AnalysisDiagnostic`；[`packages/ddd-spec-cli/console.ts`](../../packages/ddd-spec-cli/console.ts) 的 CLI diagnostic formatting | `shared-kernel candidate` | US-003 优先落地统一 diagnostics contract/types；family-specific code 列表保留在各 family | 诊断需要文件、字段、引用链定位，这是跨 family 稳定需求；当前仍缺 severity taxonomy、source phase、related references 等扩展位 |
| `traceability` | 现有代码只局部体现 `path`、`id`、viewer links，尚无独立 shared contract | `undecided` | 先记录为 shared kernel 必要能力，但不在第一阶段承诺完整实现 | `qa-spec`、`ui-spec`、`frontend-spec` 都需要 cross-family `stable ID` / evidence chain；当前 `ddd-spec` 尚不足以证明通用 shape |

## 当前边界结论

### 可以进入第一阶段 `shared kernel candidate` 的薄能力

- diagnostics contract / types
- `schema validation` 的 validator-facing seam，而不是 DDD schema 本体
- `viewer contract` 的结构化骨架，而不是 DDD 视图语义

### 必须继续留在 `ddd-spec` 的能力

- `domain-model/` canonical input、resource kinds、引用命名与 `version: 1` `contract`
- DDD 专有 `semantic validation` 规则
- DDD 专有 `analysis` IR
- DDD 专有 viewer views、navigation、projection logic
- DDD 目标导向的 `generation` outputs

### 仍待验证的问题

- Spec IO `contract` 应先抽到什么粒度，才能服务 `ui-spec` / `frontend-spec` / `qa-spec`，又不把 `domain-model/` 误当成 family 通用模式？
- `semantic validation` 的 shared surface 是否只需要 diagnostics/result contract，还是还需要 rule composition interface？
- `analysis` 除 diagnostics / summary / artifact envelope 外，是否存在真正跨 family 稳定的 IR fragment？
- `traceability` 第一阶段是否只需 `stable ID` + artifact provenance，还是必须同时覆盖 cross-family evidence chain？
- `generation` 的 shared artifact manifest 是否要在第二个 family 出现前先冻结版本策略？

## 对后续 stories 的直接约束

- US-002 应围绕本文的三类结果推进：可抽骨架、保留在 `ddd-spec`、待验证项。
- US-003 只应实现薄 skeleton，优先顺序是 diagnostics、artifact manifest、viewer contract skeleton。
- US-005 / US-006 / US-007 必须把本文的 `undecided` 项当作 preflight 验证对象，而不是默认已解决。
- 任何后续抽取都不得改变 [`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/) 作为当前唯一 public package boundary 的事实。

## Review notes

- 战略一致性：本基线以 [`spec-family-map.md`](./spec-family-map.md) 的 shared surfaces 为主分类标准，没有把 `ddd-spec` 重新定义为品牌本体。
- package boundary 一致性：本文只定义内部拆分口径，不把 consumer-facing maturity、compatibility、CLI promise 从 [`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/) 挪走。
- Markdown 与术语一致性：仅使用仓库内相对 Markdown 链接，并遵循 [`terminology.md`](./terminology.md) 中的 `spec family`、`shared kernel`、`contract`、`artifact`、`traceability` 等规定写法。
