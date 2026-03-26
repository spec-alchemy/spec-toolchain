# ROADMAP

## 当前状态

当前仓库应被视为一次产品重置，而不是对现有 viewer 的渐进式延伸。

目前没有真实用户在使用这个产品，因此我们不需要做向前兼容。

这意味着我们应该优先追求产品清晰度、建模质量和交付速度，而不是继续保留当前 schema、当前视图集合或当前 canonical 结构。

## 北极星目标

目标产品应当是一个面向“产品业务逻辑梳理 + DDD 建模”的业务建模工作台。

它应该帮助团队从业务理解逐步走向领域设计，并通过一组高 ROI 的视图来组织思考，而不是堆积大量低信号、低价值的图。

## 目标视图体系

### 一级主视图

这些是产品默认应该主推的视图：

1. Context Map
2. Scenario Story
3. Message Flow / Trace
4. Lifecycle

### 二级扩展视图

这些视图同样重要，但不应该成为首次建模流程的默认入口：

1. Aggregate Boundary / Domain Structure
2. Policy / Saga

## 产品原则

1. 先边界，再结构。
2. 先场景，再聚合。
3. 先消息流，再对象组合。
4. 高 ROI 优先于历史连续性。
5. 先 canonical model，再 projection，再 UI。
6. 除非现实情况变化，否则不做向前兼容。
7. 不再对当前 `composition` 视图作为顶层产品概念继续投入。

## 与当前产品的差异

当前产品的核心建模对象主要是：

1. `objects`
2. `commands`
3. `events`
4. `aggregates`
5. `processes`

当前 viewer 的主要视图则是：

1. `composition`
2. `lifecycle`
3. `trace`
4. `domain-structure`

这些能力作为原型是有价值的，但它们不是目标产品的最终建模体系。

未来产品不应继续围绕当前 graph model 无限扩展。

正确方向应当是：围绕产品真正要回答的业务问题，重新设计 canonical model。

## 产品目标

一个新用户在使用本产品时，理想的建模顺序应该是：

1. 定义 bounded contexts 与 external systems。
2. 捕获一个核心业务场景。
3. 描述推动这个场景前进的 command、event、query。
4. 只在确实存在状态复杂度的地方建模 aggregate lifecycle。
5. 在需要时再补充 aggregate boundary 细节与 policy orchestration。

这条路径应成为：

1. 默认 authoring path
2. 默认 viewer path
3. 默认教学路径

## 路线图

### Phase 0：产品重置

目标：在旧模型继续积累更多功能之前，先锁定目标产品形态。

交付物：

1. 确认 6 类图体系，其中 4 类为一级主视图，2 类为二级扩展视图。
2. 确认向前兼容不在当前范围内。
3. 确认 `composition` 不再是一级产品概念。
4. 确认当前产品是原型基线，而不是架构约束。

退出条件：

1. 团队把本路线图作为后续决策依据。
2. 新工作以目标视图体系为判断标准，而不是以历史路径依赖为标准。

### Phase 1：Canonical Model vNext

目标：定义一个可以直接支撑目标视图体系的新 canonical model。

新的 canonical model 应围绕以下概念展开：

1. `contexts`
2. `actors`
3. `systems`
4. `scenarios`
5. `messages`
6. `aggregates`
7. `policies`

它应将以下内容提升为一等公民：

1. bounded context ownership
2. upstream / downstream relationship
3. scenario step
4. command / event / query flow
5. lifecycle transition
6. policy / saga coordination

退出条件：

1. 定义出新的 schema version。
2. 旧 canonical 布局不再被视为设计中心。
3. 所有一级主视图都能从新模型中自然推导出来。

### Phase 2：统一分析 IR

目标：用统一的 domain knowledge graph 替代当前 graph analysis layer。

这个 IR 应从共享的语义核心出发支撑所有目标视图，而不是让每个视图分别重建语义。

它至少应表达：

1. context boundary
2. context 与 system 之间的依赖关系
3. scenario step sequence
4. message flow edge
5. aggregate state machine
6. policy coordination 与长事务链路

它还应支撑新的 validation 与 diagnostics，例如：

1. orphan scenario
2. unowned message
3. cross-context coupling smell
4. ambiguous ownership
5. unreachable lifecycle state
6. broken scenario-to-message flow

退出条件：

1. 所有目标视图都可从同一个共享 IR 投影生成。
2. diagnostics 与目标建模体系保持一致，而不再只围绕旧的 aggregate/process 模型。

### Phase 3：Viewer Contract vNext

目标：围绕目标产品重设计 viewer contract，而不是围绕当前视图集合做扩展。

新的 viewer contract 需要一等支持：

1. context node 与 context relationship
2. actor 与 external system
3. scenario step node
4. message node 与 message edge
5. lifecycle state 与 transition semantic
6. policy / orchestration link

同时，contract 也应明确区分：

1. 一级主视图
2. 二级扩展视图
3. 结构化 inspector semantic

退出条件：

1. viewer contract 直接反映新产品模型。
2. contract 不再把当前视图集合当作架构基线。

### Phase 4：Projection Layer 重写

目标：围绕目标视图体系重建 projection。

推荐实现顺序：

1. Context Map
2. Scenario Story
3. Message Flow / Trace
4. Lifecycle
5. Aggregate Boundary / Domain Structure
6. Policy / Saga

关键规则：

不要把 `composition` 重新实现为一级主视图。

如果当前 `composition` 里仍有有价值的绑定语义，应将其吸收到以下位置中：

1. Scenario Story
2. Message Flow / Trace
3. Lifecycle 的 inspector detail

退出条件：

1. 产品默认视图集合变为 4 个一级主视图。
2. 2 个二级扩展视图只在一级路径足够扎实后再引入。

### Phase 5：Viewer UX 重写

目标：让产品读起来像一个建模工具，而不是一个图数据转储器。

默认用户路径应该是：

1. 打开 Context Map
2. 选择一个 scenario
3. 查看 message flow
4. 在需要时下钻到 lifecycle

UX 优先级：

1. 视图顺序明确
2. 每个视图明确回答“它解决什么问题”
3. 支持按 context、scenario、aggregate 聚焦
4. inspector 语义强
5. 视图之间可以深链跳转

退出条件：

1. 用户无需培训也能理解每个视图为何存在。
2. 4 张一级主图形成明显且自然的阅读顺序。

### Phase 6：Authoring Workflow 重写

目标：让 CLI 和模板直接教授新的建模路径。

新的默认模板应该从以下内容开始：

1. 一个小型 context map
2. 一个核心 scenario
3. 一条 message flow
4. 一个关键 lifecycle

而不应该从以下内容开始：

1. composition 很重的对象图
2. aggregate-first 的教学顺序
3. 当前 approval workflow 作为主要心智模型

退出条件：

1. `init` 直接教授新的产品路径。
2. 示例项目体现新的建模顺序。

### Phase 7：清理旧概念

目标：当新路径可用后，移除旧的战略性概念残留。

清理范围包括：

1. 过时的视图术语
2. 旧 projection 假设
3. 只断言历史视图形态的测试
4. 把产品描述成 aggregate/process viewer 的文档

退出条件：

1. 仓库对外只讲一个产品故事。
2. 旧概念不再通过惯性持续影响新决策。

## 交付优先级

投资顺序应为：

1. canonical model
2. analysis IR
3. viewer contract
4. projection
5. viewer UX
6. CLI 模板与示例
7. cleanup

这个顺序非常重要。

如果从 UI 或某一张图的 patch 开始，我们只会在新名字下重新复制旧约束。

## 明确的非目标

这次产品重置明确不包括以下事项：

1. 向前兼容
2. 旧 canonical 文件迁移工具
3. 保留当前顶层视图集合
4. 保留 `composition` 作为一等产品能力
5. 把当前 graph model 当成最终设计中心

## 立即下一步

在本路线图之后，第一个具体交付物应是一份正式的 vNext 产品设计稿，明确：

1. 新 canonical model
2. 新 analysis IR
3. 4 张一级主图的 contract
4. 2 张二级扩展图的 contract
5. validation rule
6. 新的默认 authoring flow

这份设计稿将作为后续 schema 重写与实现工作的直接依据。
