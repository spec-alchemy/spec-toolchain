# 战略文档

本目录用于固化 `spec-toolchain` / `spec-alchemy` 的品牌与产品线战略，目标是防止未来在品牌定义、spec family 扩张、以及准入标准上的漂移。

建议阅读顺序：

1. [品牌宪法](./brand-constitution.md)
   先看不可轻易变化的战略定义：我们是谁、做什么、不做什么，以及什么不属于 `Spec Toolchain`。
2. [Spec Family 结构图](./spec-family-map.md)
   再看产品线结构：`shared kernel`、当前 `spec family`、候选 `spec family` 的结构角色，以及跨 family 关系。
3. [Spec Family 准入标准](./family-admission-criteria.md)
   再看扩张门槛：什么样的 `xxx-spec` 才允许进入产品线，必须提供哪些证据。
4. [新增 Spec Family 评审模板](./new-family-review-template.md)
   当准备引入新的 family 时，用这份模板组织提案与评审材料，避免自由发挥导致评审口径漂移。
5. [术语表](./terminology.md)
   用于统一品牌、产品结构、运行时能力与评审文档中的严格术语写法。

五份文档的边界分工：

- `brand-constitution.md` 只回答战略定义与硬约束，不写候选 family 方案或阶段性执行结论。
- `spec-family-map.md` 只回答产品结构与 family 关系，不单独承担准入评审或实现设计。
- `family-admission-criteria.md` 只回答准入门槛、所需证据与否决条件，不重复品牌总述。
- `new-family-review-template.md` 只提供提案与评审结构，不沉淀新的战略定义。
- `terminology.md` 只定义严格术语，不扩写产品路线或实现细节。

目录原则：

- 这里只放 durable strategy docs，不放 shared-kernel 拆分草稿、阶段性 preflight、readiness checklist、backlog 或状态总结。
- shared-kernel 的真实边界以 `packages/spec-toolchain-shared-kernel/`、相关测试与当前 family 实现为准，不在这里重复维护一套实现说明。
- 新增 `spec family` 前，先核对 [品牌宪法](./brand-constitution.md)、[Spec Family 结构图](./spec-family-map.md)、[Spec Family 准入标准](./family-admission-criteria.md)、[新增 Spec Family 评审模板](./new-family-review-template.md) 与 [术语表](./terminology.md)。
- 如果实现与文档冲突，以可执行产物为准；如果品牌、family 边界或准入标准发生变化，必须先更新本目录中的长期战略文档。
