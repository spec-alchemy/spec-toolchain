# DDD Spec Viewer

`apps/ddd-spec-viewer/` 是内部维护用的 React viewer source workspace，不是对外 npm package 边界，也不会以源码形式随 `@knowledge-alchemy/ddd-spec` 发布。真正随 `@knowledge-alchemy/ddd-spec` 发布的是构建出的静态 bundle：`packages/ddd-spec-cli/dist/ddd-spec-cli/static/viewer/`。

消费者安装和零配置说明请查看 [`../../packages/ddd-spec-cli/README.md`](../../packages/ddd-spec-cli/README.md)。本 README 只描述 monorepo maintainer 的 `scenarios/` 场景与 app-local 开发路径。

## 默认产品面

viewer 的默认产品面是 4 张一级主图，顺序与产品默认路径保持一致：

- `Context Map`
- `Scenario Story`
- `Message Flow / Trace`
- `Lifecycle`

只有当一级主图不足以解释问题时，才进入二级扩展图：

- `Aggregate Boundary / Domain Structure`
- `Policy / Saga`

无论是 README、demo 命令还是 app-local 验证路径，都不应再把这个产品表述成 aggregate/process viewer。

## Maintainer Usage

维护入口推荐直接在仓库根目录运行：

```bash
npm run repo:viewer
```

这条命令会：

1. 读取 [`./ddd-spec.config.yaml`](./ddd-spec.config.yaml)，从仓库内置 scenario 生成仓库根目录下最新的 `./.ddd-spec` artifacts
2. 启动 CLI 内置的本地静态服务器，直接使用打包进 `@knowledge-alchemy/ddd-spec` 的 viewer 资产
3. 通过同源 `/generated/viewer-spec.json` 提供仓库根目录下的 `./.ddd-spec/artifacts/viewer-spec.json`

`scenarios/`、`examples/`、`test/fixtures/` 和 `docs/ddd-spec/` 继续作为仓库内的场景、回归和说明材料存在，不属于已发布包的运行时内容。

如果要做 app-local 开发，单独运行 workspace 的 Vite dev server：

```bash
npm run dev --workspace=apps/ddd-spec-viewer
```

这条内部开发命令默认读取 `public/generated/viewer-spec.json`。通常先运行一次 `npm run repo:build`，把最新 viewer spec 同步到该路径。
如果只想验证 app workspace 的构建，可运行 `npm run build --workspace=apps/ddd-spec-viewer`。

如果需要给 CLI viewer server 透传参数，可使用：

```bash
npm run repo:viewer -- --host 0.0.0.0 --port 4173
```

如果要验证仓库里的完整 vNext 示例，不要依赖根目录 `repo:viewer`。它固定绑定到 repo 内置 legacy scenario。应改用 example-specific config：

```bash
npm run build --workspace=packages/ddd-spec-cli
npm run repo:cli --workspace=packages/ddd-spec-cli -- build --config examples/vnext-cross-context/ddd-spec.config.yaml
npm run repo:cli --workspace=packages/ddd-spec-cli -- viewer --config examples/vnext-cross-context/ddd-spec.config.yaml -- --port 4173
```

这条路径会直接打开 `examples/vnext-cross-context/` 对应的 packaged viewer 演示，适合核对 4 张一级主图是否完整串起来。

## Data Loading

当前 app 默认从同源 `generated/viewer-spec.json` 读取数据。

- 在 app-local 开发场景里，这份文件来自 `public/generated/viewer-spec.json`
- 在 `ddd-spec viewer` 产品路径里，这个同一路径由 CLI server 动态映射到当前 workspace 的 viewer artifact
- [`./ddd-spec.config.yaml`](./ddd-spec.config.yaml) 会继续把 viewer spec 同步到 `public/generated/viewer-spec.json`，供内部开发和静态构建使用
- inspector 的业务语义 tooltip 来自 canonical vocabulary 生成出的 spec；只有 `How To Read` 这类纯 UI 引导文案保留在 app 本地

如果不传额外参数，app 默认读取上述标准 source。
如果想加载别的符合 contract 的 viewer JSON，可以使用 `?spec=...`：

```text
/?spec=/some/other/viewer-spec.json
/?spec=https://example.com/viewer-spec.json
```

这只是最小通用加载入口；当前 app 还没有内建的上传、多 spec 管理或 deep link UI。
