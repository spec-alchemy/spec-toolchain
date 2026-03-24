# Canonical Boundary And Analysis

## Purpose

这份文档回答两个问题：

- `canonical/` 是否应该自己承载全部校验与检测逻辑
- 如果不承载，外部应如何组织 `XState`、图分析与更强验证工具

结论很明确：

- `canonical/` 应只承载业务事实真相
- 校验、检测、可视化、运行时投影都应位于 `canonical` 边界之外
- `XState` 可以作为重要下游，但不应反向成为业务真相源

## Core Principle

`canonical/` 的职责不是“自己证明自己”，而是以结构化、无歧义、可投影的方式表达业务真相。

更准确地说，`canonical/` 负责的是：

- 对象
- 生命周期
- 命令
- 事件
- 聚合内部的 `command -> target lifecycle -> emitted event`
- 跨聚合流程的阶段、推进关系、终局结果

而以下内容应属于边界外能力：

- 结构校验
- 语义校验
- 图分析
- 可达性检测
- 死路检测
- 路径生成
- Viewer / Diagram
- 运行时状态机投影
- 更强形式化验证

这种分层更接近：

- `canonical` = business AST / source of truth
- validator / analyzer = compiler passes
- `XState` / Mermaid / formal tools = projections and consumers

## Recommended Architecture

建议按以下分层组织：

```text
canonical YAML
  -> bundle
  -> schema validation
  -> semantic validation
  -> graph IR
  -> analyzers
  -> optional projections
       -> XState
       -> Mermaid
       -> other consumers
       -> formal specs
```

对应职责如下：

- `canonical/`
  只定义业务事实，不放运行时函数，不放 UI/editor 专属语义
- `schema/`
  保证结构合法
- `tools/spec.ts` + `tools/semantic-validation.ts` + `tools/schema-validation.ts`
  保证 canonical 的读取与当前约定下的校验一致性
- `graph IR`
  把流程和聚合动作转换为统一图模型，作为通用分析入口
- `analyzers`
  在图层做可达性、死路、孤岛节点、闭环等检测
- `state/`
  作为一种可选的 TypeScript/XState 投影，而不是第一真相
- `tools/diagram/*`
  作为围绕 graph IR 的展示产物生成工具，而不是业务真相

## What Canonical Should Express

当前 `canonical` 适合表达的是“静态且声明式”的业务真相：

- 某个对象有哪些生命周期状态
- 某个命令作用于哪个对象
- 某个事件由哪个对象发出
- 某个聚合在某个状态下接受什么命令
- 接受命令后迁移到哪个生命周期
- 会发出哪个领域事件
- 某个流程有哪些阶段
- 某个阶段接受哪些命令
- 某个阶段观察哪些事件
- 某个事件会把流程推进到哪个阶段
- 哪些阶段是终局阶段，终局结果是什么

这些内容天然适合做“唯一真相”，因为它们是业务定义本身，不依赖某个运行时框架。

## What Canonical Should Not Express

以下内容不建议直接塞进 `canonical`：

- `XState` 的 action/guard function 实现
- UI/editor 专属字段
- Mermaid 专属布局语义
- 运行时副作用实现
- TypeScript 特有类型技巧
- 为某个语言适配器硬写的二次结构

原因不是这些内容不重要，而是它们不是“业务事实本身”。

一旦这些内容混入 `canonical`，就会出现两个问题：

- 真相源被某个技术栈反向绑架
- 非 TypeScript / 非 XState 消费方失去一等公民地位

## Reachability And Dead-End Detection

像“可达性”“死路”“孤岛节点”“无法闭环”这类问题，本质上都属于图分析问题，不属于 `canonical` 本体。

推荐把它们设计成外部 pass：

- 输入：bundled canonical spec
- 中间层：graph IR
- 输出：诊断结果

这比直接把检测逻辑绑到 `XState` 更稳妥，原因有三点：

- 图分析与某个运行时框架解耦
- Java / Python / QA 也能消费同一份诊断结果
- 可以同时支持多种下游投影，而不需要把检测写死在 TS/XState 侧

最值得优先实现的分析项通常是：

- 不可达状态
- 不可达流程阶段
- 无入口节点
- 非预期死路节点
- 能开始但无法结束的流程
- 环与自循环检测
- 终局结果缺失或不可达

## XState's Proper Role

`XState` 是很好的下游消费者，但不应是上游真相源。

适合让 `XState` 负责的事情：

- 状态机 Viewer
- 运行时仿真
- 事件驱动编排示例
- TypeScript 侧模型测试
- 路径生成与覆盖辅助

不适合让 `XState` 独占的事情：

- 业务真相定义
- 跨语言统一消费入口
- 与某个 editor 强绑定的建模格式
- 所有层级的语义校验

换句话说，应当是：

- `canonical -> XState`

而不是：

- `XState -> 反推 canonical`

## Tooling Options

### 1. JSON Schema + Semantic Validator

这是最基础也最必要的一层。

适合做：

- 结构约束
- 引用完整性
- payload 字段映射一致性
- 生命周期合法性
- process 定义闭合性

这层应当长期保留，因为它与具体运行时无关。

### 2. Graph Analyzer

这是最值得你们自己掌握的一层。

适合做：

- reachability
- dead-end detection
- orphan node detection
- cycle detection
- process closure analysis

这类分析直接基于 `canonical` 的图语义即可，不必依赖 `XState` 才能成立。

### 3. XState / xstate graph

这是工程上很实用的一层，但应视为 projection。

适合做：

- TS 侧状态机投影
- shortest/simple paths
- adjacency inspection
- model-based testing 辅助
- 可视化与调试

需要注意的是，`XState` 更偏工程分析与运行时模型，不等于完整形式化验证。

### 4. Mermaid

`Mermaid` 只适合做 Viewer，不适合做验证内核。

适合做：

- 静态图展示
- 文档嵌入
- PR / README 中快速沟通

不适合做：

- 语义校验
- 可达性证明
- 死路分析

### 5. TLA+ / Quint / Apalache

这是更强的规格验证路线，适合在未来确实需要时引入。

适合做：

- 不变量验证
- 活性 / 必达性质
- 死锁类问题
- 更复杂的并发和时间语义

不适合作为当前最小方案的默认入口，因为：

- 心智负担高
- 建模成本高
- 对当前样板规模而言性价比偏低

## Practical Recommendation

对当前仓库，最合理的路线不是“全部押在 `XState` 上”，而是：

1. 保持 `canonical/` 只表达事实真相
2. 保持现有 schema + semantic validator
3. 新增一层基于 canonical 的 graph analyzer
4. 继续保留 `state/` 作为 `XState` 示例投影
5. 把 `Mermaid` 仅当作文档 Viewer
6. 暂不引入更重的形式化工具，除非后续真的出现不变量、活性、并发正确性需求

## Boundary Decision

关于“可达性、死路检测是否应该进入 canonical 边界内”，建议统一采用以下判断：

- 如果它是业务事实本身，就进入 `canonical`
- 如果它是对业务事实的检查、推导、证明或展示，就放在边界外

因此：

- 生命周期定义：在 `canonical`
- `command -> event` 真相：在 `canonical`
- process stage 推进关系：在 `canonical`
- reachability report：在边界外
- dead-end report：在边界外
- XState machine：在边界外
- Mermaid diagram：在边界外

## Current Repo Guidance

对当前仓库，可直接遵守以下规则：

- 不要为了 `XState Visual Editor` 或某个 Viewer 去污染 `canonical`
- 不要在 `state/` 中发明第二份业务规则
- 新的校验需求，优先考虑新增 analyzer pass，而不是把计算逻辑塞进 YAML
- 如果未来要给 Java、Python、QA 使用，优先消费 bundled JSON artifact，而不是依赖 TypeScript 投影

## Summary

最稳妥的设计不是让 `canonical` 既当真相源、又当运行时、又当检测器，而是让它成为唯一事实源，然后把所有校验、分析、投影能力都放在边界之外。

这条路线同时满足：

- DDD 中“业务语义优先”
- 第一真相唯一
- 跨语言消费
- 工程可验证性
- 工具可替换性

在这套边界下，`XState` 是有价值的，但它应当是消费者，不应成为事实来源。
