# DDD Spec 包命名与发布边界决策

## 1. 文档定位

本文件固化默认工作区命名收敛与版本重置期间的 package naming 与 release strategy 边界。

从本文件生效开始：

- 公开发布边界继续以 `packages/ddd-spec-cli/` -> `@knowledge-alchemy/ddd-spec` -> `ddd-spec` 为准。
- schema version 与 viewer spec version 的重置，不自动推导为 npm package semver 重置。
- 如果 `product-design.md` 中关于长期演化空间的表述与本文件冲突，以本文件为准；本文件负责当前实现范围内的公开发布边界。

## 2. 已确定边界

1. 本次不改公开包名 `@knowledge-alchemy/ddd-spec`。
2. 本次不改 CLI 名 `ddd-spec`。
3. 本次不改当前单一公开包边界 `packages/ddd-spec-cli/`。
4. 当前 release 流程继续只对 `@knowledge-alchemy/ddd-spec` 做 versioning、dry-run 与 publish handoff。
5. domain model schema version reset 与 viewer spec version reset 只代表产品 contract 轴线重置，不等于 npm package semver reset。
6. repo-private package、workspace、fixture、example 与 maintainer workflow 可以继续按私有实现需要调整，但不得隐含改变公开发布边界。
7. 如果未来需要重命名公开包、重命名 CLI、拆分公开包，必须另立 story 或 PRD，并附带独立 release plan。

## 3. 版本轴线说明

以下轴线必须继续分离：

1. `ddd-spec` 产品名、CLI 名与 `@knowledge-alchemy/ddd-spec` 公开 npm 包名。
2. domain model schema version。
3. viewer spec version。
4. npm package semver。

本次默认命名收敛只重置第 2、3 轴的默认 contract 起点，不重置第 1、4 轴。

这意味着：

- release note 可以说明 schema version 与 viewer spec version 已重置为 `1`。
- changesets 仍然要基于 `@knowledge-alchemy/ddd-spec` 的公开发布语义决定 semver bump。
- 不能因为 schema 从 `3` 回到 `1`，就暗示 npm 包也要回到 `1.0.0` 或更名发布。

## 4. 对发布流程的约束

- `npm run changeset`、`npm run changeset:status` 与 `npm run release:dry-run` 都继续围绕 `@knowledge-alchemy/ddd-spec`。
- `RELEASING.md`、`.changeset/README.md`、root README 与包 README 必须显式说明：本轮 reset 不包含公开包重命名。
- 如果后续 story 要调整公开发布边界，必须同步更新 authority 文档、release 文档、changesets 配置与发布脚本；不能只改实现或只改文案。

---

*文档版本：v1.0*
*最后更新：2026-03-27*
*状态：package naming 与 release strategy 边界已固化*
