# Spec Family 结构图
本文件定义 `spec-toolchain` 的产品结构视角：以 `shared kernel` 承载通用能力，以多个 `xxx-spec` family 承载不同设计域的可执行设计资产。目标是让每个 `spec family` 都具备一致的 `spec as code` 生命周期：`validate -> analyze -> generate -> view`，以及可选的 `execute`。

## Shared Kernel（跨 Family 复用能力）

`shared kernel` 是所有 `xxx-spec` family 必须共用的能力面，用于避免每个 `spec family` 各自发明一套 pipeline。

- Spec IO `contract`：入口文件、输入根目录、产物目录、产物清单（可枚举）
- `schema validation`：单文件结构校验（字段、类型、必填、枚举、格式）
- `semantic validation`：跨文件引用、所有权、拓扑与一致性规则校验
- `analysis`：从原始 spec 推导“可视化、可检查”的派生视图数据，可用于 `viewer`、诊断与质量门禁
- `generation`：产出面向下游的代码、配置、测试、文档或数据，但生成物必须可追溯回源 spec
- `viewer contract`：一套稳定的 `viewer artifact` 结构，而不是 prose，用于支撑 inspection 与 `traceability`
- CLI 与配置：一致的命令形态与配置解析，例如 `init/dev/validate/build/serve/watch/doctor`
- 诊断：面向人和 agent 的可操作诊断，能定位到文件、字段与引用链
- `traceability`：跨 `spec family` 的可链接标识符与引用语义，见文末“跨 Family 关系”

## `ddd-spec`（当前已落地）

`ddd-spec` 是第一条已验证的 `spec family`，用 DDD 的方式对产品逻辑与协作进行建模。

- 主要用户：产品、架构、工程团队（以建模为主），AI agent（以执行与检查为主）
- 源资产：`domain-model/`，属于用户自有资产
- 入口：`domain-model/index.yaml`
- 输出：`.ddd-spec/`，即生成产物目录
- 成熟度：当前按 `beta` 管理
- 兼容承诺：
  - 当前只支持 `version: 1` 的 domain model `contract`
  - 在 `version: 1` 内，允许新增可选字段或新增不破坏既有含义的 `artifact` 字段，但不允许静默改变既有字段语义、默认工作流或既有引用解释规则
  - 新增 resource kinds、引用语义或破坏既有字段含义的变更，一律视为 `contract` 变更；必须先明确版本策略，再同步更新 `schema validation`、`semantic validation`、示例与回归
  - 为了提升 `contract clarity` 而移除历史包袱是允许的，但不能伪装成兼容变更
- 校验表面：
  - `schema validation`：资源文件结构正确
  - `semantic validation`：跨文件引用、所有权、拓扑约束正确
  - `analysis`：推导出的结构化分析结果一致
- 生成表面：`bundle / analysis / viewer / typescript`，以配置为准
- Viewer 表面：主路径是 `Context Map -> Scenario Story -> Message Flow/Trace -> Lifecycle`
- 定位约束：它是当前 `wedge product`，不是品牌本体，也不自动代表其他 `spec family` 的 canonical input 或实现方式

## 候选 Families（下一批 Family 的结构约束，不代表实现承诺）

下面的 `spec family` 只是扩展方向的占位符。重点是定义“它们如何接入 `shared kernel`”的产品结构，而不是现在就承诺具体语法。

### `ui-spec`

- 主要用户：设计、产品、前端、QA
- 源资产：UI 信息架构、交互流、状态语义、组件结构，以结构化 spec 作为 `source of truth`
- 校验：
  - schema：视图、组件、状态、交互事件结构
  - semantics：状态机、导航、可达性、命名一致性、依赖闭包
- 分析：
  - 关键用户路径覆盖、状态复杂度、交互一致性、可访问性风险提示
- 生成：
  - UI `contract` 数据，例如 `routes/state/contracts`；可视化检查 `artifact`；必要时生成 test stubs
- Viewer：
  - IA、flow、state 的 inspection，以及和 `frontend-spec`、`qa-spec` 的可追溯链接

### `frontend-spec`

- 主要用户：前端、全栈、架构、QA
- 源资产：前端架构边界、模块与依赖、接口契约、组件实现约束、性能与兼容性门槛
- 校验：
  - semantics：依赖方向、层级边界、契约一致性、禁止耦合规则
- 分析：
  - 依赖图、切面（性能、安全、可维护性）风险、变更影响面
- 生成：
  - `lint` 或 `dep-rule` 配置、契约类型或客户端、脚手架或校验配置
- Viewer：
  - 架构拓扑与依赖图，以及与 `ui-spec`、`ddd-spec` 的行为与数据链接

### `qa-spec`

- 主要用户：QA、开发、产品
- 源资产：验收标准、用例矩阵、断言、质量门禁与覆盖模型
- 校验：
  - semantics：覆盖规则、traceability 完整性、不可测试项标记与处置
- 分析：
  - 覆盖率（按用户路径、领域场景、风险等级）、回归集最小化建议、缺口清单
- 生成：
  - 可执行测试骨架、数据集、检查清单，以及 pipeline gate 配置
- Viewer：
  - 覆盖矩阵与证据链，从用例连到 UI、前端或领域场景

### `architecture-spec`（或 `system-spec`）

- 主要用户：架构、平台、安全、运维
- 源资产：系统边界、运行时拓扑、关键质量属性（qualities）、风险与控制项
- `validation` / `analysis` / `generation` / `viewer`：
  - 侧重边界、依赖、威胁模型、运行时约束与部署 `contract` 的可检查与可追溯

## 跨 Family 关系

为了避免 `spec family` 各自成为信息孤岛，`shared kernel` 必须支持跨 `spec family` 的引用与 `evidence chain`。

- `stable ID`：
  - 每个 `spec family` 的核心实体必须有 `stable ID`，或可稳定推导的 canonical key，作为跨文件、跨 family 的引用锚点
- 引用语义：
  - 引用必须是显式结构化字段，不允许只靠 prose 或注释建立隐式关联
- `evidence chain`：
  - `qa-spec` 用例应能链接到 `ui-spec` 路径与状态，链接到 `frontend-spec` 契约与模块，并可选链接到 `ddd-spec` 场景、消息与聚合
- 漂移控制：
  - 当上游实体变更导致下游引用失效时，`semantic validation` 必须阻断并给出可执行诊断，例如缺失对象、失效位置与修复建议

## 使用边界

- 本文定义的是产品结构，不是准入审批结果。
- 上述候选 family 只是结构占位符，不构成实现承诺、发布时间承诺或 public package 承诺。
- 新 family 是否允许进入产品线，必须单独通过 [`family-admission-criteria.md`](./family-admission-criteria.md) 与 [`new-family-review-template.md`](./new-family-review-template.md) 的评审。
