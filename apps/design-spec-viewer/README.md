# Design Spec Viewer

独立的 React viewer 子项目。

## Usage

推荐直接在仓库根目录运行：

```bash
npm run ddd-spec:viewer
```

这条命令会：

1. 读取 [`./ddd-spec.config.yaml`](./ddd-spec.config.yaml)，从共享 fixture 生成最新的 `./.ddd-spec` artifacts
2. 确保当前子项目依赖已安装
3. 启动当前 React viewer 的 Vite 开发服务器，并默认读取 `./.ddd-spec/artifacts/viewer-spec.json`

如果你已经在当前子项目目录中，也仍然可以单独运行：

```bash
npm run dev
```

如果需要从仓库根目录向 Vite 透传参数，可使用：

```bash
npm run ddd-spec:viewer -- --host 0.0.0.0
```

当前 app 会从 `public/generated/viewer-spec.json` 读取数据。
当通过仓库根目录的 `npm run ddd-spec:viewer` 启动时，CLI 会把默认 source 指向 `./.ddd-spec/artifacts/viewer-spec.json`。
这份 artifact 会通过 [`./ddd-spec.config.yaml`](./ddd-spec.config.yaml) 里的 `viewer.syncTargets` 配置同步到 `public/generated/viewer-spec.json`，供生产构建和静态读取使用。
其中 inspector 的业务语义 tooltip 来自 canonical vocabulary 生成出的 spec；只有 `How To Read` 这类纯 UI 引导文案保留在 app 本地。

如果不传额外参数，app 默认读取启动时提供的标准 source；在直接运行 `npm run dev` 这类 app-local 场景下，默认回退到 `public/generated/viewer-spec.json`。
如果想加载别的符合 contract 的 viewer JSON，可以使用 `?spec=...`：

```text
/?spec=/some/other/viewer-spec.json
/?spec=https://example.com/viewer-spec.json
```

这只是最小通用加载入口；当前 app 还没有内建的上传、多 spec 管理或 deep link UI。
