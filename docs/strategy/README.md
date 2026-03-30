# 战略文档

本目录用于固化 `spec-toolchain` / `spec-alchemy` 的品牌与产品线战略，目标是防止未来在品牌定义、spec family 扩张、以及准入标准上的漂移。

建议阅读顺序：

1. [品牌宪法](./brand-constitution.md)
   先看不可轻易变化的战略定义：我们是谁、做什么、不做什么。
2. [Spec Family 结构图](./spec-family-map.md)
   再看产品线结构：`shared kernel`、当前 `spec family`、候选 `spec family`、跨 family 关系。
3. [Spec Family 准入标准](./family-admission-criteria.md)
   最后看扩张门槛：什么样的 `xxx-spec` 才允许进入产品线。
4. [新增 Spec Family 评审模板](./new-family-review-template.md)
   当准备引入新的 family 时，用这份模板组织提案与评审材料。
5. [术语表](./terminology.md)
   用于统一品牌、产品结构、运行时能力与评审文档中的严格术语写法。
6. [ddd-spec shared kernel candidate baseline](./ddd-spec-shared-kernel-candidate-baseline.md)
   当需要评审 `ddd-spec -> shared kernel` 拆分时，先看这份能力拆分基线。
7. [shared kernel directory and ownership plan](./shared-kernel-directory-ownership.md)
   当需要确定 landing zone、ownership 和 orchestration 边界时，先看这份目录方案。
8. [shared kernel extraction matrix](./shared-kernel-extraction-matrix.md)
   当需要确认哪些 shared surfaces 现在可抽、哪些应暂缓、哪些必须继续留在 family-specific 层时，先看这份冻结 matrix。
9. [shared stable ID contract](./shared-stable-id-contract.md)
   当需要确认 canonical source object identity 的最小 shared seam，以及它为什么不能覆盖 artifact-local IDs 时，先看这份边界说明。
10. [shared reference contract](./shared-reference-contract.md)
   当需要确认 cross-family reference 的最小 shared seam、哪些字段参与解析、哪些字段只用于辅助诊断时，先看这份边界说明。
11. [shared invalid-reference diagnostics](./shared-invalid-reference-diagnostics.md)
   当需要确认失效引用 diagnostics 至少要暴露哪些 shared 字段、哪些细节仍留给 family validator 时，先看这份边界说明。
12. [shared kernel contract skeleton](./shared-kernel-contract-skeleton.md)
   当需要评审第一版 shared `contract` skeleton 是否过薄或语义泄漏时，先看这份边界说明。
13. [ddd-spec shared kernel readiness checklist](./ddd-spec-shared-kernel-readiness-checklist.md)
   当需要判断当前 `ddd-spec` 是否已经足够成为后续 family 的 shared-kernel 样板时，先看这份 checklist。
14. [ui-spec shared kernel preflight](./ui-spec-shared-kernel-preflight.md)
   当需要评审 `ui-spec` 对 `validation`、`analysis`、`generation`、`viewer` 四个 runtime surfaces 的 shared needs 时，先看这份预演结果。
15. [frontend-spec shared kernel preflight](./frontend-spec-shared-kernel-preflight.md)
   当需要评审 `frontend-spec` 对 dependency rules、contract consistency 与 impact analysis 的 shared needs 时，先看这份预演结果。
16. [qa-spec shared kernel preflight](./qa-spec-shared-kernel-preflight.md)
   当需要评审 `qa-spec` 对 `traceability`、`evidence chain` 与 gate seam 的 shared needs 时，先看这份预演结果。
17. [shared kernel ralph-loop backlog](./shared-kernel-ralph-loop-backlog.md)
   当需要把当前产物继续拆成可执行的 extraction / preflight / migration-prep beads 时，先看这份 backlog。

目录原则：

- 这里只放 durable strategy docs，不放路线图、周报、阶段总结。
- 新增 `spec family` 前，先更新或至少核对这三份文件。
- 评审新的 `xxx-spec` 时，优先复用模板，而不是自由发挥写 `proposal`。
- 如果实现与文档冲突，以可执行产物为准；但战略边界冲突必须先修正文档再继续扩张。
