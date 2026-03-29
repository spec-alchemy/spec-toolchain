# 品牌宪法（Spec Toolchain / Spec Alchemy）

> 目的：用可长期维护、可校验的方式锁定战略意图，防止产品线漂移。
> 本文件是宪法，不是路线图。

## 1. 品类定义

`Spec Toolchain` 是 `spec-alchemy` 用来构建和发布 **AI-native spec tooling** 的工作区：

- 我们构建把 **spec as code** 当作一等公民的工具链：设计资产必须结构化、可版本化、机器可读。
- 我们提供共享能力：**modeling**、**validation**、**analysis**、**generation** 与 **viewer**。
- 本仓库承载公开 spec 包背后的共享底座，目前从 `@spec-alchemy/ddd-spec` 开始。

## 2. 核心承诺

我们把设计意图转化为 **durable assets**，并要求这些资产同时具备：

- `self-checking`：通过 schema 与 semantic validation 阻断无效设计资产。
- `self-inspecting`：通过 analysis 产物解释结构、依赖、缺口与影响面。
- `executable`：通过 generation 与可运行表面进入真实工作流，例如 CLI、viewer、集成接口与门禁。
- `AI-native`：天然适配 agent loop，具有清晰契约、确定性输出与可教学的命令面。

## 3. 楔子产品（第一个 Spec Family）

`ddd-spec` 是第一个 `spec family`，也是当前的 `wedge product`：

- 它用 DDD 概念建模 **product logic**，包括 contexts、scenarios、messages、aggregates、policies。
- 它验证了核心工具链模式：`author -> validate -> analyze -> generate -> view`。
- 它不是品牌本体，而是 `spec family` 战略的第一个具体实现。

## 4. Spec Family 扩张逻辑

我们只在满足以下条件时才扩张新的 `xxx-spec` family，例如 `ui-spec`、`frontend-spec`、`qa-spec`：

- 它定义的是一个稳定的 **design domain**，并且拥有 durable 的 source asset 格式，而不是临时 prose。
- 它能够接入 `shared kernel`：
  - 可版本化的 `contract`
  - `semantic validation` 所依赖的跨文件、跨实体约束
  - `analysis` 产物，包括结构化诊断、关系、覆盖面
  - `generation` 产物，即可被工具消费的 `artifact`
  - `viewer` 所依赖的一致 `contract`
- 它能够与其他 `spec family` 组合：
  - cross-spec references 必须显式且可解析
  - provenance 必须可追踪，能回答“哪个 spec 产出了哪个结果，为什么”

默认立场：宁可 `spec family` 更少，也不要做浅层 `spec family`。每个 `spec family` 都必须足够 **deep**，至少具备 `validation`、`analysis` 与 `artifact`，而不是停留在写法或模板层。

## 5. 非目标（硬约束）

我们明确不做：

- 以不可测试 prose 为主资产的通用 “AI 写 docs/PRDs” 产品。
- 全面替代 Figma、Jira、IDE；我们通过 `artifact` 与 `contract` 集成，而不是克隆这些工具。
- 在本仓库中承载业务专属资产；consumer-specific 内容应放在 consumer repos。
- 把 schema validation 当作充分条件；跨文件语义与拓扑约束必须进入 semantic validation。
- 为了兼容历史包袱牺牲清晰性；退役契约应当删除，而不是长期保留。

## 6. 决策原则

在决定“接下来做什么”时，优先选择那些能提升以下属性的方案：

- **Contract clarity**：更少 primitive、更强语义、更清楚边界。
- **Determinism**：稳定的 CLI、稳定的 artifact 布局、可重复的输出。
- **Composability**：`shared kernel` 优先，family-specific code 次之。
- **Verifiability**：每个新增能力都附带回归覆盖与可操作诊断。
- **Teachability**：产品表面能被压缩为少量命令与一条 canonical workflow。

如果某项提议提高了“powered-by prompts”的成分，却削弱了 validation、introspection 或 determinism，
它就不属于 `Spec Toolchain` 的战略范围。
