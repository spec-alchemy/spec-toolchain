# Visualization Strategy And Roadmap

## Current Direction

当前可视化策略已经收敛：

- 不再维护 Mermaid 图产物
- 不再维护 XState 示例投影
- 唯一维护的可视化入口是 `viewer-spec.json -> React Flow + ELK viewer`

这意味着仓库中的可视化职责已经非常明确：

- `canonical/` 表达业务事实
- `graph IR` 和 analyzer 提供结构化分析语义
- viewer projection 生成可交互浏览所需的 JSON contract
- React viewer 负责布局、渲染、筛选和交互

## Why This Direction

保留多套旧投影的主要问题不是“代码多一点”，而是边界会重新变脏：

- 团队会误以为 Mermaid 仍是正式输出
- 团队会误以为 XState 仍是当前建模验证路径
- 文档、脚本和产物会持续出现双轨甚至三轨表达

对当前仓库而言，更好的选择是：

- 用 analyzer 承担可达性和死路检测
- 用 viewer 承担业务可视化
- 用 TypeScript projection 承担类型化消费入口

## Near-Term Roadmap

下一阶段更值得投入的是：

1. 强化 viewer contract 的稳定性
2. 给 viewer JSON 和 analysis JSON 增加 golden tests
3. 提升 viewer 的通用加载能力，而不是恢复旧图产物
