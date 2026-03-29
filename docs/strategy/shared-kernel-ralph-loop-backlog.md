# `shared kernel` `ralph-loop` backlog

本文件定义 US-008 的可连续推进 backlog，用于把当前 `ddd-spec shared kernel candidate` 产物收束成后续可执行的 loop 单元。

本文档只组织下一轮 extraction / review 节奏，不直接实现新的 `ui-spec`、`frontend-spec`、`qa-spec` 产品，也不改变当前 [`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/) 作为唯一 public package boundary 的事实。

## Backlog sequencing rule

后续 loop 必须保持以下顺序：

1. 先收敛边界，再决定 shared seam。
2. 先补 shared skeleton，再扩大家族预演结论。
3. 先证明 cross-family `contract` 成立，再讨论迁移准备。
4. 不把候选 family 预演偷换成正式实现。

## Ready-to-run backlog

| ID | Stage | Goal | Required input | Expected output | Review focus |
| --- | --- | --- | --- | --- | --- |
| SK-LOOP-01 | boundary | 冻结第一批 extraction 候选的判定口径 | [`ddd-spec shared kernel candidate baseline`](./ddd-spec-shared-kernel-candidate-baseline.md), [`ddd-spec shared kernel readiness checklist`](./ddd-spec-shared-kernel-readiness-checklist.md), [`shared kernel directory and ownership plan`](./shared-kernel-directory-ownership.md) | 一份更新后的 extraction matrix，明确“本轮可抽 / 暂缓 / 明确保留”三类项，以及每类的阻断依据 | 是否仍严格按 [`spec-family-map.md`](./spec-family-map.md) runtime surfaces 分类；是否把 DDD rule names、canonical input 或 viewer navigation 错误上提 |
| SK-LOOP-02 | boundary | 收敛 shared reference / `stable ID` seam 的最小 `contract` 范围 | [`ui-spec shared kernel preflight`](./ui-spec-shared-kernel-preflight.md), [`frontend-spec shared kernel preflight`](./frontend-spec-shared-kernel-preflight.md), [`qa-spec shared kernel preflight`](./qa-spec-shared-kernel-preflight.md), [`spec-family-map.md`](./spec-family-map.md) | 一份 reference seam proposal，定义最薄 shared 字段、失效诊断需求和明确非目标 | 是否只抽 family-agnostic 引用 shape，而不引入 view、module、scenario、coverage 等 family 词表 |
| SK-LOOP-03 | skeleton | 扩展 [`packages/spec-toolchain-shared-kernel/`](../../packages/spec-toolchain-shared-kernel/) 的 reference / provenance skeleton | [`packages/spec-toolchain-shared-kernel/`](../../packages/spec-toolchain-shared-kernel/), `SK-LOOP-02` 的 review 结论 | 最小 code + focused tests，只覆盖 reference / provenance envelope 与 placeholder policy | shared package 是否仍保持薄边界；测试是否用非 DDD family 示例证明 shape，而不是复用 DDD 语义 |
| SK-LOOP-04 | skeleton | 评审 shared `viewer contract` primitives 是否值得成为下一批候选 | [`ddd-spec shared kernel candidate baseline`](./ddd-spec-shared-kernel-candidate-baseline.md), [`ui-spec shared kernel preflight`](./ui-spec-shared-kernel-preflight.md), [`frontend-spec shared kernel preflight`](./frontend-spec-shared-kernel-preflight.md) | 一份 viewer-primitives decision doc，明确可抽的 detail/node/edge skeleton 与必须保留在 family 层的语义 | 是否只上提结构化 inspector primitive，而不冻结 `ddd-spec` 或 future family 的视图导航与信息架构 |
| SK-LOOP-05 | preflight | 基于新 skeleton 回刷 `ui-spec` / `frontend-spec` / `qa-spec` 预演 | [`ui-spec shared kernel preflight`](./ui-spec-shared-kernel-preflight.md), [`frontend-spec shared kernel preflight`](./frontend-spec-shared-kernel-preflight.md), [`qa-spec shared kernel preflight`](./qa-spec-shared-kernel-preflight.md), `SK-LOOP-03`, `SK-LOOP-04` | 三份短更新或补遗，明确哪些缺口已被 shared skeleton 覆盖，哪些仍阻断 family admission | 预演是否仍聚焦接入条件，而不是开始定义正式 canonical input、CLI 或产品功能 |
| SK-LOOP-06 | preflight | 收敛 shared analysis summary / semantic result seam 是否需要独立 `contract` | [`ddd-spec shared kernel candidate baseline`](./ddd-spec-shared-kernel-candidate-baseline.md), 三份 family preflight 补遗, [`shared kernel contract skeleton`](./shared-kernel-contract-skeleton.md) | 一份 analysis/result seam brief，结论只能是“抽薄 shape”或“继续暂缓” | 是否真的存在跨 family 稳定摘要结构；是否避免把 DDD、UI、frontend、QA 指标词表提升到 shared |
| SK-LOOP-07 | migration-prep | 形成第一批 extraction-ready change set 清单 | `SK-LOOP-01` 到 `SK-LOOP-06` 的结论, [`shared kernel directory and ownership plan`](./shared-kernel-directory-ownership.md) | 一个 migration-prep checklist，列出可实施的最小抽取、所需测试、对应 owner 和回滚边界 | 是否仍保持“小步抽取”；是否保护 [`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/) 的 public promise；是否避免大规模搬迁 |
| SK-LOOP-08 | migration-prep | 准备首个真正 extraction bead，而不是产品 feature bead | `SK-LOOP-07` checklist, [`ddd-spec shared kernel readiness checklist`](./ddd-spec-shared-kernel-readiness-checklist.md) | 一个 bead-ready task brief，明确输入、输出、测试、review blocker 和 stop condition | bead 是否足够窄、可在单轮 agent session 完成；是否仍是 shared seam 提炼，而不是新 family 实现 |

## Backlog item contract

每个后续 bead 至少要带上三类信息：

- 输入：必须显式引用已有 strategy doc、shared package surface 或已通过 review 的前序结论。
- 输出：必须是可审查的边界产物，例如短 doc、薄 `contract` skeleton、focused tests、checklist 或 bead brief。
- review focus：必须明确说明本轮主要防什么漂移，例如 DDD 语义上提、package boundary 模糊、术语漂移、Markdown 路径违规。

如果某个 backlog 项无法写清这三类信息，就不应该进入 `ralph-loop`。

## Explicit non-goals for this backlog

- 不直接实现新的 `ui-spec`、`frontend-spec`、`qa-spec` package、CLI 或 runtime
- 不做 `ddd-spec` 大规模代码迁移
- 不把 root orchestration 抽象成“多 family 已完成”的通用平台
- 不在 shared package 中提前冻结 `execution` abstraction

## Readiness to enter `ralph-loop`

以上 backlog 已满足可执行条件，因为它们都具备：

- 明确前序输入，且直接引用当前已落地的 strategy 资产与 shared package skeleton
- 明确输出边界，且产物都可在一次聚焦 loop 内完成 review
- 明确 review focus，能直接检查战略一致性、package boundary、Markdown 规范与术语一致性
- 明确节奏，从边界到 skeleton，再到 preflight，最后才进入迁移准备

## Review notes

- 战略一致性：本 backlog 以 [`spec-family-map.md`](./spec-family-map.md) 的 runtime surfaces 和已有 family preflight 为主轴，没有把 `ddd-spec` 扩写为品牌本体，也没有把候选 family 提前当成已承诺产品。
- package boundary 一致性：shared work 继续收敛在 internal package [`packages/spec-toolchain-shared-kernel/`](../../packages/spec-toolchain-shared-kernel/) 和 strategy docs；所有 consumer-facing promise 仍留在 [`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/)。
- Markdown 与术语一致性：仅使用仓库内相对 Markdown 路径，并遵循 [`terminology.md`](./terminology.md) 中的 `spec family`、`shared kernel`、`contract`、`artifact`、`traceability`、`stable ID`、`wedge product` 等规定写法。
