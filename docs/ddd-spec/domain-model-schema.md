# DDD Spec Domain Model Schema

## 1. 文档定位

本文件定义当前 domain model schema 与目录布局。

从本文件生效开始：

- `version: 1` 是当前 domain model 的正式 schema version。
- `domain-model/index.yaml` 是当前零配置工作区的正式默认入口。
- `contexts / actors / systems / scenarios / messages / aggregates / policies` 是当前产品的顶层建模概念。
- 旧的 `objects / commands / events / aggregates / processes` 只代表已移除的历史实现，不再代表当前设计中心。
- 公开包名与 npm package semver 继续沿用现有发布边界；schema version reset 不改变 `ddd-spec` / `@knowledge-alchemy/ddd-spec` 的命名。

如果后续 loader、validation、IR 或 CLI 模板实现与本文件冲突，以本文件为准。

## 2. 稳定结论

1. `domain-model/index.yaml` 使用 `model` 作为顶层集合容器，不再使用旧的 `domain.objects / commands / events / processes` 心智。
2. `model.contexts`、`model.actors`、`model.systems`、`model.scenarios`、`model.messages`、`model.aggregates`、`model.policies` 这 7 个键必须同时存在。
3. index 中每个集合引用支持两种形态：
   - 单个字符串：表示一个目录，例如 `./messages`
   - 字符串数组：表示显式文件集合，例如 `["./messages/a.message.yaml", "./messages/b.message.yaml"]`
4. `messages` 是统一抽象，使用 `messageKind = command | event | query` 区分类型。
5. `aggregate` 不再依赖 `objectId` 作为 schema 中心；它直接表达所属 context、states、initialState 与 transitions。
6. `policy` 是一等概念，即使第一版 UI 暂不以它为主视图，也必须在 domain model 中拥有稳定目录与 schema。
7. schema version reset 只定义建模 contract，不定义 npm package semver；发布边界继续以 `ddd-spec` / `@knowledge-alchemy/ddd-spec` 为准。

## 3. 推荐目录布局

推荐根目录布局如下：

```text
domain-model/
  index.yaml
  contexts/
  actors/
  systems/
  scenarios/
  messages/
  aggregates/
  policies/
```

推荐文件命名：

- `contexts/*.context.yaml`
- `actors/*.actor.yaml`
- `systems/*.system.yaml`
- `scenarios/*.scenario.yaml`
- `messages/*.message.yaml`
- `aggregates/*.aggregate.yaml`
- `policies/*.policy.yaml`

## 4. Index 结构

最小 index 示例：

```yaml
version: 1
id: approval-flow
title: Approval Flow
summary: Minimal domain model example centered on context, scenario, message flow, lifecycle, and a follow-up policy.
model:
  contexts: ./contexts
  actors: ./actors
  systems: ./systems
  scenarios: ./scenarios
  messages: ./messages
  aggregates: ./aggregates
  policies: ./policies
```

## 5. 概念文件的最小职责

| 目录 | 作用 | 当前最小必填语义 |
|------|------|------------------|
| `contexts/` | 声明 bounded context 与 ownership | `owners`、`responsibilities` |
| `actors/` | 声明触发业务动作的人或角色 | `title`、`summary` |
| `systems/` | 声明外部或跨边界系统 | `title`、`summary` |
| `scenarios/` | 声明默认业务故事和有序 steps | `goal`、`ownerContext`、`steps` |
| `messages/` | 声明统一消息抽象 | `messageKind`、`producers`、`consumers` |
| `aggregates/` | 声明生命周期复杂度 | `context`、`states`、`initialState`、`transitions` |
| `policies/` | 声明跨步骤或跨边界协调逻辑 | `triggerMessages` |

补充约束：

- 只有明确声明 `lifecycleComplexity: true` 的 aggregate，才应该进入 `Lifecycle` 主视图。
- 未声明 `lifecycleComplexity` 的 aggregate 仍可存在于 model 中，并继续参与 context、scenario、message 等其它视图。
- `contexts[].relationships[]` 可选声明结构化协作语义；当需要支撑 `Context Map` inspector 时，优先使用 `direction: upstream|downstream|bidirectional` 与 `integration: <semantic>`，而不是把这些信息埋进 `kind` 或 `description` 自由文本。

## 6. Repo 内的最小样例

当前 repo 用以下路径承载最小 maintainer 样例：

- [`examples/minimal/domain-model/index.yaml`](../../examples/minimal/domain-model/index.yaml)

该样例现在放在 `domain-model/` 下，用于承载当前 repo-private 默认建模路径。原因是：

1. repo 级 `repo:*` 命令已经固定走当前 loader 与 schema。
2. 当前项目明确不做向前兼容，repo-local dogfood 只维护 `domain-model/`。
3. 后续 story 需要扩展的应是当前 domain model 建模能力，而不是恢复旧工作区兼容层。

## 7. Schema 资源位置

当前 schema 文件位于：

- [`packages/ddd-spec-core/schema/domain-model/index.schema.json`](../../packages/ddd-spec-core/schema/domain-model/index.schema.json)
- [`packages/ddd-spec-core/schema/domain-model/context.schema.json`](../../packages/ddd-spec-core/schema/domain-model/context.schema.json)
- [`packages/ddd-spec-core/schema/domain-model/actor.schema.json`](../../packages/ddd-spec-core/schema/domain-model/actor.schema.json)
- [`packages/ddd-spec-core/schema/domain-model/system.schema.json`](../../packages/ddd-spec-core/schema/domain-model/system.schema.json)
- [`packages/ddd-spec-core/schema/domain-model/scenario.schema.json`](../../packages/ddd-spec-core/schema/domain-model/scenario.schema.json)
- [`packages/ddd-spec-core/schema/domain-model/message.schema.json`](../../packages/ddd-spec-core/schema/domain-model/message.schema.json)
- [`packages/ddd-spec-core/schema/domain-model/aggregate.schema.json`](../../packages/ddd-spec-core/schema/domain-model/aggregate.schema.json)
- [`packages/ddd-spec-core/schema/domain-model/policy.schema.json`](../../packages/ddd-spec-core/schema/domain-model/policy.schema.json)

---

*文档版本：v1.0*
*最后更新：2026-03-27*
*状态：schema 与目录布局已定义并切换到当前默认命名*
