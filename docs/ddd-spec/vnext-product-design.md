# DDD Spec Workflow vNext 正式设计稿

## 1. 文档定位

本文件是 `ROADMAP.md` 之后的正式产品定义。

从本文件生效开始：

- 后续 schema、analysis IR、viewer contract、projection、viewer UX、CLI 模板与文档 story，必须以本文件为唯一产品定义依据。
- `ROADMAP.md` 保留为战略背景与分阶段路线；本文件负责给出可执行的产品语义与设计边界。
- 如果现有实现、历史文档或当前包结构与本文件冲突，以本文件为准。

## 2. 产品定义

### 2.1 北极星

vNext 的目标产品是一个面向“业务理解 -> 边界梳理 -> 场景建模 -> 消息流澄清 -> 生命周期设计”的 DDD 建模工作台。

它不是：

- 旧 viewer 的小步增量迭代
- 以 `composition` 为中心的对象图浏览器
- 围绕当前 graph model 继续堆视图的工具

### 2.2 产品要解决的问题

vNext 必须帮助团队高信号地回答以下问题：

1. 系统里有哪些 bounded contexts、actors 与 external systems，它们如何协作？
2. 一个核心业务场景是如何逐步推进的？
3. command、event、query 是如何跨边界流动的？
4. 哪些地方真的需要 aggregate lifecycle 来管理状态复杂度？
5. 哪些跨上下文协作需要 policy / saga，而哪些只是普通消息流？

### 2.3 明确决策

以下决策在 vNext 中已经确定，不再回退：

1. 不做向前兼容。
   说明：当前没有真实用户依赖旧模型；产品清晰度与建模质量优先于迁移成本。
2. 移除 `composition` 一级视图。
   说明：`composition` 不再作为一级产品概念、默认 authoring path、默认 viewer path 或教学入口。
3. 允许重定义公开包边界。
   说明：当前 `packages/ddd-spec-cli/` 的公开边界只代表现状，不代表 vNext 的最终对外产品边界。后续实现可以基于新产品定义重组、拆分、合并或重命名公开包，只要最终外部产品边界清晰且一致。

## 3. 新的核心概念

vNext 的 canonical model、analysis IR 与 viewer contract，必须围绕以下一等概念设计：

| 概念 | 定义 | 为什么是一等公民 |
|------|------|------------------|
| `context` | 一个明确承担业务语义与模型所有权的 bounded context | 先边界，后结构 |
| `actor` | 触发业务动作的人或角色 | 解释场景起点与参与方 |
| `system` | 外部系统或跨边界技术参与者 | 区分内部语义与外部依赖 |
| `scenario` | 一个端到端业务目标的建模单元 | 成为默认阅读与教学主线 |
| `step` | 场景中的一步业务推进 | 连接叙事与消息流 |
| `message` | command、event、query 的统一抽象 | 成为跨图共享语义骨架 |
| `aggregate` | 在某个 context 内管理一致性与状态演进的边界 | 只在确实需要状态复杂度时出现 |
| `lifecycle` | aggregate 的状态机与转移 | 支撑生命周期视图，而不是泛化成所有结构的默认入口 |
| `policy` | 跨步骤或跨上下文的业务协调规则 | 区分普通流转与明确协调逻辑 |
| `relationship` | context、system、actor、aggregate 之间的显式关系 | 让 Context Map 与扩展图不再依赖隐式推断 |

以下历史对象不再作为产品定义中心：

- `object`
- `process`
- `composition`

它们未来可以继续存在于实现层或兼容层，但不能主导产品故事、建模顺序或视图层次。

## 4. 默认用户路径与建模顺序

### 4.1 默认用户路径

新用户进入产品后的默认阅读路径必须固定为：

1. 打开 `Context Map`
2. 选择一个 `Scenario Story`
3. 跟随 `Message Flow / Trace`
4. 在需要时下钻到 `Lifecycle`
5. 只有在一级路径无法回答问题时，才进入二级扩展图

### 4.2 默认建模顺序

新用户的默认 authoring path 必须固定为：

1. 定义 bounded contexts、actors 与 external systems
2. 选择一个核心 scenario，并拆出 step sequence
3. 为 step 绑定 command、event、query 等 message
4. 只在出现明显状态复杂度时，建模 aggregate 与 lifecycle
5. 只在需要进一步解释边界或协调逻辑时，补充 aggregate boundary 与 policy / saga

### 4.3 默认教学顺序

CLI 模板、README、示例与 viewer 文案必须教授同一顺序：

1. 先边界，再结构
2. 先场景，再聚合
3. 先消息流，再生命周期
4. 一级主图先于二级扩展图

## 5. 视图体系

### 5.1 一级主图

一级主图是产品默认入口，必须直接服务首次建模、首次阅读与首次教学。

| 视图 | 主要问题 | 一等内容 | 不应承担的职责 |
|------|----------|----------|----------------|
| `Context Map` | 谁拥有什么边界，谁与谁协作？ | contexts、actors、systems、ownership、relationships | 不展开具体 lifecycle 细节；不替代 scenario 叙事 |
| `Scenario Story` | 一个核心业务目标如何按步骤推进？ | scenario、steps、actors、context participation、关键业务结果 | 不替代消息语义细节；不变成对象组合图 |
| `Message Flow / Trace` | command、event、query 如何跨边界流动？ | messages、direction、producers、consumers、step linkage、cross-context hops | 不承担状态机解释；不吸回 `composition` 语义 |
| `Lifecycle` | 哪个 aggregate 在哪些状态间变化，触发条件是什么？ | aggregate、states、transitions、accepted messages、emitted messages | 不作为默认总览；不承担跨上下文主叙事 |

一级主图的产品原则：

1. 每一张图都必须能独立回答一个高价值问题。
2. 每一张图都必须能自然跳转到下一张图。
3. 一级主图共同构成默认路径，缺一不可。

### 5.2 二级扩展图

二级扩展图重要，但不应成为首次建模入口。

| 视图 | 何时使用 | 一等内容 | 不应承担的职责 |
|------|----------|----------|----------------|
| `Aggregate Boundary / Domain Structure` | 需要解释某个 context 内部的聚合边界、职责切分与领域结构时 | aggregates、owned concepts、intra-context structure、boundary rationale | 不回到全局对象拼装；不抢占 Scenario Story 的默认入口 |
| `Policy / Saga` | 需要解释跨步骤、跨上下文、长事务或补偿协调时 | policies、orchestration links、triggers、waiting points、compensation hints | 不把所有消息流都强行升级成 saga |

二级扩展图的产品原则：

1. 只有当一级主图无法充分解释问题时，才进入二级扩展图。
2. 二级扩展图必须引用一级主图中的概念，不得引入另一套并行语义。

## 6. Canonical Model vNext

### 6.1 设计目标

新的 canonical model 必须首先服务 4 张一级主图，其次再服务 2 张二级扩展图。

它不应继续围绕旧的 `objects / commands / events / aggregates / processes` 目录心智展开。

### 6.2 必须表达的语义

新的 canonical model 至少必须显式表达：

1. contexts 及其 ownership
2. actors 与 systems
3. scenarios 与 ordered steps
4. messages 及其 kind、source、target 与 step linkage
5. aggregates 与 lifecycle transition
6. policies / sagas 与协调关系
7. context 之间的 relationship 与 dependency

### 6.3 结构原则

新的 canonical model 必须满足以下原则：

1. 视图不重复造语义，视图只投影共享语义。
2. message 是跨视图共享的统一抽象，而不是分散在 command / event / query 各自旁路里。
3. scenario step 是一等建模对象，而不是由 trace 临时拼出来。
4. aggregate 只在需要时出现，不是默认起点。
5. policy 只表达明确协调逻辑，不替代普通消息流。

## 7. Analysis IR vNext

### 7.1 角色

analysis IR 是所有目标视图的共享语义核心。

它必须从 canonical model 归一化出一套稳定的分析对象，而不是让每张图各自重建一套 graph logic。

### 7.2 必须产出的分析语义

analysis IR 至少必须提供：

1. context boundary graph
2. actor / system / context participation graph
3. scenario step sequence
4. message flow graph
5. aggregate lifecycle graph
6. policy coordination graph

### 7.3 必须支撑的验证与诊断

vNext 的 validation / diagnostics 至少必须覆盖：

1. orphan scenario
2. scenario step without owner context
3. message without producer or consumer
4. ambiguous cross-context ownership
5. lifecycle transition without triggering message
6. policy without explicit trigger or outcome
7. broken scenario-to-message linkage
8. unused secondary structure that has no 一级主图入口

## 8. Viewer Contract 与 Inspector 原则

viewer contract 必须直接反映 vNext 的共享语义，而不是延续当前视图集合作为架构基线。

设计要求：

1. contract 必须显式区分一级主图与二级扩展图。
2. inspector detail 必须保持结构化语义，不得退化成纯展示字符串模板。
3. 一级主图节点与边都必须支持深链跳转到相邻视图语义。
4. `composition` 不得以换名方式回流为一级 contract 类型。

## 9. CLI 与 Authoring 要求

后续 CLI / init / 示例必须围绕默认建模顺序设计。

最小默认模板必须从以下内容开始：

1. 一个小型 `Context Map`
2. 一个核心 `Scenario Story`
3. 一条可跟踪的 `Message Flow`
4. 一个必要的 `Lifecycle`

不应再从以下内容开始：

1. 重对象、重 `composition` 的建模模板
2. aggregate-first 的教学顺序
3. 把当前 approval workflow 当成默认产品叙事

## 10. 包边界策略

vNext 实现阶段允许重定义公开包边界。

这意味着：

1. 当前 monorepo 中哪些包公开、哪些包私有，不是产品定义的一部分。
2. 后续 story 可以为了清晰的产品边界、职责分离或分发方式，调整 `packages/*` 的可见性与对外契约。
3. “当前只有一个公开包”不能成为阻止 schema、IR、viewer 或 CLI 重构的理由。

约束只有一条：最终对外产品边界必须清晰、一致、可文档化。

## 11. 非目标

本设计稿明确不包含以下目标：

1. 保留旧 schema 兼容性
2. 提供旧 canonical 自动迁移工具
3. 保留 `composition` 顶层视图地位
4. 延续旧 graph model 作为总设计中心
5. 让二级扩展图反向主导产品路径

## 12. 实施判定标准

后续实现 story 应按以下标准判断是否符合 vNext：

1. 是否强化了 4 张一级主图的默认路径？
2. 是否保持了共享语义核心，而不是让单个视图偷建私有语义？
3. 是否避免重新把 `composition` 拉回一级概念？
4. 是否继续坚持“不做向前兼容”的产品决策？
5. 是否允许在必要时重定义公开包边界，而不是被当前结构绑死？

如果答案是否定的，该实现不应被视为 vNext 正确方向。

---

*文档版本：v1.0*
*最后更新：2026-03-27*
*状态：正式设计稿已固化*
