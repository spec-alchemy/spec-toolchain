# Visualization Strategy And Roadmap

这份文档回答一个具体问题：

- 当 `canonical/` 已经成为唯一真相后，如何把它投影成能体现复用关系、层级关系、父子关系的可视化产物

结论先说：

- 不应再把某一种图语言当成事实真相
- 应把可视化视为 `canonical` 的下游投影层
- 不应追求“一张万能图”
- 当前最适合的路线是：
  - 短期：`Graphviz DOT` 生成稳定静态图
  - 中期：`React Flow + ELK` 构建交互式 Viewer

## Problem Definition

当前最核心的展示诉求不是“把状态画出来”，而是同时表达三类关系：

- 复用关系：`connection-card-review` 复用了哪些 aggregate
- 绑定关系：某个 `process stage` 绑定到哪个 `aggregate.state`
- 推进关系：`command -> aggregate transition -> event -> next stage`

如果强行只用一种轻量文档图语法，通常只能把其中一部分画清楚，另外一部分会退化为注释或命名约定。

因此，更合理的做法是：

- `canonical/` 只表达业务事实
- `tools/` 把事实投影成不同图视图
- 每种图只承担一种主要表达任务

## Non-Goals

本路线不追求以下目标：

- 让图 DSL 反向成为第一真相
- 把 `viewer` 专属布局语义塞回 `canonical`
- 为了某个编辑器或某个图工具去污染业务建模
- 追求“一张图同时服务文档、分析、交互、演示、编辑”

## Evaluation Criteria

评估图形方案时，建议只看这几项：

- 是否天然支持层级/父子节点
- 是否能表达跨层级连线
- 是否能稳定布局，避免每次生成都抖动
- 是否能由脚本稳定生成
- 是否能保持 `canonical -> projection` 的单向关系
- 是否适合后续前端做交互式 viewer

## Options

### 1. Graphviz DOT

适合定位：

- 静态图主产物
- CI 生成 SVG / PNG / PDF
- 文档嵌入

优点：

- 成熟度最高
- `dot` 非常适合有向分层图
- `cluster`、`compound=true`、`lhead`、`ltail` 这类机制很适合表达父子边界和跨边界连线
- 输出稳定，适合版本化比对

不足：

- 交互能力弱
- 前端内嵌体验一般
- 样式定制不如前端自绘灵活

适合你们的视图：

- `composition view`
- `lifecycle view`
- `trace view`

结论：

- 如果现在就要把“层级关系和复用关系”画清楚，`Graphviz DOT` 是最稳的短期方案

### 2. React Flow + ELK

适合定位：

- 交互式业务 Viewer
- 浏览、折叠、高亮、定位、筛选
- 后续前端产品化

优点：

- `React Flow` 提供成熟的节点交互能力
- 支持 `parentId` / sub flow / group node
- `ELK` 能提供层级图自动布局，适合 `process -> aggregate -> state` 这类结构
- 很适合从 `canonical` 生成前端节点边数据后直接渲染

不足：

- 实现成本高于静态图
- 需要维护前端 viewer 代码
- 布局与渲染是两层系统，需要自己定义投影协议

结论：

- 这是最值得做的中期路线
- 如果未来要给产品、前端、服务端、QA 共用一个交互 Viewer，这条路最合适

### 3. Cytoscape.js

适合定位：

- 图探索型 Viewer
- 关系查询、过滤、聚焦、分析

优点：

- 官方原生支持 `compound nodes`
- 父子关系是图模型一级概念，不是纯视觉 grouping
- 对大型关系图的遍历、筛选、联动能力强

不足：

- 默认视觉更偏图数据库/关系图，不像流程图那样天然“业务友好”
- 如果你们想要的是流程编排观感，通常还需要做额外 UI 包装

结论：

- 如果以后你们更关心“探索业务关系网”，它优于 Mermaid
- 但当前不是最优的第一落点

### 4. D2

适合定位：

- 比 Mermaid 强一些的文档图 DSL
- 轻量静态图

优点：

- 文本化
- 支持 `containers`
- 产物比 Mermaid 更适合表达分组关系

不足：

- 仍然主要是文档图 DSL
- 不适合作为长期交互 viewer 底座
- 可分析性和可编程性不如 Graphviz / React Flow + ELK

结论：

- 如果只想替换 Mermaid、但不想进入前端 viewer 开发，`D2` 是可行备选
- 但从长期路线看，不如 Graphviz + React Flow/ELK 的组合清晰

### 5. BPMN / bpmn.io

适合定位：

- 给业务方展示标准化流程
- 泳道、子流程、流程语义

优点：

- 业务流程表达成熟
- 有现成 viewer / editor

不足：

- 不擅长表达 DDD aggregate lifecycle 复用
- 很容易把你们的建模问题扭成 BPMN 的问题

结论：

- 适合作为某些“流程视图”的附加投影
- 不适合作为当前主方案

## Why Mermaid Should Not Be The Main Path

`Mermaid` 仍然可以保留，但不应该继续作为主路径依赖。

原因不是它不能画图，而是它不适合长期承担以下任务：

- 清晰表达层级边界
- 稳定表达父子节点
- 承担复杂交互 viewer
- 成为未来演进的主要可视化底座

因此，更合理的定位是：

- `Mermaid` = 轻量文档嵌入
- `Graphviz DOT` = 静态正式图产物
- `React Flow + ELK` = 中期交互 Viewer

## Recommended Route

### Short Term

推荐直接采用：

- `canonical -> graph IR -> Graphviz DOT -> SVG`

短期目标：

- 先把“复用关系、绑定关系、层级关系”稳定画清楚
- 生成可提交、可预览、可比对的静态图产物
- 不引入新的前端 viewer 工程负担

建议输出三类视图：

- `composition view`
  - 表达 `process -> stage -> aggregate.state`
- `aggregate lifecycle view`
  - 表达单个 aggregate 的生命周期
- `trace view`
  - 表达 `command -> event -> next stage` 的业务链路

短期不建议做：

- 在线编辑器
- 双向同步
- 图上直接修改业务真相

### Mid Term

中期推荐采用：

- `canonical -> graph IR -> viewer graph JSON -> React Flow + ELK`

中期目标：

- 支持节点折叠/展开
- 点击 stage 高亮对应 aggregate/state
- 支持按 aggregate / process / command / event 过滤
- 支持“从某个 command 看会触发哪些业务路径”

建议中期 viewer 至少具备：

- 视图切换
  - `composition`
  - `lifecycle`
  - `trace`
- 侧边详情面板
- 节点高亮与关系追踪
- 从 canonical 重新生成前端图数据

## Suggested Projection Model

为了避免未来图层再次绑死到某个工具，建议把图投影协议显式化。

建议在 `tools/` 内部保持一层通用 viewer graph：

```text
canonical
  -> graph IR
  -> viewer graph JSON
       -> Graphviz DOT
       -> Mermaid
       -> React Flow
       -> other viewers
```

这样做的价值是：

- `canonical` 不依赖任何图工具
- 各种图产物共享一套投影语义
- 后续替换渲染层时不用改业务真相

## Decision

基于当前仓库状态，建议明确采用以下路线：

1. 停止把 `Mermaid` 当作主可视化承载方案
2. 把 `Graphviz DOT` 作为下一步最值得落地的静态图方案
3. 把 `React Flow + ELK` 作为中期交互 Viewer 方向
4. 保持 `canonical` 只表达事实，不吸收任何 viewer 专属语义

## References

- Graphviz `dot`
  - https://graphviz.org/docs/layouts/dot/
- React Flow `Sub Flows`
  - https://reactflow.dev/learn/layouting/sub-flows
- Eclipse Layout Kernel
  - https://eclipse.dev/elk/
- Cytoscape.js
  - https://js.cytoscape.org/
- D2
  - https://d2lang.com/
- bpmn.io
  - https://bpmn.io/
