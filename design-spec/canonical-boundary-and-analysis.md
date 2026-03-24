# Canonical Boundary And Analysis

## Purpose

这份文档只回答当前实现下的边界问题：

- `canonical/` 应该承载什么
- 校验、分析和可视化应该放在哪里

当前结论是：

- `canonical/` 只表达业务事实真相
- 校验和分析属于 compiler pass
- 当前唯一维护的可视化消费端是 `viewer-spec.json -> React Flow + ELK viewer`

## Boundary

`canonical/` 负责：

- object / command / event / aggregate / process / vocabulary
- 生命周期、命令处理、事件发出、流程阶段推进

`canonical/` 不负责：

- 运行时实现
- UI 布局
- 编辑器语义
- projection 专属字段

## Compiler Layers

当前推荐分层：

```text
canonical YAML
  -> bundle
  -> schema validation
  -> semantic validation
  -> graph IR
  -> analyzers
  -> projections
       -> TypeScript
       -> Viewer JSON
       -> other downstreams
```

这意味着：

- schema validation 保证结构合法
- semantic validation 保证领域约束闭合
- graph analyzer 负责 reachability / dead-end / orphan diagnostics
- viewer 只消费已经生成好的 viewer contract

## Current Decision

当前仓库已经明确放弃两类 projection：

- Mermaid diagrams
- XState example projection

原因不是它们毫无价值，而是它们已经不再是当前产品方向的一部分。继续保留只会带来三类问题：

- 维护成本和构建噪音
- 过时文档误导
- 让“viewer 是唯一可视化入口”的边界重新变模糊

## Practical Rule

后续如果需要新增 projection，应满足两点：

1. 它必须只是下游消费者，不能反向污染 canonical。
2. 它必须服务清晰的真实场景，而不是为了“也许以后有用”而保留。
