# Design-Spec Local Instructions

## Overview

- `design-spec/` 保存一个最小的 `DDD + XState` 样板业务。
- 保持结构直接、文件精简、语义清晰。
- 目标不是覆盖完整产品，而是保留最核心的建模模式：
  - `domain` 定义领域真相
  - `state` 定义运行时投影
  - `domain/aggregates` 定义聚合内部的命令 -> 生命周期变化 -> 领域事件 真相
  - 聚合 machine 只投影聚合真相并发出领域事件
  - `domain/processes` 定义跨聚合流程真相
  - process manager machine 基于流程真相推进闭环

## Structure

- `domain/`：领域对象、命令、领域事件、业务流程。
- `domain/aggregates/`：聚合内部行为真相。
- `domain/processes/`：跨聚合流程阶段、推进规则、结束结果。
- `state/machines/`：聚合生命周期 machine。
- `state/system/`：消费流程真相的 process manager machine。
- `types.ts`：共享的最小结构类型。
- `index.ts`：样板业务的统一导出入口。

## Current Sample Business

- 当前样板业务只有两个聚合：`Connection` 和 `Card`。
- `Connection` 生命周期：`suggested -> confirmed | archived`
- `Card` 生命周期：`suggested -> accepted | archived`
- 主流程只有一条：
  1. 用户先审核建议连接
  2. 连接确认后，系统进入建议卡片阶段
  3. 用户再审核建议卡片
- 闭环结束共有三种结果：
  - `ConnectionArchived`：在连接阶段提前结束
  - `CardArchived`：在卡片阶段提前结束
  - `CardAccepted`：正常完成

## File Responsibilities

- [objects.ts](./domain/objects.ts)：定义对象标识、生命周期和值字段。
- [commands.ts](./domain/commands.ts)：定义外部意图，目标是某个聚合。
- [events.ts](./domain/events.ts)：定义聚合状态变化后的领域事实。
- [connection.aggregate.ts](./domain/aggregates/connection.aggregate.ts)：定义 `Connection` 聚合的命令 -> 状态变化 -> 事件 真相。
- [card.aggregate.ts](./domain/aggregates/card.aggregate.ts)：定义 `Card` 聚合的命令 -> 状态变化 -> 事件 真相。
- [connection-card-review.process.ts](./domain/processes/connection-card-review.process.ts)：定义 `Connection -> Card` 审核闭环的跨聚合流程真相。
- [connection.machine.ts](./state/machines/connection.machine.ts)：把 `Connection` 聚合真相投影成 XState machine。
- [card.machine.ts](./state/machines/card.machine.ts)：把 `Card` 聚合真相投影成 XState machine。
- [connection-card-review.system.ts](./state/system/connection-card-review.system.ts)：消费流程真相并执行两个聚合的运行时编排。
- [index.ts](./index.ts)：导出完整闭环规格 `connectionCardReviewSpec`，是读取全貌的首选入口。

## Runtime Model

- `commands` 是外部输入，先进入 process manager machine。
- `domain/aggregates` 是聚合内部行为的第一真相。
- `domain/processes` 是跨聚合流程的第一真相。
- aggregate machine 根据聚合真相处理命令并发出领域事件。
- process manager machine 根据流程真相决定当前阶段接受哪些命令、观察哪些领域事件。
- process manager machine 把命令转发给对应聚合 actor。
- 聚合 machine 通过 `sendParent(...)` 发出领域事件。
- process manager machine 观察领域事件并切换到下一个阶段或结束状态。
- process manager 不直接制造聚合领域事件；领域事件只来自聚合 machine。

## Modeling Rules

- 每个领域对象都要显式声明 `lifecycleField` 和 `lifecycle`。
- 每个聚合的 command -> target lifecycle -> emitted event 必须优先定义在 `domain/aggregates/`。
- 每个聚合 machine 只负责把聚合真相投影成运行时生命周期 machine。
- `commands` 表达外部意图，并明确指向目标聚合。
- `domain events` 表达聚合状态变化后的事实，并由聚合 machine 发出。
- 跨聚合流程阶段、结束结果、事件推进规则必须优先定义在 `domain/processes/`。
- process manager machine 只消费命令、领域事件和流程真相，不要在 `state/` 再发明第二份流程规则。
- 对象生命周期、命令类型、事件类型、machine 状态要保持命名一致。

## Editing Rules

- 优先使用直接定义，不为样板增加额外抽象。
- 只在能提升职责可读性时添加短注释。
- 修改生命周期时，同时更新：
  - `domain/objects.ts`
  - `domain/aggregates/` 中对应聚合的行为规则
  - 相关命令和领域事件
- 修改聚合内部 command -> event 关系时，优先改 `domain/aggregates/`，不要直接改 `state/machines/`。
- 修改流程阶段时，优先改 `domain/processes/`，再检查 process manager machine 的运行时投影是否仍然成立。
- 不要把跨聚合编排塞进聚合 machine。
- 修改 `domain/` 时同步检查 `state/` 和 `index.ts` 的导出是否仍然一致。

## Visual Editor Compatibility

- aggregate machine 和 process manager machine 都可以根据 `domain` 真相生成运行时配置。
- 单一业务真相优先于 `XState Visual Editor / Stately Studio` 的静态提取兼容性。
- machine 定义要尽量保持可读，不要为了抽象而隐藏业务语义来源。

## Verification

- 运行 `npx -y -p typescript tsc --noEmit`
