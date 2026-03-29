# Spec Toolchain

`spec-toolchain` 是 `spec-alchemy` 的维护者 monorepo，用来沉淀面向 AI 可读 spec 的建模、分析、生成与投影视图能力，而不是承载某个业务产品本身。

English README: [README.md](./README.md)

## 当前公开包

当前公开 npm 包是 [`@spec-alchemy/ddd-spec`](./packages/ddd-spec-cli/README.md)，它提供零配置 DDD 建模 CLI 与打包 viewer。

- 默认工作区：`domain-model/`
- 默认入口：`domain-model/index.yaml`
- 默认生成输出：`.ddd-spec/`
- 支持的 Node.js：`>=18`

安装方式：

```sh
npm install --save-dev @spec-alchemy/ddd-spec
```

## 快速开始

面向普通使用者的零配置路径：

```sh
npm install --save-dev @spec-alchemy/ddd-spec
npm exec ddd-spec init
npm exec ddd-spec editor setup
npm exec ddd-spec dev
```

显式分步命令：

```sh
npm exec ddd-spec validate
npm exec ddd-spec build
npm exec ddd-spec serve -- --port 4173
```

推荐阅读顺序：

1. `Context Map`
2. `Scenario Story`
3. `Message Flow / Trace`
4. `Lifecycle`

`Policy / Saga` 作为次级视图保留，用于更复杂的协作和协调场景。

## 仓库边界

本仓库是维护者 monorepo，不是消费者项目模板。

- [`packages/ddd-spec-cli/`](./packages/ddd-spec-cli/) 是唯一公开 npm 包边界。
- [`apps/ddd-spec-viewer/`](./apps/ddd-spec-viewer/) 是私有 viewer 源码。
- [`examples/`](./examples/) 是仓库内维护的示例输入，用于回归和维护者流程。
- 可复用建模能力应沉淀到 [`packages/ddd-spec-core/`](./packages/ddd-spec-core/)。

业务特定资产应放在独立的消费者仓库中，而不是保存在本仓库内。

## 维护者命令

| 任务 | 命令 |
|------|------|
| 验证仓库示例流程 | `npm run repo:validate` |
| 构建仓库示例输出 | `npm run repo:build` |
| 启动打包 viewer 示例流程 | `npm run repo:viewer` |
| 运行包级回归测试 | `npm run pkg:test` |
| 验证打包 CLI 与 viewer 工作区 | `npm run verify` |
| 启动 viewer Vite 开发服务器 | `npm run dev --workspace=apps/ddd-spec-viewer` |
| 构建 viewer 工作区 | `npm run build --workspace=apps/ddd-spec-viewer` |

## 进一步阅读

- 贡献指南：[CONTRIBUTING.md](./CONTRIBUTING.md)
- 行为准则：[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- 安全报告：[SECURITY.md](./SECURITY.md)
- 发布流程：[`.changeset/README.md`](./.changeset/README.md)
- 发布通道：`main` -> npm `latest`，`beta` -> npm `beta`
