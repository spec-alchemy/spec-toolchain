# DDD Spec Viewer

内部维护用的 React viewer source 子项目。它继续负责 repo-local 开发与 dogfood，但其生产静态产物现在会在 `packages/ddd-spec-cli` 构建时一起打进主包的 `dist/ddd-spec-cli/static/viewer/`。

## Usage

产品路径推荐直接在仓库根目录运行：

```bash
npm run ddd-spec:viewer
```

这条命令会：

1. 读取 [`./ddd-spec.config.yaml`](./ddd-spec.config.yaml)，从共享 fixture 生成仓库根目录下最新的 `./.ddd-spec` artifacts
2. 启动 CLI 内置的本地静态服务器，直接使用打包进 `@knowledge-alchemy/ddd-spec` 的 viewer 资产
3. 通过同源 `/generated/viewer-spec.json` 提供仓库根目录下的 `./.ddd-spec/artifacts/viewer-spec.json`

如果要做 app-local 开发，单独运行 workspace 的 Vite dev server：

```bash
npm run dev --workspace=apps/ddd-spec-viewer
```

这条内部开发命令默认读取 `public/generated/viewer-spec.json`。通常先运行一次 `npm run ddd-spec:build`，把最新 viewer spec 同步到该路径。

如果需要给 CLI viewer server 透传参数，可使用：

```bash
npm run ddd-spec:viewer -- --host 0.0.0.0 --port 4173
```

当前 app 默认从同源 `generated/viewer-spec.json` 读取数据。
在 app-local 开发场景里，这份文件来自 `public/generated/viewer-spec.json`。
在 `ddd-spec viewer` 产品路径里，这个同一路径由 CLI server 动态映射到当前 workspace 的 viewer artifact。
仓库里的 [`./ddd-spec.config.yaml`](./ddd-spec.config.yaml) 会继续把 viewer spec 同步到 `public/generated/viewer-spec.json`，供内部开发和静态构建使用。
其中 inspector 的业务语义 tooltip 来自 canonical vocabulary 生成出的 spec；只有 `How To Read` 这类纯 UI 引导文案保留在 app 本地。

如果不传额外参数，app 默认读取上述标准 source。
如果想加载别的符合 contract 的 viewer JSON，可以使用 `?spec=...`：

```text
/?spec=/some/other/viewer-spec.json
/?spec=https://example.com/viewer-spec.json
```

这只是最小通用加载入口；当前 app 还没有内建的上传、多 spec 管理或 deep link UI。
