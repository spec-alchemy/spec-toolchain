# Zero-Config Modeling Migration Plan

这份文档描述如何把当前仓库改造成 [Zero-Config Modeling Productization](./zero-config-modeling-productization.md) 定义的目标产品形态。

它回答的是“我们怎么改”，不是“用户怎么用”。

## Target

迁移完成后的目标状态是：

- 用户使用固定目录约定建模
- 用户通过 `init / validate / build / viewer` 完成完整闭环
- 用户不需要看到配置文件入口
- 现有 compiler、projection、viewer 能力继续被复用

## Constraints

迁移必须遵守以下约束：

- 不改变 canonical DDD 语义边界
- 不引入第二套 compiler 实现
- 不扩展 viewer 产品功能面
- 不把多 spec、远程 URL、上传、过滤、高亮链路等功能混入本轮
- 不为了 zero-config 重写已稳定的 core / projection contract

## Current Baseline

当前仓库已经具备的基础能力：

- `ddd-spec-core`
- `ddd-spec-cli`
- viewer contract
- viewer / TypeScript projections
- 回归测试
- 最小通用 viewer

当前还缺失的，是面向最终用户的 zero-config 产品入口：

- 固定零配置解析
- `init`
- `viewer` 命令
- 以固定约定为中心的文档与测试

## Migration Principle

迁移过程中坚持三条原则：

### 1. Product Contract First

先固定产品约定，再实现命令，不让实现细节反过来定义产品边界。

### 2. Narrow Surface

只做主路径所需能力，不顺手扩功能。

### 3. Reuse, Do Not Fork

尽量复用现有 CLI、compiler、viewer，而不是复制新入口另做一套。

## Phase 1: Freeze Product Contract

目标：

- 把用户可见产品面固定下来

动作：

- 确认固定目录约定为 `ddd-spec/canonical/`
- 确认固定产物目录为 `.ddd-spec/`
- 确认 v1 命令面只有 `init / validate / build / viewer`
- 确认 v1 不向用户暴露配置文件能力

交付物：

- [zero-config-modeling-productization.md](./zero-config-modeling-productization.md)

完成标准：

- 产品文档不再出现 dual-mode 或 config-first 叙事
- 非目标能力已被明确列为 non-goals

## Phase 2: Zero-Config CLI Resolution

目标：

- 让 CLI 可以在没有配置文件的情况下工作

动作：

- 在 CLI 增加固定零配置解析逻辑
- 固定 canonical 入口为 `ddd-spec/canonical/index.yaml`
- 固定默认输出到 `.ddd-spec/`
- 将 zero-config 所需 schema 作为 package 内置资源加载

实现要求：

- `validate` 无需 `--config`
- `build` 无需 `--config`
- 失败时给出面向用户的错误信息

完成标准：

- 在空白测试仓库中，只要目录符合约定，就能执行 `validate`
- 在无配置情况下，`build` 能生成四类标准产物

## Phase 3: Init Command

目标：

- 让用户可以从空仓库直接开始

动作：

- 实现 `ddd-spec init`
- 生成 `ddd-spec/canonical/` 最小骨架
- 生成最小 `index.yaml`
- 更新 `.gitignore`，加入 `.ddd-spec/`

实现要求：

- 重复执行时拒绝覆盖已有 canonical 入口
- 模板只生成最小骨架，不生成示例域

完成标准：

- fresh repo 执行 `init` 后，用户可以立即编辑 canonical
- 初始化结果能通过基础 schema 校验

## Phase 4: Viewer Command

目标：

- 让用户不需要理解 viewer 产物路径也能浏览规格

动作：

- 实现 `ddd-spec viewer`
- 命令内部确保 viewer 产物已更新
- 启动现有 viewer app
- 把默认 spec source 固定指向 `./.ddd-spec/artifacts/viewer-spec.json`

实现要求：

- 复用现有 viewer app
- 不增加 viewer 新功能
- 不要求用户手动传 `?spec=...`

完成标准：

- 用户在标准仓库里执行 `ddd-spec viewer` 可直接看到当前 spec
- viewer 默认加载的是 zero-config 标准产物

## Phase 5: Test Hardening

目标：

- 给 zero-config 主路径补齐回归保护

动作：

- 增加 `init` 集成测试
- 增加 zero-config `validate` 集成测试
- 增加 zero-config `build` 集成测试
- 增加 `viewer` 命令的最小集成测试

测试边界：

- 重点验证命令行为和产物路径
- 不在本阶段引入浏览器端到端 UI 自动化

完成标准：

- zero-config 主路径具备独立测试覆盖
- 已有 core / projection / example regression tests 不被破坏

## Phase 6: Documentation Cutover

目标：

- 让用户首先看到 zero-config 产品入口，而不是配置能力

动作：

- 增加最终用户 quick start
- 重写命令文档为 zero-config 顺序
- 明确固定目录和固定产物
- 把配置相关说明降出主文档

完成标准：

- 新用户只看 quick start 就能走完主路径
- 主文档不再把配置文件作为起点介绍

## Implementation Order

建议按以下顺序实施：

1. 固定产品文档
2. 实现 zero-config `validate/build`
3. 实现 `init`
4. 实现 `viewer`
5. 补测试
6. 补用户文档

这个顺序的原因是：

- `validate/build` 是主链路核心
- `init` 依赖已固定的目录约定
- `viewer` 依赖已固定的默认产物路径
- 测试和文档应围绕最终命令面收口

## Explicitly Deferred

本轮迁移明确不做：

- 多 spec 支持
- 自定义目录
- 自定义输出路径
- `ddd-spec doctor`
- `ddd-spec new *`
- 远程 URL / 本地上传
- deep link
- 过滤
- 高亮关系链路
- 可视化编辑 canonical

## Final Acceptance

满足以下条件时，可以认为迁移完成：

1. 一个空仓库只需执行 `ddd-spec init` 即可进入建模状态。
2. `ddd-spec validate`、`ddd-spec build`、`ddd-spec viewer` 在无配置文件条件下可直接工作。
3. 产物始终写入 `.ddd-spec/` 固定位置。
4. 用户文档只围绕 zero-config 主路径组织。
5. 本轮没有把需求扩展到多 spec、编辑器化或 viewer 增强功能。
