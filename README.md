# Design Alchemy

本仓库已从 `knowledge-alchemy-app-v2` 重命名为 `design-alchemy`。它的定位是通用的 design-as-code 基础设施，而不是任何单一业务产品本身。

## 仓库定位

`design-alchemy` 当前聚焦于业务建模 as code，并将逐步扩展到：

- UI as code
- 前端架构 as code
- 后端架构 as code

产品核心不是 viewer，而是设计资产本身：

- 可编写
- 可分析
- 可 diff
- 可 review
- 可生成
- 可进入执行约束

viewer 只是 projection layer。

## 与 Knowledge Alchemy App 的关系

同级仓库 [`knowledge-alchemy-app`](/Users/tella/Development/knowledge-alchemy-app/README.md) 是真实业务产品。`design-alchemy` 负责把那个产品中反复出现、值得沉淀的设计问题提炼成通用能力：

- 共享设计资产 contract
- analysis IR
- diagnostics
- diff / review 能力
- generation 与 projection 工具链

协作边界如下：

1. `knowledge-alchemy-app` 提供真实问题、真实约束与真实验证场景。
2. `design-alchemy` 只抽象稳定、重复、值得复用的模式。
3. 业务产品不会作为本仓库里的内嵌 demo 长期承载。
4. 本仓库的 `examples/` 只保留最小化、通用化样本，用于回归和文档。

## 联合推进方式

两个仓库联合推进，但职责不同：

- `knowledge-alchemy-app`：负责产品策略、业务建模、UI、应用架构与真实实现
- `design-alchemy`：负责建模 contract、analysis、diagnostics、diff/review、generation、projection

推荐工作循环：

1. 先在 `knowledge-alchemy-app` 中设计并实现真实功能
2. 识别当前设计资产或工具能力的不足
3. 将稳定且重复出现的模式提炼到 `design-alchemy`
4. 再把增强后的能力回灌到业务产品中

## 当前产品表面

当前公开产品仍然是 `@knowledge-alchemy/ddd-spec`：一个零配置 CLI 加打包 viewer 的 DDD 建模工作台。默认工作区为 `domain-model/`，默认入口为 `domain-model/index.yaml`。

默认阅读路径与教学路径保持一致：

1. `Context Map`
2. `Scenario Story`
3. `Message Flow / Trace`
4. `Lifecycle`

二级扩展图当前包括：

- `Policy / Saga`

## 面向使用者的快速开始

如果你要在自己的项目中使用当前公开包，要求 Node `>=18`。

安装：

```sh
npm install --save-dev @knowledge-alchemy/ddd-spec
```

初始化默认工作区：

```sh
npm exec ddd-spec init
```

将创建如下结构：

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

日常开发流程：

```sh
npm exec ddd-spec dev
```

显式分步流程：

```sh
npm exec ddd-spec validate
npm exec ddd-spec build
npm exec ddd-spec viewer -- --port 4173
```

## 默认建模内容

`domain-model/` 中的核心内容如下：

- `contexts/`：bounded contexts 及其关系
- `actors/`：触发业务行为的人或角色
- `systems/`：参与协作的外部系统
- `scenarios/`：按步骤展开的业务故事
- `messages/`：command、event、query 等统一消息抽象
- `aggregates/`：需要生命周期建模的边界
- `policies/`：显式协调规则

默认 authoring 顺序：

1. 先定义 context、actor、system
2. 再建一个核心 scenario
3. 为 scenario 绑定 message flow
4. 只在状态复杂度真实存在时补 lifecycle

## 仓库边界

- 根仓库是 maintainer monorepo，不是普通消费方项目模板
- `packages/ddd-spec-cli/` 是当前唯一公开 npm 包边界
- `apps/ddd-spec-viewer/` 是私有 viewer 源码
- `examples/` 是仓库内维护资产，不随产品 tarball 发布

## 维护者命令

| 任务 | 命令 |
|------|------|
| 验证仓库示例流程 | `npm run repo:validate` |
| 构建仓库示例输出 | `npm run repo:build` |
| 启动仓库示例 viewer | `npm run repo:viewer` |
| 运行包级回归测试 | `npm run pkg:test` |
| 验证打包 CLI 与 viewer 工作区 | `npm run verify` |
| 启动 viewer 开发服务器 | `npm run dev --workspace=apps/ddd-spec-viewer` |
| 构建 viewer 工作区 | `npm run build --workspace=apps/ddd-spec-viewer` |

## 仓库结构

- [`packages/ddd-spec-core/`](./packages/ddd-spec-core/)：模型加载、schema 校验、语义校验、analysis
- [`packages/ddd-spec-cli/`](./packages/ddd-spec-cli/)：当前唯一公开包边界，包含 CLI、配置加载、构建编排与 viewer 启动
- [`packages/ddd-spec-projection-viewer/`](./packages/ddd-spec-projection-viewer/)：viewer projection 实现
- [`packages/ddd-spec-projection-typescript/`](./packages/ddd-spec-projection-typescript/)：TypeScript projection 实现
- [`packages/ddd-spec-viewer-contract/`](./packages/ddd-spec-viewer-contract/)：viewer contract 类型
- [`apps/ddd-spec-viewer/`](./apps/ddd-spec-viewer/)：私有 React viewer 源码
- [`examples/`](./examples/)：仓库内最小样本与跨上下文样本

## 文档策略

- 默认不维护设计稿、路线图、状态快照或浏览器验证文档
- 代码、测试、示例、schema 与脚本是权威来源
- 面向外部使用者时，只保留最小必要的包 README 与操作入口

## 进一步阅读

- [`packages/ddd-spec-cli/README.md`](./packages/ddd-spec-cli/README.md)
- [`.changeset/README.md`](./.changeset/README.md)
