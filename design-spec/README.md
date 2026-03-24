# Design Spec Internals

`design-spec/` 承载的是当前仓库的内部说明、schema 和 repo-local helper。主 onboarding 入口已经迁到仓库根目录的 [`../README.md`](../README.md)，标准工作流是零配置的 `init -> edit canonical -> validate -> build -> viewer`。

## Standard Workflow

```bash
npm run ddd-spec:init
# edit ddd-spec/canonical/
npm run ddd-spec:validate
npm run ddd-spec:build
npm run ddd-spec:viewer
```

如果仓库里已经存在 [`../ddd-spec/canonical/index.yaml`](../ddd-spec/canonical/index.yaml)，可以跳过 `init`。

## Current Layout

- `../ddd-spec/canonical/`：当前仓库的唯一真相。使用 YAML 表达 DDD 业务语义。
- `../ddd-spec/canonical/vocabulary/`：canonical 持有的展示语义词表，例如 viewer inspector 的字段解释。
- `../packages/ddd-spec-core/`：通用 DDD spec core，承载建模、校验、分析和 graph IR。
- `../packages/ddd-spec-cli/`：通用 DDD spec CLI，负责零配置命令入口和兼容配置加载。
- `../packages/ddd-spec-viewer-contract/`：viewer JSON 的共享 contract，供 projection 和 React app 共同消费。
- `../packages/ddd-spec-projection-viewer/`：基于 graph IR 生成 viewer spec 的 projection。
- `../packages/ddd-spec-projection-typescript/`：把 canonical spec 投影为 TypeScript 模块的 projection。
- `tools/`：当前仓库的 repo-local wrapper 和 helper，负责把共享 CLI 与本仓库的附加脚本桥接起来。
- `schema/`：对 bundled spec 做 JSON Schema 校验。
- `../.ddd-spec/artifacts/`：由脚本生成的 bundle、analysis 和 viewer outputs。
- `../.ddd-spec/generated/`：由脚本生成的 TypeScript outputs。
- `derived-types.ts`：从 generated spec 派生出的 TypeScript 便利类型，不是第一真相。
- `../examples/connection-card-review/`：当前示例域的 example-specific helper 和派生类型入口。
- `../examples/order-payment/`：第二个 canonical example domain，用于回归测试抽象边界。
- `../examples/content-moderation/`：第三个 canonical example domain，用于继续压测跨领域泛化稳定性。

## Maintainer Commands

```bash
npm run ddd-spec:validate
npm run ddd-spec:build
npm run ddd-spec:test
npm run ddd-spec:verify
npm run ddd-spec:viewer -- --host 0.0.0.0
node --import tsx packages/ddd-spec-cli/cli.ts analyze
node --import tsx packages/ddd-spec-cli/cli.ts generate typescript
```

`npm run ddd-spec:build` 会把标准产物写到 `./.ddd-spec/`，再把 viewer 的静态读取副本同步到 `apps/design-spec-viewer/public/generated/viewer-spec.json`。
`npm run ddd-spec:viewer` 会先确保 `./.ddd-spec/artifacts/viewer-spec.json` 已更新，然后启动现有的 `apps/design-spec-viewer/` Vite app，并把默认 spec source 指向这份标准 viewer artifact。
`npm run ddd-spec:test` 会运行 core 层的 schema / semantic validation tests，并把 bundled spec、analysis、viewer、generated TypeScript 输出与仓库内受 git 管控的 golden snapshots 对比。
`npm run ddd-spec:verify` 还会安装并构建 `apps/design-spec-viewer/`，确保共享 viewer contract 的消费端没有被破坏。

## Generated Outputs

- [`../.ddd-spec/artifacts/business-spec.json`](../.ddd-spec/artifacts/business-spec.json)：由 canonical YAML 打包得到的稳定 JSON 入口。
- [`../.ddd-spec/artifacts/business-spec.analysis.json`](../.ddd-spec/artifacts/business-spec.analysis.json)：基于 canonical graph IR 生成的诊断结果。
- [`../.ddd-spec/artifacts/viewer-spec.json`](../.ddd-spec/artifacts/viewer-spec.json)：零配置 viewer 默认读取的标准输入。
- [`../apps/design-spec-viewer/`](../apps/design-spec-viewer/)：运行中的 React viewer；静态 build / preview 会消费同步后的 `public/generated/viewer-spec.json`。

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
- 如果要在 fresh clone 上做完整校验，优先运行 `npm run ddd-spec:verify`，不要假设 generated files 已存在。
- 如果未来继续演进，应优先扩展 `../packages/ddd-spec-core/` 和 canonical schema，而不是在 `derived-types.ts` 或 repo-local wrapper 里继续发明规则。

相关边界说明可参考：

- [canonical-boundary-and-analysis.md](./canonical-boundary-and-analysis.md)
- [visualization-strategy-and-roadmap.md](./visualization-strategy-and-roadmap.md)
