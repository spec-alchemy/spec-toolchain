# Viewer System I18n US-004 Browser Validation

验证日期：2026-03-28

## Scope

本记录对应 viewer 系统级中英文切换 PRD 中 US-004 的浏览器验证要求，覆盖：

- 顶部语言切换入口可见且不破坏现有 header 布局
- 语言菜单可显示 `English` 与 `中文`
- 通过顶部切换器手动切换后，header 系统文案、URL `lang` 参数与 localStorage 保持同步
- 外部 `?spec=` 路径在切到缺失 locale sibling 的语言时，会显示非阻塞 fallback 提示

## Environment

- Viewer path: packaged viewer via `npm run repo:viewer -- --port 4273`
- Example source: `examples/cross-context/domain-model/index.yaml`
- Browser runner: Playwright Chromium `1.58.2`
- Fallback fixture:
  - 先运行 `npm run repo:viewer -- --port 4273`
  - 再把当前默认产物复制到 packaged viewer 静态目录中的同源路径：
    `packages/ddd-spec-cli/dist/ddd-spec-cli/static/viewer/validation/viewer-spec.json`
  - 不提供 `viewer-spec.zh-CN.json`，用于触发 sibling locale fallback

## Verified Surfaces

### Default English header and language menu

- URL: `http://localhost:4273/`
- Evidence: [`viewer-system-i18n-us004-default-en.png`](./viewer-system-i18n-us004-default-en.png)
- Verified:
  - 顶部 header 中可见语言切换入口，且没有挤压现有 view selector 与 reload 按钮布局
  - 展开语言菜单后可见 `English` 与 `中文`
  - 默认页面仍以英文系统文案打开

### Manual switch from English to zh-CN

- URL: `http://localhost:4273/`
- Evidence: [`viewer-system-i18n-us004-switch-zh.png`](./viewer-system-i18n-us004-switch-zh.png)
- Verified:
  - 通过顶部语言切换器选择 `中文`
  - header 系统文案立即切换为中文，包括标题眉注、视图切换区与 reload 按钮
  - 地址栏立即同步为 `http://localhost:4273/?lang=zh-CN`
  - 浏览器 localStorage 写入 `ddd-spec-viewer.locale=zh-CN`

### External artifact fallback after a manual zh-CN switch

- Start URL: `http://localhost:4273/?spec=/validation/viewer-spec.json&lang=en`
- Evidence: [`viewer-system-i18n-us004-fallback-zh.png`](./viewer-system-i18n-us004-fallback-zh.png)
- Verified:
  - 在外部 `?spec=` 页面里通过顶部语言切换器选择 `中文`
  - 地址栏保持 `spec` 参数，同时同步更新为 `lang=zh-CN`
  - 因缺少 sibling locale 文件 `validation/viewer-spec.zh-CN.json`，顶部显示中文非阻塞提示：
    `未找到 zh-CN 对应的本地化 viewer 产物（validation/viewer-spec.zh-CN.json），当前改为显示 /validation/viewer-spec.json。`
  - viewer 保持可用，fallback 不会打断继续浏览

## Result

本次浏览器验证通过。US-004 要求的顶部语言切换入口、切换后 URL 与 localStorage 同步，以及外部 `?spec=` 缺失目标语言产物时的非阻塞 fallback 提示都按预期工作。
