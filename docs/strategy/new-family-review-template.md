# 新增 Spec Family 评审模板

本模板用于评审新的 `xxx-spec` 是否应该进入 `spec-toolchain` 产品线。使用方式：

1. 发起人先对齐 [brand-constitution.md](./brand-constitution.md) 与 [terminology.md](./terminology.md)，再完整填写本文件。
2. 评审人对照 [family-admission-criteria.md](./family-admission-criteria.md) 逐项审查。
3. 若提案与 [spec-family-map.md](./spec-family-map.md) 的产品结构冲突，应先修正提案或先修订结构图，不得在评审中临时改写战略定义。
4. 若结论为继续推进，再进入具体 schema、CLI、`viewer`、tests 设计。

---

## 1. 候选 Family 基本信息

- 名称：
- 简述：
- 当前阶段：`idea` / `exploration` / `proposal` / `approved`
- 发起人：
- 评审日期：

## 2. 设计域定义

- 它解决的设计域是什么？
- 这个设计域为什么稳定、可重复，而不是一次性文档需求？
- 核心对象有哪些？
- 核心关系、状态、约束有哪些？

## 3. `source of truth`

- canonical 输入是什么？
- 为什么它适合作为 machine-readable、diff-friendly 的 `source asset`？
- 冲突时以什么为准？
- 哪些内容是源资产，哪些内容是衍生产物？

## 4. Shared Kernel 接入方式

- 入口文件与目录约定是什么？
- 输出目录与 `artifact` 清单是什么？
- `schema validation` 负责什么？
- `semantic validation` 负责什么？
- `analysis` 会产出什么结构化结果？
- `generation` 会产出什么可消费结果？
- `viewer` 是否需要；若需要，inspection `contract` 是什么？

## 5. Runtime Surfaces

至少列出 2 个已成立或预计成立的 runtime surfaces，并说明其价值：

- `analysis`：
- `generation`：
- `viewer`：
- `execution`：

## 6. 跨 Spec 关系

- 它会链接哪些现有 family？
- 链接锚点是什么 `stable ID` 或 canonical key？
- 上游变更后，如何阻断下游漂移？
- 是否需要 coverage / traceability / evidence chain？

## 7. 用户与消费方

- 主要用户是谁？
- 次要用户是谁？
- 主要消费方是人、agent、CI，还是下游工具？
- canonical workflow 是什么？

## 8. 证据与回归计划

- 最小可用示例是什么？
- 至少 3 个失败用例是什么？
- 端到端演示路径是什么？
- 将新增哪些回归测试？
- 会影响哪些现有命令、包边界或 skill？

## 9. 非目标与边界

- 这个 family 明确不解决什么问题？
- 它与相邻 family 的边界是什么？
- 为什么它不应该只是现有 family 的一个子模块？

## 10. 评审结论

- 结论：`reject` / `revise` / `approve for exploration` / `approve`
- 主要理由：
- 必须补齐的缺口：
- 下一次复审时间：
- 是否需要先修订战略文档：`no` / `brand-constitution` / `spec-family-map` / `family-admission-criteria` / `terminology`
