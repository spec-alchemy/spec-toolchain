# DDD Spec 默认工作区命名与版本重置决策

## 1. 文档定位

本文件固化 DDD Spec 未发布产品的默认命名与版本重置决策。

从本文件生效开始：

- zero-config 默认工作区、默认入口、默认术语、schema version 与 viewer spec version，以本文件为准。
- docs、examples、tests、VS Code schema 映射、错误提示与 repo-private maintainer 默认路径，只要涉及默认用户 surface，都必须遵循本文件。
- 如果旧的历史阶段命名文档或旧默认命名文档与本文件冲突，以本文件为准；旧文档只保留产品背景或待清理历史语义。

## 2. 已确定决策

1. 默认工作区目录固定为 `domain-model/`。
2. 默认入口文件固定为 `domain-model/index.yaml`。
3. index 的顶层集合容器继续使用 `model`。
4. 不把 `domain` 重新引入为新的顶层集合容器。
5. 用户可见默认 surface 移除 `canonical`。
6. 用户可见默认 surface 移除 `vNext`。
7. 默认 authoring 与文档语言统一使用 `domain model`、`model schema` 或等价表述，不再把 `canonical YAML` 作为默认用户说法。
8. domain model schema version 重置为 `1`。
9. viewer spec version 重置为 `1`。
10. 本次不改产品名 `ddd-spec`。
11. 本次不改 CLI 名 `ddd-spec`。
12. 本次不改公开包名 `@knowledge-alchemy/ddd-spec`。
13. 本次不提供 legacy alias。
14. 本次不提供运行时兼容层。
15. 本次不提供旧工作区迁移工具。

## 3. 默认工作区基线

新的默认工作区基线如下：

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

最小 index 基线如下：

```yaml
version: 1
model:
  contexts: ./contexts
  actors: ./actors
  systems: ./systems
  scenarios: ./scenarios
  messages: ./messages
  aggregates: ./aggregates
  policies: ./policies
```

补充约束：

- `version: 1` 指向新的默认 domain model schema 起点，不延续旧的 `version: 3` 命名轨迹。
- `model` 是唯一默认顶层集合容器；旧的 `domain.*` shape 不是本次产品路径的一部分。
- 带历史阶段标签的旧默认工作区目录都不再属于默认用户路径。

## 4. 版本轴线边界

以下版本轴线必须明确分离：

1. `ddd-spec` 产品名、CLI 名与公开 npm 包名，代表产品与发布边界。
2. domain model schema version，代表建模文件 contract 版本。
3. viewer spec version，代表 viewer artifact / contract 版本。
4. repo-private 示例名、fixture 名与 maintainer 演示路径，代表仓库内部维护约定。

本次重置只影响默认工作区命名、默认术语、schema version 与 viewer spec version，不等于 npm package semver 重置，也不要求同步重命名公开发布边界。

## 5. 对后续实现的约束

- `init`、`validate`、`build`、`dev`、`viewer` 的零配置默认路径必须指向 `domain-model/index.yaml`。
- CLI 帮助、错误提示、README、示例、fixture、golden、测试断言与 VS Code schema 映射，必须统一改到 `domain-model/` 语言。
- repo-private maintainer 默认示例与 viewer 演示路径，不得继续使用历史阶段标签或旧默认命名作为默认命名。
- 对旧工作区只允许给出直接、明确的错误提示或文档说明，不允许静默兼容。
- 如果后续 story 需要改产品名、CLI 名或公开包名，必须单独立项，不得隐含包含在本次版本重置中。

---

*文档版本：v1.0*
*最后更新：2026-03-27*
*状态：默认命名与版本重置决策已固化*
