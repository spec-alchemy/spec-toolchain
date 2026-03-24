# Design Spec Viewer

独立的 React viewer 子项目。

## Usage

推荐直接在仓库根目录运行：

```bash
npm run dev:design-spec-viewer
```

这条命令会：

1. 生成最新的 `design-spec` artifacts 和 `viewer-spec.json`
2. 确保当前子项目依赖已安装
3. 启动当前 React viewer 的 Vite 开发服务器

如果你已经在当前子项目目录中，也仍然可以单独运行：

```bash
npm run dev
```

如果需要从仓库根目录向 Vite 透传参数，可使用：

```bash
npm run dev:design-spec-viewer -- --host 0.0.0.0
```

当前 app 会从 `public/generated/viewer-spec.json` 读取数据。
这份文件由根项目的 `design-spec` 构建流程自动同步生成。
其中 inspector 的业务语义 tooltip 来自 canonical vocabulary 生成出的 spec；只有 `How To Read` 这类纯 UI 引导文案保留在 app 本地。
