# DDD Spec Generalization Blueprint

这份蓝图描述如何把当前仓库中的 `design-spec/` 演进为一套面向 DDD 业务规格的泛用工具。

目标不是把它抽象成“任意图建模平台”，而是把它产品化为一套稳定的 `DDD spec compiler`：

- 以结构化 canonical spec 表达业务真相
- 以统一编译流水线做校验、分析和投影
- 以多种 projection 服务前端、后端、QA 和文档场景
- 让当前 `connection/card` 领域退回为 example domain，而不是工具本体

## North Star

未来目标形态应当是：

```text
DDD canonical spec
  -> loader
  -> schema validation
  -> semantic validation
  -> graph IR
  -> analyzers
  -> projections
       -> JSON bundle
       -> TypeScript
       -> Viewer JSON
       -> Diagrams
       -> XState
       -> Other downstreams
```

最终用户面对的不是仓库内部脚本，而是一套清晰的工具接口：

- `ddd-spec validate`
- `ddd-spec analyze`
- `ddd-spec build`
- `ddd-spec generate viewer`
- `ddd-spec generate typescript`

## Product Positioning

这个工具的定位应当明确为：

- `DDD business spec compiler`
- `DDD canonical modeling toolkit`
- `DDD spec validation and projection pipeline`

不应定位为：

- 通用白板工具
- 任意流程图编辑器
- 通用 graph DSL 平台
- BPMN 替代品

原因很简单：当前真正有价值的不是“能画图”，而是它对 `object / command / event / aggregate / process` 这套 DDD 语义有明确约束，并能稳定投影到多种下游。

## Design Principles

### 1. Canonical First

`canonical/` 只表达业务真相，不表达运行时实现、界面布局或编辑器语义。

### 2. Compiler Architecture

工具核心应按 compiler pass 组织，而不是按“当前仓库脚本”组织。

### 3. DDD Semantics Stay Explicit

泛用化不应以牺牲领域语义为代价。不要为了“通用”把核心退化成 `node / edge / metadata`。

### 4. Projection Is Downstream

Viewer、TypeScript、XState、Diagram 都是 projection，不应反向污染 canonical。

### 5. Configurable Paths, Stable Contracts

输入路径、输出路径、projection 开关都应配置化；schema、diagnostic code、viewer contract 应稳定化。

### 6. Example-Driven Generalization

抽象是否成立，不靠想象判断，靠多个 example domain 压测。

## Non-Goals

本阶段不追求：

- 可视化反向编辑 canonical
- 可视化和 canonical 双向同步
- 插件系统先行
- 同时兼容 BPMN、UML、任意流程 DSL
- “一套模型覆盖所有企业建模问题”

## Current Gaps

当前仓库已经具备可泛用化的核心，但还存在几类明显耦合。

### 1. Core And Example Domain Are Mixed

当前 `design-spec/` 同时承载：

- 通用建模语言
- 通用校验和分析逻辑
- 当前产品的具体 canonical domain
- 针对 `connection/card` 的导出便利层

这会导致工具边界模糊。

### 2. Repo Paths Are Hardcoded

当前 loader 和 artifact 生成逻辑默认依赖当前仓库结构，无法自然复用到别的产品目录。

### 3. CLI Is Still Repo Script Style

现在的命令更像“本仓库内建脚本”，不是可被别的项目直接调用的工具接口。

### 4. Viewer Is Still Demo-Oriented

viewer 当前默认读取固定生成文件路径，更像 demo app，而不是通用 viewer 产品。

### 5. Public Contract Is Not Formalized

虽然已经有 schema、analysis code、viewer spec，但这些还没有被明确当作稳定公共接口维护。

## Target Architecture

建议演进为 monorepo 下的多包结构：

```text
packages/
  ddd-spec-core/
  ddd-spec-cli/
  ddd-spec-viewer-contract/
  ddd-spec-projection-typescript/
  ddd-spec-projection-viewer/
  ddd-spec-projection-diagram/
  ddd-spec-projection-xstate/
apps/
  ddd-spec-viewer/
examples/
  connection-card-review/
  order-payment/
  content-moderation/
```

## Package Boundaries

### `packages/ddd-spec-core`

职责：

- canonical model type definitions
- canonical loading
- schema validation
- semantic validation
- graph IR
- graph-based analysis
- diagnostic model

禁止包含：

- 当前具体业务域导出
- React viewer 代码
- 特定仓库路径假设
- TypeScript/XState/Mermaid 专属产物逻辑

### `packages/ddd-spec-cli`

职责：

- 读取配置
- 定位输入目录和输出目录
- 调用 core 和 projections
- 向控制台输出稳定诊断信息

建议命令：

- `ddd-spec validate`
- `ddd-spec analyze`
- `ddd-spec build`
- `ddd-spec generate viewer`
- `ddd-spec generate typescript`
- `ddd-spec doctor`

### `packages/ddd-spec-viewer-contract`

职责：

- 定义 viewer JSON contract
- 定义 node/edge/detail/help 等公共类型
- 为 viewer app 和 projection generator 提供共享接口

这层很重要，因为 viewer JSON 一旦被别的产品接入，就不再只是内部文件格式。

### `packages/ddd-spec-projection-*`

每种 projection 单独拆包：

- `projection-typescript`
- `projection-viewer`
- `projection-diagram`
- `projection-xstate`

拆分后可以避免 projection 之间互相污染，也更利于将来按需发布和组合。

### `apps/ddd-spec-viewer`

职责：

- 读取任意 viewer spec
- 提供交互式浏览能力
- 只消费 viewer contract

不应承担：

- canonical 解析
- 业务规则推导
- 特定 example domain 的固定逻辑

### `examples/*`

职责：

- 提供多个真实示例域
- 验证 core 抽象是否足够稳定
- 提供文档、演示和 golden tests 的输入

## Canonical Language Strategy

当前 canonical 语言已经有不错的基础，不建议推翻。

建议保留为 v1 核心模型：

- `object`
- `command`
- `event`
- `aggregate`
- `process`
- `vocabulary`

后续可增量扩展，但要通过版本化演进，而不是直接揉进现有字段：

- `boundedContext`
- `policy`
- `readModel`
- `invariant`
- `actor`
- `integration`

扩展原则：

- 新语义应有明确业务价值
- 新语义必须能被校验
- 新语义应能投影到至少一个明确下游
- 新语义不能把 canonical 变成 UI 配置文件

## Configuration Model

需要引入正式配置文件，例如 `ddd-spec.config.yaml`：

```yaml
version: 1
spec:
  entry: ./canonical/index.yaml
outputs:
  rootDir: ./artifacts
  bundle: ./artifacts/business-spec.json
  analysis: ./artifacts/business-spec.analysis.json
  viewer: ./artifacts/business-viewer/viewer-spec.json
  typescript: ./generated/business-spec.generated.ts
viewer:
  syncTargets:
    - ./apps/design-spec-viewer/public/generated/viewer-spec.json
projections:
  viewer: true
  typescript: true
  diagrams: true
  xstate: false
```

配置化的收益：

- 去掉对当前仓库结构的硬编码
- 支持不同产品自定义目录布局
- 支持按需关闭 projection
- 支持 CI 和本地开发使用同一入口

## Public Contracts

泛用化之前，必须把以下内容视为公共接口维护。

### 1. Canonical Schema

需要正式版本化：

- `schemaVersion`
- 兼容策略
- 废弃字段策略
- migration guide

### 2. Diagnostic Codes

诊断码不只是内部常量，应视为可被 CI、IDE、QA 工具消费的接口。

要求：

- code 稳定
- message 可读
- path 可定位
- severity 明确

### 3. Graph IR

Graph IR 不一定对最终用户公开，但必须对内部 projection 保持稳定边界。

### 4. Viewer JSON Contract

Viewer JSON 需要明确：

- spec 元信息
- view 定义
- node/edge 结构
- details/help 语义
- 向后兼容策略

## Viewer Productization

viewer 要从“当前仓库 demo”升级成“通用消费端”。

建议能力：

- 支持传入远程 JSON URL
- 支持上传本地 JSON
- 支持切换多个 spec
- 支持 view 切换
- 支持高亮关系链路
- 支持按 aggregate/process/command/event 过滤
- 支持 linkable deep link

建议不要做的事：

- 不要在 viewer 内重做 canonical 校验
- 不要在 viewer 内推导核心业务语义
- 不要让 viewer 直接编辑 canonical source

## Testing Strategy

泛用化成败很大程度上取决于测试策略。

建议至少建立 4 层测试：

### 1. Schema Tests

验证 canonical 输入结构是否合法。

### 2. Semantic Tests

验证跨对象、命令、事件、聚合、流程的业务约束。

### 3. Golden Output Tests

对以下输出做 golden snapshot：

- bundled spec JSON
- analysis JSON
- viewer JSON
- generated TypeScript
- diagram outputs

### 4. Multi-Example Regression Tests

至少维护三个 example domain：

- `connection-card-review`
- `order-payment`
- `content-moderation`

如果接入第二、第三个 example 时持续需要修改 core 语义，说明抽象尚未稳定。

## Migration Plan

建议分四个阶段推进。

### Phase 1: Boundary Cleanup

目标：

- 保留当前功能不变
- 先把工具边界从项目边界里剥离出来

动作：

- 删除 core 中的领域特定导出便利层
- 把 `connection/card` 相关 helper 下沉到 example
- 明确 core、projection、example 的目录边界

交付物：

- `packages/ddd-spec-core`
- `examples/connection-card-review`

### Phase 2: Config And CLI

目标：

- 消除路径硬编码
- 让工具可在不同产品目录中执行

动作：

- 引入 `ddd-spec.config.yaml`
- 将当前脚本改造成 CLI
- 统一控制台输出格式

交付物：

- `packages/ddd-spec-cli`
- `ddd-spec validate/build/analyze`

### Phase 3: Projection Split

目标：

- 把 projection 变成清晰的独立模块

动作：

- 拆出 viewer projection
- 拆出 TypeScript projection
- 拆出 diagram projection
- 可选拆出 XState projection

交付物：

- `packages/ddd-spec-projection-*`
- projection 级测试

### Phase 4: Product Hardening

目标：

- 真正验证“泛用化”不是只服务单一示例

动作：

- 引入至少两个新 example domain
- 固化 schema versioning 策略
- 固化 diagnostic contract
- 升级 viewer 为通用加载器

交付物：

- `examples/order-payment`
- `examples/content-moderation`
- 通用 viewer app

## Immediate Refactor Checklist

下面这些是最近一轮最值得做的具体改动。

1. 新建 `packages/ddd-spec-core`，搬运当前 `tools/spec.ts`、schema validation、semantic validation、graph analysis。
2. 新建 `examples/connection-card-review`，承载当前 canonical YAML 和领域特定 helper。
3. 删除 core 对 `card`、`connection`、`connectionCardReviewProcess` 等固定导出假设。
4. 新建 `ddd-spec.config.yaml`，替代 loader 和 artifact writer 中的路径硬编码。
5. 把现有根目录 scripts 改造成通过 CLI 调用，而不是直接耦合 `design-spec/` 路径。
6. 抽出 viewer contract，避免 viewer generator 和 React app 共享隐式结构。
7. 给 analysis JSON 和 viewer JSON 建 golden tests。
8. 补第二个 example domain，用它验证抽象边界。

## Risks

### 1. Over-Generalization

最常见风险是过早追求“万能”，最后把 DDD 语义抽空。

控制方式：

- 坚持 DDD vocabulary
- 用 example 反证抽象
- 不接受纯图论式抽象替代业务抽象

### 2. Hidden Domain Assumptions

当前很多假设来自单一领域样本，可能在第二个产品域里失效。

控制方式：

- 尽快引入第二、第三个 example
- 对 semantic rules 标明“核心规则”和“领域约定”

### 3. Contract Drift

如果没有把 schema、diagnostic、viewer JSON 当公共接口维护，后续会频繁破坏下游。

控制方式：

- 版本化
- golden tests
- migration docs

### 4. Viewer Scope Creep

viewer 很容易一路滑向 editor。

控制方式：

- 明确 viewer 是 consumer，不是 source of truth
- 禁止把编辑语义塞回 canonical

## Success Criteria

以下条件满足时，可以认为泛用化基本成立：

- 新产品可以在独立目录下接入这套工具，无需复制当前仓库结构
- core 不再包含任何 `connection/card` 等示例领域导出
- CLI 可以稳定对任意配置化 spec 执行 build/validate/analyze
- 至少三个 example domain 可以共用同一套 core 和 projections
- viewer 可以加载任意生成的 viewer spec，而不是绑定本仓库固定路径
- schema、diagnostic code、viewer contract 都有明确版本和回归测试

## Recommended Next Step

最合理的下一步不是直接大拆，而是先做一轮“边界清理”：

1. 拆出 `ddd-spec-core`
2. 把当前领域下沉为 `example`
3. 引入 `ddd-spec.config.yaml`
4. 用 CLI 接管现有脚本入口

这四步完成后，项目就会从“当前仓库内的设计规格流水线”升级为“可被多个产品复用的 DDD spec 工具雏形”。
