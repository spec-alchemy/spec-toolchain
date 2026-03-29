# `ddd-spec` shared-kernel readiness checklist

本文件定义面向当前 `ddd-spec` 的 `shared kernel` readiness checklist，用于评审它是否已经具备“作为后续 family 样板”的最小条件。

本文档不是新的 `spec family` 准入标准，也不改变当前 [`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/) 作为唯一 public package boundary 的事实。它的作用是回答更具体的问题：当前 `ddd-spec` 哪些地方已经足够成为 `shared kernel candidate` 样板，哪些地方还只能停留在 family-specific 边界。

## 与 `family admission criteria` 的边界

[`family-admission-criteria.md`](./family-admission-criteria.md) 关注“新 `spec family` 能不能进入产品线”。

本 checklist 关注“当前 `ddd-spec` 能不能作为 `shared kernel` 抽取样板”。

两者的区别是：

- 准入标准面向候选 family，判断它是否具备进入 `Spec Toolchain` 的最低产品条件。
- 本 checklist 面向当前 `ddd-spec`，判断它的现有 surfaces 是否足够清晰、稳定、可组合、可回归、可教学，值得被其他 family 复用或仿照。
- 准入标准要求证明一个 family 自己成立；本 checklist 要求证明 `ddd-spec` 没有把 DDD 语义错误上提成 cross-family `contract`。

## Readiness checklist

### 1. `contract clarity`

评审问题：

- 当前准备上提的 surface，是否能用不含 DDD 对象命名的 `contract` 表达？
- 该 surface 是否能明确区分“shared shape”和“`ddd-spec` rule / IR / view semantics”？
- consumer-facing compatibility、maturity、CLI promise 是否仍留在 [`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/)？

当前 review 口径：

- 已满足：diagnostics `contract`、薄 `artifact manifest`、status-based extension points 已能以 family-agnostic shape 表达，见 [`packages/spec-toolchain-shared-kernel/`](../../packages/spec-toolchain-shared-kernel/)。
- 未满足：`domain-model/` canonical input、DDD-specific `semantic validation` rules、DDD `analysis` IR、DDD viewer navigation 仍不能脱离 DDD 命名独立成立。
- 评审阻断：如果某次抽取引入 contexts、aggregates、messages、policies 或等价 DDD 命名进入 shared surface，则不具备 readiness。

### 2. `determinism`

评审问题：

- 当前 `ddd-spec` 的 canonical workflow 是否仍可压缩为稳定的 `validate -> analyze -> generate -> view`？
- 同一组 source assets 是否能稳定地产出相同 kind 的 diagnostics 与 `artifact` 枚举结果？
- shared 候选 surface 是否只暴露可重复构建的 shape，而不夹带临时执行状态或人工解释步骤？

当前 review 口径：

- 已满足：`ddd-spec` 已证明存在稳定入口、生成目录与 maintainer 回归入口；shared skeleton 当前只暴露 versioned shape，不承诺不稳定 runtime behavior。
- 部分满足：diagnostic `code` 词表、future `artifact kind` 空间、`traceability` 细节还没有冻结，只能作为 candidate seam 使用，不能当成稳定 shared promise。
- 评审阻断：如果新 shared surface 只有 prose 解释才能消费，或依赖隐式 CLI 行为、临时路径约定、不可枚举输出，则不具备 readiness。

### 3. `composability`

评审问题：

- 拟上提能力是否真的是多个 `spec family` 都会需要的 seam，而不是 `ddd-spec` 的便利抽象？
- 该 surface 是否允许 `ui-spec`、`frontend-spec`、`qa-spec` 以自己的 canonical input 和 semantic rules 接入？
- shared package 是否只提供薄边界，而把 family-specific rule logic 留在原 family？

当前 review 口径：

- 已满足：diagnostics、`artifact` 枚举 envelope、reserved/candidate extension points 可以被多个候选 family 复用，且测试已使用非 DDD family 示例。
- 未满足：`schema validation` loader seam、viewer detail primitives、`traceability` contract 仍需通过后续 preflight 与 extraction story 收敛，当前不能假定已经可组合。
- 评审阻断：如果某能力只有在 `ddd-spec` 的 resource kinds、projection pipeline 或 viewer path 下才成立，则不具备 readiness。

### 4. `verifiability`

评审问题：

- 该 readiness 结论是否能被 repo 内的文档、测试、示例或回归入口支撑？
- 当 shared 抽取越界时，review 是否有明确的阻断依据，而不是靠主观感觉？
- 任何影响 shared `contract` 的改动，是否都能同步补充断言、示例或 review notes？

当前 review 口径：

- 已满足：`ddd-spec -> shared kernel` 拆分基线、目录 ownership、shared `contract` skeleton 已形成连续 review 资产；shared package 也有 focused tests。
- 部分满足：readiness 目前仍以 strategy review + focused tests 为主，尚未形成覆盖所有 future extraction seams 的自动化门禁。
- 评审阻断：如果某次 boundary 变更无法同时更新相应 strategy doc、测试或可执行断言，则不具备 readiness。

### 5. `teachability`

评审问题：

- 维护者或 agent 是否能用少量文档与稳定术语解释“什么能进 `shared kernel`、什么不能”？
- 当前 review 材料是否能直接指导后续 beads，而不是重新发明 taxonomy？
- 候选 family 的 preflight 是否能直接复用这些边界与术语？

当前 review 口径：

- 已满足：现有 strategy docs 已把 shared surfaces、目录 ownership、placeholder policy 固化为可复用材料。
- 仍需补强：需要继续通过 `ui-spec`、`frontend-spec`、`qa-spec` preflight 验证这些判据是否足够教给第二个和第三个 family，而不回退到 DDD 视角。
- 评审阻断：如果某次 story 只能靠口头上下文解释，无法指向 [`spec-family-map.md`](./spec-family-map.md)、[`ddd-spec shared kernel candidate baseline`](./ddd-spec-shared-kernel-candidate-baseline.md) 或本 checklist，则不具备 readiness。

## Current readiness conclusion

按当前状态，`ddd-spec` 已经具备“作为 `shared kernel candidate` 样板”的初版 readiness，但只限于薄 `contract` 与 review seam，不足以支撑大规模迁移。

可以作为样板的部分：

- diagnostics `contract`
- `artifact manifest` skeleton
- status-based extension points
- strategy-side capability split、ownership、review notes

仍应留在 `ddd-spec` 的部分：

- canonical input 与 `domain-model/` `contract`
- DDD-specific `semantic validation` rules
- DDD-specific `analysis` IR 与 projection logic
- DDD viewer navigation、detail semantics 与生成 targets

下一轮评审重点：

1. 后续 family preflight 是否证明当前 shared seams 对 `ui-spec`、`frontend-spec`、`qa-spec` 足够有用。
2. `traceability`、viewer detail primitives、validator-facing seams 是否能继续保持 family-agnostic。
3. 任一抽取是否意外削弱 [`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/) 的 public package boundary。

## Review notes

- 战略一致性：本 checklist 直接复用 [`spec-family-map.md`](./spec-family-map.md) 的 runtime surfaces，并保持 `ddd-spec` 是当前 `wedge product`，不是品牌本体。
- package boundary 一致性：所有 consumer-facing promise 继续留在 [`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/)；本文件只服务 internal review。
- Markdown 与术语一致性：仅使用仓库内相对 Markdown 路径，并遵循 [`terminology.md`](./terminology.md) 中的 `shared kernel`、`spec family`、`contract`、`artifact`、`traceability`、`wedge product` 等规定写法。
