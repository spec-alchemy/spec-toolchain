# `shared kernel` extraction matrix

本文件冻结第一版 shared extraction matrix，用于给 `SK-LOOP-01` 和后续 extraction stories 提供统一 review 基线。

本文档只定义“哪些 shared surfaces 现在可以抽、哪些应暂缓、哪些必须继续留在 family-specific 层”的判定结果，不直接触发 package 迁移，也不改变当前 [`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/) 作为唯一 public package boundary 的事实。

## 判定口径

- `extract-now`
  - 已经有跨 family 的共同压力，且第一阶段可以先落成 family-agnostic 的薄 `contract`、types、focused tests 或 review seam
  - 不依赖 DDD、UI、frontend 或 QA 专有词表才成立
- `defer`
  - 方向明确属于 `shared kernel`，但当前还缺足够稳定的 shape，若现在抽取会把 family-specific 语义误升成 shared `contract`
- `keep-family-specific`
  - 当前价值主要来自 family-specific canonical object model、rule logic、summary taxonomy 或 viewer navigation，不应伪装成 cross-family surface

## Frozen matrix

| Shared surface | Status | Current extraction boundary | Basis | Current blocker or guardrail |
| --- | --- | --- | --- | --- |
| `stable ID` | `extract-now` | 先抽 canonical source object 的最小 `stable ID` `contract`，只定义 family-agnostic identity seam，不覆盖 artifact-local derived IDs | [`spec-family-map.md`](./spec-family-map.md) 已把 cross-family 链接锚点定义为 shared need；[`ui-spec shared kernel preflight`](./ui-spec-shared-kernel-preflight.md)、[`frontend-spec shared kernel preflight`](./frontend-spec-shared-kernel-preflight.md)、[`qa-spec shared kernel preflight`](./qa-spec-shared-kernel-preflight.md) 都把它列为当前阻断 | 必须显式区分 canonical object identity 与 artifact-local identity；不得把 scenario、view、module、coverage target 等 family 词表写进 shared shape |
| reference shape | `extract-now` | 先抽 cross-family reference 的最小字段集，只覆盖 family、kind、target identity、可选定位/诊断辅助位 | 三份 family preflight 都需要结构化 cross-family 引用；当前 shared skeleton 只有 diagnostics related resource shape，不足以承担正式引用语义 | `versionHint` 如存在只能是可选辅助位；不得把解析规则绑定到 DDD resource kinds、UI path、frontend module taxonomy 或 QA evidence taxonomy |
| provenance / `traceability` | `extract-now` | 先抽 output-to-source linkage skeleton，只表达 source linkage 与最小派生关系，不扩张为完整 `evidence chain` 或 execution model | [`spec-family-map.md`](./spec-family-map.md) 把 `traceability` 定义为 shared surface；三份 family preflight 都指出当前缺少 provenance seam | 第一阶段只允许最小关系语义字段；不得把 QA assertion semantics、UI path scoring、frontend impact taxonomy 提前冻结到 shared layer |
| analysis summary/result seam | `defer` | 先继续把 diagnostics 和 `artifact manifest` 当作 review seam；是否需要独立 analysis summary envelope 留到后续 loop 收敛 | [`ddd-spec shared kernel candidate baseline`](./ddd-spec-shared-kernel-candidate-baseline.md) 已将 `analysis` 标成 `undecided`；`ui-spec`、`frontend-spec` 都只证明“可能需要”，还没证明存在稳定跨 family 摘要结构 | 当前 summary 高度依赖 family-specific metrics 与 IR；若现在抽取，容易把 DDD summary、UI complexity、frontend risk、QA gate result 误升为 shared `contract` |
| viewer primitives | `defer` | 暂只保留为下一批候选 surface，后续再验证 detail value、node/edge、section/list/field skeleton 是否能独立成立 | [`ddd-spec shared kernel candidate baseline`](./ddd-spec-shared-kernel-candidate-baseline.md) 把 `viewer contract` 视为 candidate，但 [`ddd-spec shared kernel readiness checklist`](./ddd-spec-shared-kernel-readiness-checklist.md) 仍把 viewer detail primitives 列为未完成项 | 当前 viewer 仍混有 family-specific navigation 和 inspector semantics；若现在冻结，容易把 `ddd-spec` 的视图组织方式误当成通用 `viewer` `contract` |
| validator-facing seam | `extract-now` | 先以 shared diagnostics/result boundary 作为最小 validator-facing seam，服务 `schema validation` 与 invalid-reference diagnostics expectation；不抽 family rule composition | [`ddd-spec shared kernel candidate baseline`](./ddd-spec-shared-kernel-candidate-baseline.md) 已把 validator-facing diagnostics/result shape 视为可抽 candidate；现有 shared package 已落 diagnostics skeleton | 只能共享 diagnostics/result boundary 与引用定位 expectation；schema 内容、semantic rules、ownership/topology taxonomy 继续留在各 family |

## Extraction order implied by this matrix

1. 先落 `stable ID`、reference shape、provenance / `traceability` 和 validator-facing seam 的最小 shared `contract`。
2. 再用 focused tests 证明这些 seam 不依赖 DDD 语义，并能作为 `ui-spec`、`frontend-spec`、`qa-spec` 的共同接入前提。
3. analysis summary/result seam 与 viewer primitives 暂缓，直到能证明存在真正稳定的 family-agnostic shape。

## Explicit non-goals for this matrix

- 不把 `domain-model/` canonical input、DDD resource kinds 或 `version: 1` `contract` 上提到 `shared kernel`
- 不把 UI、frontend、QA 的 canonical object model、summary metrics、viewer navigation 或 rule taxonomy 冻结成 shared `contract`
- 不把 `SK-LOOP-01` 扩张成 migration plan、runtime 接入或第二个 family 的实现启动

## Review notes

- 战略一致性：本 matrix 严格按 [`spec-family-map.md`](./spec-family-map.md) 已定义的 shared surfaces 收敛，并用三份 family preflight 验证 cross-family 压力，没有把 `ddd-spec` 重新定义为品牌本体。
- package boundary 一致性：本文只冻结 extraction 判定口径；shared work 仍收敛在 internal strategy docs 与 [`packages/spec-toolchain-shared-kernel/`](../../packages/spec-toolchain-shared-kernel/)，所有 consumer-facing promise 继续留在 [`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/)。
- Markdown 与术语一致性：仅使用仓库内相对 Markdown 路径，并遵循 [`terminology.md`](./terminology.md) 中的 `spec family`、`shared kernel`、`contract`、`artifact`、`viewer`、`traceability`、`stable ID` 等规定写法。
