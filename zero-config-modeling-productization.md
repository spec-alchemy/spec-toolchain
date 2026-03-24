# Zero-Config Modeling Productization

这份文档定义当前项目面向最终用户的目标产品形态。

它不是“如何从旧方案过渡”的说明，也不是“兼容多种入口”的演进记录。
它只定义一个产品结论：

- 这是一个 `zero-config` 的 DDD 建模工具
- 用户通过固定目录约定和固定命令使用它
- v1 不向用户暴露配置文件入口

相关背景见：

- [DDD Spec Generalization Blueprint](./ddd-spec-generalization-blueprint.md)

## Purpose

这个产品的目标，是让用户以最小学习成本开始 DDD 业务建模，并完成从 canonical spec 到可校验产物、分析结果、可视化浏览的完整闭环。

它提供的是：

- DDD canonical modeling
- schema validation
- semantic validation
- standard output artifacts
- viewer-based inspection

它不是：

- 通用图编辑器
- 通用 DSL 平台
- 可视化反向建模工具
- 多项目规格管理平台

## Product Definition

v1 产品定义如下：

- 单仓库只建模一个主业务 spec
- 用户只需要维护 canonical YAML
- 用户通过固定目录结构放置文件
- 用户通过固定命令完成初始化、校验、构建、查看
- 工具将产物写到固定隐藏目录

用户不需要：

- 编写 `ddd-spec.config.yaml`
- 指定 schema 路径
- 指定输出路径
- 理解 projection 配置
- 手动给 viewer 传入产物路径

## User Workflow

v1 的标准使用路径只有一条：

1. `ddd-spec init`
2. 在 `ddd-spec/canonical/` 下编辑 YAML
3. `ddd-spec validate`
4. `ddd-spec build`
5. `ddd-spec viewer`

这条路径之外的使用方式，不属于 v1 主产品面。

## Repository Convention

v1 采用固定仓库约定：

```text
repo/
  ddd-spec/
    canonical/
      index.yaml
      objects/
      commands/
      events/
      aggregates/
      processes/
      vocabulary/
  .ddd-spec/
    artifacts/
      business-spec.json
      business-spec.analysis.json
      viewer-spec.json
    generated/
      business-spec.generated.ts
```

约定说明：

- `ddd-spec/canonical/index.yaml` 是唯一入口
- `objects/commands/events/aggregates/processes/vocabulary/` 是固定语义目录
- `.ddd-spec/` 是工具产物目录，不属于第一真相
- `.ddd-spec/` 默认应加入 `.gitignore`

v1 不支持用户自定义这些路径。

## Command Surface

v1 只提供四个面向用户的命令。

### `ddd-spec init`

职责：

- 创建 `ddd-spec/canonical/` 目录骨架
- 创建最小 `index.yaml`
- 创建空的语义子目录
- 更新或创建 `.gitignore`，加入 `.ddd-spec/`

边界：

- 不生成复杂示例域
- 不生成行业模板
- 不提供多套初始化模式

### `ddd-spec validate`

职责：

- 读取 `ddd-spec/canonical/index.yaml`
- 运行 schema validation
- 运行 semantic validation
- 输出稳定诊断信息

边界：

- 不写任何产物
- 不启动 viewer

### `ddd-spec build`

职责：

- 先执行 `validate`
- 生成标准 bundle / analysis / viewer / TypeScript 产物
- 覆盖更新 `.ddd-spec/` 下的旧产物

边界：

- 不要求用户理解 projection 开关
- 不支持自定义输出路径

### `ddd-spec viewer`

职责：

- 确保 viewer 产物是最新的
- 启动 viewer
- 默认加载 `./.ddd-spec/artifacts/viewer-spec.json`

边界：

- 不要求用户自己拼 `?spec=...`
- 不扩展 viewer 功能面
- 不承担 canonical 编辑职责

## Output Artifacts

v1 固定生成以下产物：

- `./.ddd-spec/artifacts/business-spec.json`
- `./.ddd-spec/artifacts/business-spec.analysis.json`
- `./.ddd-spec/artifacts/viewer-spec.json`
- `./.ddd-spec/generated/business-spec.generated.ts`

含义如下：

- `business-spec.json`：canonical 的标准 bundle 输出
- `business-spec.analysis.json`：基于 graph IR 的分析与诊断结果
- `viewer-spec.json`：viewer 消费的标准输入
- `business-spec.generated.ts`：TypeScript 消费的标准投影

这些产物都不是第一真相。

## Diagnostics

v1 的错误提示必须服务用户修复，而不是服务工具维护者调试。

最小要求：

- 缺少 `ddd-spec/canonical/index.yaml` 时，提示运行 `ddd-spec init`
- YAML 结构错误时，给出 path 和 message
- semantic 错误时，给出 code、path、message
- viewer 启动失败时，明确是构建失败还是 viewer 进程失败

v1 不要求：

- 交互式诊断
- 富格式终端 UI
- 环境巡检

## Non-Goals

为了避免需求外溢，以下能力不属于 v1：

- 用户可见配置文件
- 多 spec 管理
- 自定义输出路径
- 远程 URL 加载
- 本地上传 JSON
- deep link
- viewer 过滤
- viewer 高亮关系链路
- `ddd-spec doctor`
- `ddd-spec new object|command|event|aggregate|process`
- 可视化编辑 canonical
- 插件系统
- 自动 migration

## Acceptance Criteria

以下条件满足时，可认为 zero-config 产品形态成立：

1. 在空仓库中执行 `ddd-spec init` 后，可以立刻开始编辑 canonical。
2. 用户不写任何配置文件，也能成功执行 `validate`、`build`、`viewer`。
3. 默认目录结构和默认产物路径稳定且文档化。
4. viewer 默认消费固定产物路径，不要求用户手动传路径。
5. 文档与诊断都围绕这条单路径主流程组织，而不是围绕配置能力组织。

## Delivery Boundary

v1 交付边界严格限制为：

1. 固定目录约定
2. 固定产物约定
3. `init`
4. `validate`
5. `build`
6. `viewer`

如果以上六项完成，就已经具备“用户可以直接开始建模并查看结果”的最小产品能力。

在此之前，不应扩展到：

- viewer 新交互
- 多 spec
- 编辑器能力
- 模板市场
- IDE 集成

这些都属于后续事项，不属于本文件定义的 v1 必要范围。
