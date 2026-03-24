# Design Spec

`design-spec/` 现在承载的是当前仓库的 DDD spec 文档、schema 和 repo-local helper。repo 自己维护的 canonical 真相已经迁到 [`../ddd-spec/canonical/`](../ddd-spec/canonical/)，生成产物统一写到 [`../.ddd-spec/`](../.ddd-spec/)。

## Current Layout

- `../ddd-spec/canonical/`：当前仓库的唯一真相。使用 YAML 表达 DDD 业务语义。
- `../ddd-spec/canonical/vocabulary/`：canonical 持有的展示语义词表，例如 viewer inspector 的字段解释。
- `../packages/ddd-spec-core/`：通用 DDD spec core，承载建模、校验、分析和 graph IR。
- `../packages/ddd-spec-cli/`：通用 DDD spec CLI，负责读取配置、定位输入输出路径并执行 validate/analyze/build/generate。
- `../packages/ddd-spec-viewer-contract/`：viewer JSON 的共享 contract，供 projection 和 React app 共同消费。
- `../packages/ddd-spec-projection-viewer/`：基于 graph IR 生成 viewer spec 的 projection。
- `../packages/ddd-spec-projection-typescript/`：把 canonical spec 投影为 TypeScript 模块的 projection。
- `tools/`：当前仓库的 repo-local wrapper 和 helper，负责把零配置 CLI 与本仓库的附加脚本桥接起来。
- `schema/`：对 bundled spec 做 JSON Schema 校验。
- `../.ddd-spec/artifacts/`：对外分发的稳定产物。由脚本生成，不纳入 git。
- `../.ddd-spec/generated/`：给 TypeScript 使用的 generated spec。由脚本生成，不纳入 git。
- `derived-types.ts`：从 generated spec 派生出的 TypeScript 便利类型，不是第一真相。
- `../examples/connection-card-review/`：当前示例域的 example-specific helper 和派生类型入口。
- `../examples/order-payment/`：第二个 canonical example domain，用于回归测试抽象边界。
- `../examples/content-moderation/`：第三个 canonical example domain，用于继续压测跨领域泛化稳定性。

当前还提供一层 canonical 外部分析：

- `../.ddd-spec/artifacts/business-spec.analysis.json`：基于 canonical graph IR 生成的诊断结果，不纳入 git。
- `../.ddd-spec/artifacts/viewer-spec.json`：基于 canonical graph IR 生成的 raw viewer spec，不纳入 git。

## Machine Entry

跨语言直接消费时，优先读取：

- [`../.ddd-spec/artifacts/business-spec.json`](../.ddd-spec/artifacts/business-spec.json)

这份 JSON 由 canonical YAML 打包得到，适合作为前端、Java、Python、QA 的统一读取入口。

人工浏览和交互查看时，可打开：

- [`../.ddd-spec/artifacts/viewer-spec.json`](../.ddd-spec/artifacts/viewer-spec.json)
- [`../apps/design-spec-viewer/`](../apps/design-spec-viewer/)

当前仓库中的独立 React viewer 子项目会消费这份 `viewer-spec.json` 的同步副本 `apps/design-spec-viewer/public/generated/viewer-spec.json`，并在运行时使用 `React Flow + ELK` 完成布局与渲染。

## Commands

```bash
npm run build:design-spec
npm run test:ddd-spec
npm run verify:design-spec
npm run dev:design-spec-viewer
node --import tsx packages/ddd-spec-cli/cli.ts validate
node --import tsx packages/ddd-spec-cli/cli.ts analyze
node --import tsx packages/ddd-spec-cli/cli.ts build
```

`npm run dev:design-spec-viewer` 会在仓库根目录先生成最新的 canonical artifacts，再把 viewer spec 同步到 `apps/design-spec-viewer/public/generated/viewer-spec.json`，确保 `apps/design-spec-viewer/` 的依赖已安装，最后直接启动独立 React viewer。
如果需要给 Vite 透传参数，可使用 `npm run dev:design-spec-viewer -- --host 0.0.0.0` 这样的形式。
零配置模式默认读取 `ddd-spec/canonical/index.yaml`，默认把 bundle、analysis、viewer 和 TypeScript 输出写到 `./.ddd-spec/`。
`npm run test:ddd-spec` 会运行 core 层的 schema / semantic validation tests，并把 bundled spec、analysis、viewer、generated TypeScript 输出与仓库内受 git 管控的 golden snapshots 对比，而不是对比刚刚生成出的 artifacts。
`npm run verify:design-spec` 还会安装并构建 `apps/design-spec-viewer/`，确保共享 viewer contract 的消费端没有被破坏。

## Contract Versions

- canonical schema 当前以 `BusinessSpec.version = 1` 作为 v1 边界。
- analysis / diagnostic contract 当前以 `BusinessSpecAnalysis.analysisVersion = 1` 作为 v1 边界。
- viewer contract 当前以 `BusinessViewerSpec.viewerVersion = 1` 作为 v1 边界。
- 当前 v1 默认允许向后兼容的增量扩展；删除字段、改变既有字段语义、或改变既有 diagnostic code 含义时应升级版本。

## Modeling Boundary

- `../ddd-spec/canonical/` 只表达业务真相，不表达运行时实现或 viewer 布局细节。
- `../packages/ddd-spec-core/` 承载通用建模能力；不要把当前示例域的业务 helper 再塞回 core。
- `../examples/connection-card-review/` 承载当前示例域特有的便利层；不要把 `Connection/Card` 这类对象名重新暴露为 core API。
- `derived-types.ts` 不是第一真相，只是给 TypeScript 使用方提供的派生类型便利层。
- `../.ddd-spec/artifacts/business-spec.analysis.json` 是基于 canonical 生成的外部分析结果，不属于第一真相。
- `../.ddd-spec/artifacts/viewer-spec.json` 是基于 canonical graph IR 生成的 viewer 输入产物，不属于第一真相。
- 当前唯一维护的可视化入口是 `viewer-spec.json -> React Flow + ELK viewer`。
- viewer inspector 的业务语义解释由 `design-spec` 生成到 `viewer-spec.json`；仅与界面交互有关的提示文案留在 React viewer 本地。
- `../.ddd-spec/artifacts/`、`../.ddd-spec/generated/` 都属于 generated outputs，应通过脚本重建，而不是手工编辑或提交。
- 如果要在 fresh clone 上做完整校验，优先运行 `npm run verify:design-spec`，不要假设 generated files 已存在。
- 如果未来继续演进，应优先扩展 `../packages/ddd-spec-core/` 和 canonical schema，而不是在 `derived-types.ts` 或 repo-local wrapper 里继续发明规则。

相关边界说明可参考：

- [canonical-boundary-and-analysis.md](./canonical-boundary-and-analysis.md)
- [visualization-strategy-and-roadmap.md](./visualization-strategy-and-roadmap.md)
