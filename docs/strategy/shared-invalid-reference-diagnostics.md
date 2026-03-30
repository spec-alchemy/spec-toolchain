# shared invalid-reference diagnostics

本文件冻结 US-005 的最小 invalid-reference diagnostics expectation，用于确保跨 `spec family` 的失效引用在 shared 层暴露一致、可操作的最小信息，同时继续把 rule taxonomy、resolver behavior 和具体 validator 策略留在 family-specific 层。

本文档只定义第一阶段必须成立的 shared diagnostics 约束，不承诺正式 resolver、完整 validator result envelope、family runtime 接入或新的 public package boundary。

## Minimum expectation

第一阶段的 shared expectation 落在 [`packages/spec-toolchain-shared-kernel/diagnostics.ts`](../../packages/spec-toolchain-shared-kernel/diagnostics.ts)：

| Field | Status | Purpose |
| --- | --- | --- |
| `severity` | required shared diagnostic field | 暴露通用严重级别，便于 family validator 把失效引用纳入既有 diagnostics 流 |
| `code` | required shared diagnostic field | 固定为 `invalid-reference`，只表达“结构化引用无法解析”的 shared 类别，不扩展 family-specific taxonomy |
| `message` | required shared diagnostic field | 暴露面向人或 agent 的最小可读说明 |
| `location.path` | required shared diagnostic field | 指出引用发生的位置，便于定位断裂点 |
| `invalidReference` | required invalid-reference field | 原样暴露失效的 [`SharedReference`](../../packages/spec-toolchain-shared-kernel/reference.ts)，确保诊断能携带被解析失败的 cross-family target |
| `related` | optional shared diagnostic field | 可附带发出该引用的 canonical object、候选 target 或其他上下文 resource，但第一阶段不强制 |

## Shared contract vs family validator responsibility

- shared `contract` 负责保证失效引用 diagnostics 至少有：`severity`、`code`、`message`、`location` 和 `invalidReference`。
- shared `contract` 只冻结 `invalid-reference` 这一通用类别，不冻结更细的错误 taxonomy。
- family-specific validator 负责决定：
  - 使用 `error`、`warning` 还是 `info`
  - `message` 如何携带 family-specific 解释
  - 是否补充 `related` resource
  - resolver 为什么失败，例如 target 缺失、kind 不匹配、ownership rule 冲突或版本提示失配

## Alignment with the existing diagnostics contract

- 该 seam 是现有 [`SharedDiagnostic`](../../packages/spec-toolchain-shared-kernel/diagnostics.ts) 的窄化扩展，而不是第二套 diagnostics 体系。
- `SharedInvalidReferenceDiagnostic` 复用同一组 shared diagnostics 字段，再额外要求 `invalidReference`，因此 validator-facing seam 仍然只有一套通用 envelope。
- `invalidReference` 复用 [`SharedReference`](../../packages/spec-toolchain-shared-kernel/reference.ts)，避免在 diagnostics 中重复定义另一份 `family` / `kind` / target identity shape。

## Boundary

- 该 expectation 只覆盖“跨 family 结构化引用失效时，shared diagnostics 至少必须长什么样”。
- 该 expectation 不定义 resolver API、ownership/topology rule taxonomy、path grammar、version negotiation 或 execution semantics。
- 该 expectation 不要求所有 family 共用同一份细粒度错误代码表；第一阶段只共享最小 invalid-reference category。

## Fit for the next candidate families

| Candidate family | How it would use the seam |
| --- | --- |
| `ui-spec` | 报告交互、状态或 component contract 指向 `frontend-spec` / `ddd-spec` / `qa-spec` canonical object 的失效链接，同时保留 UI-specific rule wording 在 validator 内部 |
| `frontend-spec` | 报告 module boundary、dependency rule 或 implementation `contract` 指向其他 family canonical object 的断裂引用，同时继续由前端 validator 决定依赖/边界语义 |
| `qa-spec` | 报告 coverage、assertion、gate 或 evidence link 指向上游 family canonical object 的失效引用，同时继续把 gate policy 和 evidence taxonomy 留在 QA validator 内 |

## Review notes

- 战略一致性：本 seam 对应 [`shared-kernel-extraction-matrix.md`](./shared-kernel-extraction-matrix.md) 中 validator-facing seam 的 `extract-now` 范围，只冻结 invalid-reference diagnostics expectation，不偷带 family rule taxonomy。
- package boundary 一致性：contract 仅落在 private maintainer package [`packages/spec-toolchain-shared-kernel/`](../../packages/spec-toolchain-shared-kernel/)；[`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/) 仍是唯一 public package boundary。
- Markdown 与术语一致性：仅使用仓库内相对 Markdown 路径，并遵循 [`terminology.md`](./terminology.md) 中的 `shared kernel`、`spec family`、`contract`、`stable ID`、`traceability` 等规定写法。
