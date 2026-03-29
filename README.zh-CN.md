# Spec Toolchain

`spec-toolchain` 是 `spec-alchemy` 用来构建和发布 AI-native spec tooling 的工作区。这个仓库承载的是公开包 `@spec-alchemy/ddd-spec` 背后的共享建模、分析、生成和 viewer 能力。

English README: [README.md](./README.md)

## 当前公开包

当前对外发布的 npm 包是 [`@spec-alchemy/ddd-spec`](./packages/ddd-spec-cli/README.md)。它提供零配置的 DDD 建模 CLI，以及开箱即用的 packaged viewer。

- 默认工作区：`domain-model/`
- 默认入口：`domain-model/index.yaml`
- 默认生成输出：`.ddd-spec/`

在你的项目中安装：

```sh
npm install --save-dev @spec-alchemy/ddd-spec
```

## 快速开始

普通 consumer 项目推荐直接走 zero-config 路径：

```sh
npm install --save-dev @spec-alchemy/ddd-spec
npm exec ddd-spec init
npm exec ddd-spec editor setup
npm exec ddd-spec dev
```

如果你更喜欢显式的一次性命令，可以这样用：

```sh
npm exec ddd-spec validate
npm exec ddd-spec build
npm exec ddd-spec serve -- --port 4173
```

viewer 的推荐浏览顺序是：

1. `Context Map`
2. `Scenario Story`
3. `Message Flow / Trace`
4. `Lifecycle`

当主路径已经不足以表达复杂协作时，`Policy / Saga` 仍然可以作为 secondary view 使用。

## AI Skill

配套的 `ddd-spec` skill 可以这样安装：

```sh
npx skills add spec-alchemy/spec-toolchain --skill ddd-spec
```

## 仓库边界

这个仓库是维护者工作区，不是给业务项目直接 fork 的 consumer template。

- [`packages/ddd-spec-cli/`](./packages/ddd-spec-cli/) 是唯一公开 npm 包边界。
- [`apps/ddd-spec-viewer/`](./apps/ddd-spec-viewer/) 存放私有 viewer 源码。
- [`examples/`](./examples/) 存放仓库内维护的 dogfood 示例，用于回归测试和维护者日常流程。
- 可复用的建模逻辑应收敛到 [`packages/ddd-spec-core/`](./packages/ddd-spec-core/)。

Spec Alchemy 维护的是通用 spec infrastructure。业务特定的实现和资产应该放在独立的 consumer repository 中，而不是放在这个 monorepo 里。

## 维护者命令

维护者工作区 Node.js：`22` 或 `24`

| 任务 | 命令 |
|------|------|
| 验证仓库示例流程 | `npm run repo:validate` |
| 构建仓库示例输出 | `npm run repo:build` |
| 启动打包 viewer 示例流程 | `npm run repo:viewer` |
| 运行包级回归测试 | `npm run pkg:test` |
| 验证打包 CLI 与 viewer 工作区 | `npm run verify` |
| 启动 viewer Vite 开发服务器 | `npm run dev --workspace=apps/ddd-spec-viewer` |
| 构建 viewer 工作区 | `npm run build --workspace=apps/ddd-spec-viewer` |

## 仓库结构

- [`packages/ddd-spec-core/`](./packages/ddd-spec-core/)：model loading、schema validation、semantic validation 和 analysis
- [`packages/ddd-spec-cli/`](./packages/ddd-spec-cli/)：公开 CLI 包、config loading、build orchestration 和 packaged viewer serving
- [`packages/ddd-spec-projection-viewer/`](./packages/ddd-spec-projection-viewer/)：viewer projection 实现
- [`packages/ddd-spec-projection-typescript/`](./packages/ddd-spec-projection-typescript/)：TypeScript projection 实现
- [`packages/ddd-spec-viewer-contract/`](./packages/ddd-spec-viewer-contract/)：共享的 viewer contract types
- [`apps/ddd-spec-viewer/`](./apps/ddd-spec-viewer/)：私有 React viewer 源码
- [`examples/`](./examples/)：仓库内维护的示例

## 贡献与安全

- 贡献指南：[CONTRIBUTING.md](./CONTRIBUTING.md)
- 行为准则：[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- 安全报告：[SECURITY.md](./SECURITY.md)
- 发布流程：[`.changeset/README.md`](./.changeset/README.md)
- 发布通道：`main` -> npm `latest`，`beta` -> npm `beta`
