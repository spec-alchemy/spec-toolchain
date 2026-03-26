# DDD Spec vNext Master Brief

这是 `docs/ddd-spec/` 的主入口文档。

本目录用于承接 `ROADMAP.md` 之后的正式产品定义，供后续 schema、IR、viewer、CLI 与文档改造统一引用。

## 1. 文档角色

- [`/Users/tella/Development/knowledge-alchemy-app-v2/ROADMAP.md`](../../ROADMAP.md)
  - 回答“为什么要做这次产品重置，以及总体路线是什么”
- [`/Users/tella/Development/knowledge-alchemy-app-v2/docs/ddd-spec/vnext-product-design.md`](./vnext-product-design.md)
  - 回答“vNext 产品到底是什么，后续实现必须遵循什么”
- [`/Users/tella/Development/knowledge-alchemy-app-v2/docs/ddd-spec/vnext-canonical-schema.md`](./vnext-canonical-schema.md)
  - 回答“vNext canonical 到底长什么样，schema version 和目录布局如何定义”

## 2. 推荐阅读顺序

1. [`/Users/tella/Development/knowledge-alchemy-app-v2/ROADMAP.md`](../../ROADMAP.md)
2. [`/Users/tella/Development/knowledge-alchemy-app-v2/docs/ddd-spec/vnext-product-design.md`](./vnext-product-design.md)
3. [`/Users/tella/Development/knowledge-alchemy-app-v2/docs/ddd-spec/vnext-canonical-schema.md`](./vnext-canonical-schema.md)

## 3. 当前稳定结论

- `ROADMAP.md` 只保留战略方向；`vnext-product-design.md` 是产品语义与默认用户路径的唯一依据。
- `vnext-canonical-schema.md` 是 vNext canonical schema version、目录布局与最小文件职责的实现依据。
- vNext 明确不做向前兼容，不以当前 canonical schema、当前 graph analysis、当前 viewer 视图集合作为设计约束。
- vNext canonical 已正式定义为 `version: 3`，并以 `contexts / actors / systems / scenarios / messages / aggregates / policies` 为顶层概念。
- 旧的 `objects / commands / events / aggregates / processes` 只代表仍在运行中的 `v2` runtime，不再代表 vNext 设计中心。
- `composition` 退出一级主视图，不再作为默认用户路径或默认建模入口。
- 产品默认路径固定为：`Context Map -> Scenario Story -> Message Flow / Trace -> Lifecycle`。
- `Aggregate Boundary / Domain Structure` 与 `Policy / Saga` 是二级扩展图，只在一级路径已经成立后再引入。
- 当前公开 npm 包边界不是 vNext 设计约束；如有必要，后续 story 可以重定义公开包边界。

## 4. 对后续 Story 的约束

- 后续 story 如果涉及产品语义、建模顺序、视图职责或默认用户路径，必须以 [`/Users/tella/Development/knowledge-alchemy-app-v2/docs/ddd-spec/vnext-product-design.md`](./vnext-product-design.md) 为准。
- 后续 story 如果涉及 canonical schema version、目录布局、index 结构或概念文件职责，必须以 [`/Users/tella/Development/knowledge-alchemy-app-v2/docs/ddd-spec/vnext-canonical-schema.md`](./vnext-canonical-schema.md) 为准。
- 如果 `ROADMAP.md` 与正式设计稿在产品定义层面出现冲突，以正式设计稿为准。
- 新增子文档时，优先补充到正式设计稿；只有在内容规模明显超出主文档时才拆分，并必须在本文件登记。

---

*文档版本：v1.1*
*最后更新：2026-03-27*
*状态：主入口与 schema authority 已建立*
