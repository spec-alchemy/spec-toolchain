# Design Spec

`design-spec/` 的目标不是继续堆积“只可阅读、不可校验”的文本文档，而是沉淀一份可被前端、服务端、QA 直接消费的结构化业务规格。

## Current Layout

- `canonical/`：唯一真相。使用 YAML 表达 DDD 业务语义。
- `canonical/vocabulary/`：canonical 持有的展示语义词表，例如 viewer inspector 的字段解释。
- `../packages/ddd-spec-core/`：通用 DDD spec core，承载建模、校验、分析和 graph IR。
- `../packages/ddd-spec-cli/`：通用 DDD spec CLI，负责读取配置、定位输入输出路径并执行 validate/analyze/build/generate。
- `../packages/ddd-spec-viewer-contract/`：viewer JSON 的共享 contract，供 projection 和 React app 共同消费。
- `../packages/ddd-spec-projection-viewer/`：基于 graph IR 生成 viewer spec 的 projection。
- `../packages/ddd-spec-projection-typescript/`：把 canonical spec 投影为 TypeScript 模块的 projection。
- `../ddd-spec.config.yaml`：当前仓库的 repo-local wiring，声明 canonical 入口、schema、产物输出路径和 viewer sync 目标。
- `tools/`：当前 example domain 的 repo-local wrapper，负责把当前仓库配置和旧入口桥接到共享 core/CLI。
- `schema/`：对 bundled spec 做 JSON Schema 校验。
- `artifacts/`：对外分发的稳定产物。由脚本生成，不纳入 git。
- `generated/`：给 TypeScript 使用的 generated spec。由脚本生成，不纳入 git。
- `derived-types.ts`：从 generated spec 派生出的 TypeScript 便利类型，不是第一真相。
- `../examples/connection-card-review/`：当前示例域的 example-specific helper 和派生类型入口。

当前还提供一层 canonical 外部分析：

- `artifacts/business-spec.analysis.json`：基于 canonical graph IR 生成的诊断结果，不纳入 git。
- `artifacts/business-viewer/`：基于 canonical graph IR 生成的 raw viewer spec，不纳入 git。

## Machine Entry

跨语言直接消费时，优先读取：

- [`artifacts/business-spec.json`](./artifacts/business-spec.json)

这份 JSON 由 canonical YAML 打包得到，适合作为前端、Java、Python、QA 的统一读取入口。

人工浏览和交互查看时，可打开：

- [`artifacts/business-viewer/viewer-spec.json`](./artifacts/business-viewer/viewer-spec.json)
- [`../apps/design-spec-viewer/`](../apps/design-spec-viewer/)

当前仓库中的独立 React viewer 子项目会消费这份 `viewer-spec.json`，并在运行时使用 `React Flow + ELK` 完成布局与渲染。

## Commands

```bash
npm run build:design-spec
npm run test:ddd-spec
npm run verify:design-spec
npm run dev:design-spec-viewer
tsx packages/ddd-spec-cli/cli.ts validate --config ./ddd-spec.config.yaml
tsx packages/ddd-spec-cli/cli.ts analyze --config ./ddd-spec.config.yaml
tsx packages/ddd-spec-cli/cli.ts build --config ./ddd-spec.config.yaml
```

`npm run dev:design-spec-viewer` 会在仓库根目录先生成最新的 canonical artifacts，再确保 `apps/design-spec-viewer/` 的依赖已安装，最后直接启动独立 React viewer。
如果需要给 Vite 透传参数，可使用 `npm run dev:design-spec-viewer -- --host 0.0.0.0` 这样的形式。
`ddd-spec.config.yaml` 里的 `projections.*` 开关会同时约束 `build` 和显式 `generate ...` 命令；当某个 projection 被关闭时，`build` 会清理对应旧产物，避免残留文件继续伪装成当前输出。

## Modeling Boundary

- `canonical/` 只表达业务真相，不表达运行时实现或 viewer 布局细节。
- `../packages/ddd-spec-core/` 承载通用建模能力；不要把当前示例域的业务 helper 再塞回 core。
- `../examples/connection-card-review/` 承载当前示例域特有的便利层；不要把 `Connection/Card` 这类对象名重新暴露为 core API。
- `derived-types.ts` 不是第一真相，只是给 TypeScript 使用方提供的派生类型便利层。
- `artifacts/business-spec.analysis.json` 是基于 canonical 生成的外部分析结果，不属于第一真相。
- `artifacts/business-viewer/` 是基于 canonical graph IR 生成的 viewer 输入产物，不属于第一真相。
- 当前唯一维护的可视化入口是 `viewer-spec.json -> React Flow + ELK viewer`。
- viewer inspector 的业务语义解释由 `design-spec` 生成到 `viewer-spec.json`；仅与界面交互有关的提示文案留在 React viewer 本地。
- `artifacts/`、`generated/` 都属于 generated outputs，应通过脚本重建，而不是手工编辑或提交。
- 如果要在 fresh clone 上做完整校验，优先运行 `npm run verify:design-spec`，不要假设 generated files 已存在。
- 如果未来继续演进，应优先扩展 `../packages/ddd-spec-core/` 和 canonical schema，而不是在 `derived-types.ts` 或 repo-local wrapper 里继续发明规则。

相关边界说明可参考：

- [canonical-boundary-and-analysis.md](./canonical-boundary-and-analysis.md)
- [visualization-strategy-and-roadmap.md](./visualization-strategy-and-roadmap.md)
