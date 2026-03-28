# DDD Spec Master Brief

这是 `docs/ddd-spec/` 的主入口文档。

本目录用于承接 `ROADMAP.md` 之后的正式产品定义，供后续 schema、IR、viewer、CLI 与文档改造统一引用。

## 1. 文档角色

- [`ROADMAP.md`](../../ROADMAP.md)
  - 回答“为什么要做这次产品重置，以及总体路线是什么”
- [`default-workspace-reset.md`](./default-workspace-reset.md)
  - 回答“默认工作区、默认术语、schema version 与 viewer spec version 现在应该如何收敛”
- [`package-release-boundary.md`](./package-release-boundary.md)
  - 回答“这次 reset 不改变哪些公开发布边界，以及 schema/version reset 与 npm semver 是什么关系”
- [`product-design.md`](./product-design.md)
  - 回答“当前产品到底是什么，后续实现必须遵循什么”
- [`domain-model-schema.md`](./domain-model-schema.md)
  - 回答“当前 domain model schema 到底长什么样，schema version 和目录布局如何定义”
- [`viewer-system-i18n.md`](./viewer-system-i18n.md)
  - 回答“viewer 系统级中英文切换的边界、默认语言、优先级与 locale artifact 命名现在如何定义”
- [`browser-validation/domain-model-surface-reset.md`](./browser-validation/domain-model-surface-reset.md)
  - 记录默认工作区命名收敛与版本重置后的浏览器验证证据
- [`browser-validation/viewer-system-i18n-us003.md`](./browser-validation/viewer-system-i18n-us003.md)
  - 记录 viewer 语言 URL 解析、刷新持久化与外部 artifact locale fallback 的浏览器验证证据
- [`browser-validation/viewer-system-i18n-us004.md`](./browser-validation/viewer-system-i18n-us004.md)
  - 记录顶部语言切换入口、菜单选项、手动切换与外部 artifact fallback 提示的浏览器验证证据
- [`browser-validation/viewer-system-i18n-us005.md`](./browser-validation/viewer-system-i18n-us005.md)
  - 记录 viewer 前端系统文案在 `zh-CN` 下的浏览器验证证据，以及业务文本保持原样的边界
- [`browser-validation/viewer-system-i18n-us007.md`](./browser-validation/viewer-system-i18n-us007.md)
  - 汇总 viewer i18n contract、回归测试、`npm run verify` 与浏览器关键路径，作为 US-007 收尾验证记录

## 2. 推荐阅读顺序

1. [`ROADMAP.md`](../../ROADMAP.md)
2. [`default-workspace-reset.md`](./default-workspace-reset.md)
3. [`package-release-boundary.md`](./package-release-boundary.md)
4. [`product-design.md`](./product-design.md)
5. [`domain-model-schema.md`](./domain-model-schema.md)
6. [`viewer-system-i18n.md`](./viewer-system-i18n.md)
7. [`browser-validation/domain-model-surface-reset.md`](./browser-validation/domain-model-surface-reset.md)
8. [`browser-validation/viewer-system-i18n-us003.md`](./browser-validation/viewer-system-i18n-us003.md)
9. [`browser-validation/viewer-system-i18n-us004.md`](./browser-validation/viewer-system-i18n-us004.md)
10. [`browser-validation/viewer-system-i18n-us005.md`](./browser-validation/viewer-system-i18n-us005.md)
11. [`browser-validation/viewer-system-i18n-us007.md`](./browser-validation/viewer-system-i18n-us007.md)

## 3. 当前稳定结论

- `ROADMAP.md` 只保留战略方向。
- `default-workspace-reset.md` 是默认工作区、默认术语、schema version 与 viewer spec version 的最高优先级依据。
- `package-release-boundary.md` 是 package naming、release strategy、公开包边界与 semver 轴线的最高优先级依据。
- `product-design.md` 继续定义产品语义、默认阅读路径与建模顺序。
- `product-design.md` 中关于长期演化空间的背景说明，不改变当前 reset 范围以内的 package / CLI naming；这些边界以 `package-release-boundary.md` 为准。
- `domain-model-schema.md` 是当前 domain model 结构、schema version 与目录布局的 authority。
- `viewer-system-i18n.md` 是 viewer 系统级多语言边界、默认语言、优先级与 locale artifact 规则的 authority。
- 当前产品明确不做向前兼容，不以历史模型 schema、当前 graph analysis、当前 viewer 视图集合作为设计约束。
- 新的默认工作区固定为 `domain-model/`，默认入口固定为 `domain-model/index.yaml`，顶层集合容器继续使用 `model`。
- 新的默认用户 surface 中移除 `canonical` 与 `vNext`，schema version 与 viewer spec version 都重置为 `1`。
- 旧的 `objects / commands / events / aggregates / processes` 只代表已移除的历史模型，不再代表当前设计中心。
- `composition` 退出一级主视图，不再作为默认用户路径或默认建模入口。
- 产品默认路径固定为：`Context Map -> Scenario Story -> Message Flow / Trace -> Lifecycle`。
- `Aggregate Boundary / Domain Structure` 与 `Policy / Saga` 是二级扩展图，只在一级路径已经成立后再引入。
- repo 级 maintainer 默认门禁与 viewer 演示入口应始终指向仓库跟踪的默认 domain model 示例。
- 当前产品名、CLI 名与公开 npm 包边界继续保留 `ddd-spec` / `@knowledge-alchemy/ddd-spec`；如需重命名，必须另立 story。
- schema version reset 与 viewer spec version reset 不等于 npm package semver reset；release 仍沿用现有公开包历史。

## 4. 对后续 Story 的约束

- 后续 story 如果涉及默认工作区目录、默认入口、默认用户术语、schema version 或 viewer spec version，必须以 [`default-workspace-reset.md`](./default-workspace-reset.md) 为准。
- 后续 story 如果涉及公开包名、CLI 名、release strategy、changesets 语义或 semver 轴线，必须以 [`package-release-boundary.md`](./package-release-boundary.md) 为准。
- 后续 story 如果涉及产品语义、建模顺序、视图职责或默认用户路径，必须以 [`product-design.md`](./product-design.md) 为准。
- 后续 story 如果涉及 domain model schema version、目录布局、index 结构或概念文件职责，必须以 [`domain-model-schema.md`](./domain-model-schema.md) 为准。
- 后续 story 如果涉及 viewer 系统文案、语言切换、locale artifact 命名、URL `lang` 参数或语言回退策略，必须以 [`viewer-system-i18n.md`](./viewer-system-i18n.md) 为准。
- 如果 `default-workspace-reset.md` 与旧的历史阶段命名文档冲突，以 `default-workspace-reset.md` 为准。
- 如果 `package-release-boundary.md` 与旧的历史阶段命名文档冲突，以 `package-release-boundary.md` 为准。
- 如果 `ROADMAP.md` 与正式设计稿在产品定义层面出现冲突，以正式设计稿与决策文档为准。
- 新增子文档时，优先补充到正式设计稿；只有在内容规模明显超出主文档时才拆分，并必须在本文件登记。

---

*文档版本：v1.8*
*最后更新：2026-03-28*
*状态：主入口、schema authority、viewer 系统级 i18n authority 与关键浏览器验证记录已建立，并补齐 US-007 的聚合验证收尾记录*
