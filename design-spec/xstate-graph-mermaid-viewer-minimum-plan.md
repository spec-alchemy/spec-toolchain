# XState Graph + Mermaid `.mmd` 最小方案稿

## 背景

当前 `design-spec/` 已经有一套最小的 `DDD + XState` 样板业务：

- 聚合 machine：[`state/machines/connection.machine.ts`](./state/machines/connection.machine.ts)
- 聚合 machine：[`state/machines/card.machine.ts`](./state/machines/card.machine.ts)
- system machine：[`state/system/connection-card-review.system.ts`](./state/system/connection-card-review.system.ts)

如果目标只是产出可查看的 Mermaid 文档，而不是 `Visual Editor` / 图形编辑能力，那么没有必要继续依赖 VS Code Visual Editor 的静态提取能力。更直接的路线是：

1. 运行时直接导入 machine logic
2. 使用 `xstate/graph` 获取图结构
3. 转换成 Mermaid `stateDiagram-v2` 文本
4. 输出 `.mmd` 文本文件，交给后续文档系统或预览工具消费

这条路线的核心价值是：

- 不依赖 `createMachine(...)` 的 AST 静态提取
- 不受 `satisfies` / helper 包装的 Editor 兼容性影响
- 只需要一层很薄的 `graph -> mermaid` 适配代码

## 目标

本方案只解决以下问题：

- 从已有 XState machine 生成可展示的状态图
- 能在文档中查看状态与 transition
- 能支持当前仓库里的简单层级状态机

本方案暂时不解决：

- 可视化编辑
- 双向同步代码与图
- 复杂布局定制
- 复杂交互式调试
- 页面内交互式 Viewer

## 推荐技术组合

最小实现推荐使用以下组合：

- `xstate/graph`
  - 负责从 machine 获取图结构和路径信息
- `mermaid`
  - 负责定义目标文本格式 `stateDiagram-v2`

校验阶段可选使用：

- `@mermaid-js/mermaid-cli`
  - 仅用于本地或 CI 校验 `.mmd` 能否被正确渲染，不是交付物本身

不建议把 `fsm2mermaid` 作为核心基础设施依赖。它可以用于快速验证方向，但不建议在正式方案里承担关键转换职责。

## 方案选择

### 主方案

主方案使用 `toDirectedGraph(machine)` 作为图数据来源。

原因：

- 能直接拿到节点、边、子节点结构
- 比单纯的 `getAdjacencyMap(...)` 更适合做图渲染
- 更容易保留复合状态的层级结构

### 辅助能力

如果后续需要补充“路径展示”或“测试路径说明”，再额外使用：

- `getShortestPaths(machine, options)`
- `getSimplePaths(machine, options)`
- `getPathsFromEvents(machine, events, options)`

这些能力适合做验证和辅助说明，不是最小 `.mmd` 方案的必需部分。

## 最小架构

```text
XState machine logic
  -> xstate/graph.toDirectedGraph(...)
  -> machine-to-mermaid serializer
  -> Mermaid text (stateDiagram-v2)
  -> .mmd file
```

## 数据边界

### 输入

- 任意一个已定义好的 XState machine logic
- 当前仓库的首批输入建议是：
  - `connectionMachine.logic`
  - `cardMachine.logic`
  - `connectionCardReviewSystem.logic`

### 输出

- 一份 Mermaid `stateDiagram-v2` 文本文件
- 文件扩展名为 `.mmd`

## 最小模块拆分

如果后续开始实现，建议只拆成两个小模块：

### 1. `machine-to-mermaid.ts`

职责：

- 接收 XState machine logic
- 调用 `toDirectedGraph(...)`
- 生成 Mermaid 文本

### 2. `generate-machine-diagram.ts`

职责：

- 选择要导出的 machine
- 调用 `machine-to-mermaid.ts`
- 将结果写入 `.mmd`

## 最小序列化策略

第一版只做“够用”的状态图，不追求完全覆盖 XState 的全部表达能力。

### 状态节点

- 原子状态输出成 Mermaid `state`
- 复合状态输出成 Mermaid `state ... { ... }`
- 最初只展示状态 `id` 或最后一段 `path`

### transition

- 输出为 `source --> target: eventType`
- 第一版只展示 `event type`
- 不在图中展示 `guard`、`actions`、`meta`、`description`

### 初始状态

- 第一版就应该显式画 `[*] --> initial`
- 对复合状态同样应保留初始箭头，否则 `.mmd` 的状态进入语义会变得不完整

### 终态

- 若 machine 中存在具名 `final state`，第一版优先保留该状态节点，再补到 `[*]` 的终止箭头
- 只有在不需要保留具名终态信息时，才直接折叠成 `[*]`
- 当前仓库的聚合 machine 较简单，第一版可以先把 final-like 结束状态按普通状态展示

## 最小伪代码

下面的伪代码说明的是模块边界，不是最终实现：

```ts
import { toDirectedGraph } from "xstate/graph";

export function machineToMermaid(machine: Parameters<typeof toDirectedGraph>[0]): string {
  const graph = toDirectedGraph(machine);
  const lines = ["stateDiagram-v2"];

  function renderNode(node: typeof graph, isRoot = false): void {
    for (const child of node.children) {
      if (child.children.length > 0) {
        lines.push(`state ${toAlias(child.id)} {`);
        renderNode(child, false);
        lines.push("}");
      } else {
        lines.push(`state "${toLabel(child.id)}" as ${toAlias(child.id)}`);
      }
    }

    for (const edge of node.edges) {
      lines.push(
        `${toAlias(edge.source.id)} --> ${toAlias(edge.target.id)}: ${edge.label.text}`
      );
    }
  }

  renderNode(graph, true);
  return lines.join("\n");
}
```

这里最关键的是两个规则：

- `id -> alias` 必须稳定，否则 Mermaid 标识符会冲突
- `id -> label` 可以更友好，但不能影响内部引用

## 当前仓库的落地建议

建议先按下面的顺序接入：

1. 先对 [`state/machines/card.machine.ts`](./state/machines/card.machine.ts) 生成图
2. 再对 [`state/machines/connection.machine.ts`](./state/machines/connection.machine.ts) 生成图
3. 最后再对 [`state/system/connection-card-review.system.ts`](./state/system/connection-card-review.system.ts) 生成图

原因：

- `card` 和 `connection` 的状态空间更小，适合验证序列化正确性
- `system` machine 更接近真实业务流程图，适合在前两者稳定后再接入

## 交付形态建议

最小可交付只采用一种形态：

### 纯文档产物 `.mmd`

- 输入 machine
- 生成 Mermaid 文本
- 将文本保存为 `.mmd`

适合：

- 设计稿
- 文档仓库
- 代码评审中的结构说明
- 后续交给 Mermaid 预览工具或文档系统消费

## 已知 trade-off

### 优点

- 不依赖 Visual Editor AST 提取
- 对 TypeScript 写法更宽容
- 实现成本低
- 适合文档和基础展示
- 交付物稳定且易于纳入版本管理

### 代价

- Mermaid 不是完整 statechart IDE
- 对复杂层级和复杂布局的表达能力有限
- 如果未来要做强交互，仍然可能需要升级到其他渲染层

## 风险与边界

第一版需要明确接受以下边界：

- 不保证完整还原所有 XState 语义
- `actions` / `guards` / `delays` 默认不进图
- 并发状态和复杂嵌套需要单独验证 Mermaid 展示效果
- 图是“展示视图”，不是“可执行定义”

## 后续升级路径

如果后续需要更强的 Viewer，而不是只产出 `.mmd`，可以按下面顺序升级：

1. 保留 `xstate/graph`
2. 将 `.mmd` 产物路线升级为图形渲染层
3. 使用 `ELK` 处理布局

这样可以保留已有图数据来源，只替换渲染层。

## 最小验收标准

当以下条件满足时，可以认为最小方案成立：

1. 能从 `cardMachine.logic` 生成 Mermaid 文本
2. 能稳定输出 `.mmd` 文件
3. 图中至少能正确展示状态节点和事件名
4. 文件能通过 Mermaid 预览工具或校验流程消费
5. 不依赖 VS Code Visual Editor 或 Stately Studio 的代码提取

## 推荐结论

对于当前仓库，最合理的基础路线是：

- 以 `xstate/graph.toDirectedGraph(...)` 作为图结构来源
- 自己维护一层很薄的 `Mermaid serializer`
- 直接输出 `.mmd` 作为交付物
- 将 Mermaid 渲染视为校验或消费环节，而不是方案主体

这条路线足够小、足够稳，也不需要重复造一套图编辑器能力。
