# `shared kernel` directory and ownership plan

本文件定义第一版 `shared kernel` 的建议目录落点、ownership 和 review 边界，用于承接 [`ddd-spec shared kernel candidate baseline`](./ddd-spec-shared-kernel-candidate-baseline.md) 的后续抽取工作。

本文档只确定 landing zone，不直接触发大规模迁移，也不改变当前 [`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/) 作为唯一 public package boundary 的事实。

## Decision summary

### `packages/` code layer

| Location | Ownership | Scope | Boundary rule |
| --- | --- | --- | --- |
| [`packages/spec-toolchain-shared-kernel/`](../../packages/spec-toolchain-shared-kernel/) | `shared kernel` maintainers | 跨 `spec family` 的薄 `contract`、types、artifact envelope、extension points | 只承载可被多个 family 复用的稳定边界；不得引入 `domain-model/`、DDD resource kinds、DDD rule names、DDD viewer navigation |
| [`packages/ddd-spec-core/`](../../packages/ddd-spec-core/) | `ddd-spec` maintainers | `ddd-spec` canonical input、schema files、semantic rules、DDD-specific `analysis` IR | 即使文件名较泛化，只要语义绑定 DDD 对象，就继续留在 `ddd-spec` 层，不提前上提 |
| [`packages/ddd-spec-viewer-contract/`](../../packages/ddd-spec-viewer-contract/) | `ddd-spec` maintainers，后续与 `shared kernel` maintainers 协作 review | 当前 `ddd-spec` viewer `contract` 与 detail primitives | 在 shared 抽取前继续作为 `ddd-spec` viewer `contract` 边界；后续只允许把 truly shared primitives 上提到 `shared kernel`，DDD view kinds 保留原处 |
| [`packages/ddd-spec-projection-viewer/`](../../packages/ddd-spec-projection-viewer/) | `ddd-spec` maintainers | 从 DDD `analysis` 到 viewer artifact 的 projection logic | 纯 family-specific；不应成为其他 family 的默认 viewer pipeline |
| [`packages/ddd-spec-projection-typescript/`](../../packages/ddd-spec-projection-typescript/) | `ddd-spec` maintainers | DDD-specific `generation` target | 继续作为 `ddd-spec` 生成目标，不放 shared naming 或 cross-family promise |
| [`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/) | public package owner | consumer-facing CLI、config、artifact layout、maturity/compatibility promise | 所有对外命令面、默认 workflow、发布承诺继续留在这里；shared 抽取不得把 public contract 提到 root 或新内部包 |

### `docs/strategy/` doc layer

| Location | Ownership | Scope | Boundary rule |
| --- | --- | --- | --- |
| [`docs/strategy/spec-family-map.md`](./spec-family-map.md) | strategy owner | 定义 `shared kernel` runtime surfaces 与 family map | 继续作为分类主轴；不得在 story 文档中另起 taxonomy |
| [`docs/strategy/ddd-spec-shared-kernel-candidate-baseline.md`](./ddd-spec-shared-kernel-candidate-baseline.md) | strategy owner + `ddd-spec` maintainer | 记录当前 `ddd-spec -> shared kernel` 能力拆分基线 | 负责回答“哪些可抽、哪些保留、哪些待验证” |
| [`docs/strategy/shared-kernel-directory-ownership.md`](./shared-kernel-directory-ownership.md) | strategy owner + workspace maintainer | 记录 landing zone、ownership、review seams | 负责回答“东西该落哪、谁负责、为什么不把 `ddd-spec` 当品牌本体” |
| [`docs/strategy/family-admission-criteria.md`](./family-admission-criteria.md) | strategy owner | 评审新 `spec family` 是否可接入 `shared kernel` | 不承载 package-level 迁移计划，只保留准入判据 |

### root orchestration layer

| Location | Ownership | Scope | Boundary rule |
| --- | --- | --- | --- |
| [`package.json`](../../package.json) | workspace maintainer | workspace membership 与 root `repo:*` orchestration | 继续只定义 maintainer workspace 流程，不承载 family-specific compatibility 文案 |
| [`.ralph-tui/progress.md`](../../.ralph-tui/progress.md) | loop operator | 记录每轮 bead learnings 与 reusable patterns | 只保留执行 learnings，不复制完整战略定义 |
| [`.beads/`](../../.beads/) | loop operator | `ralph-loop` state | 不进入产品 contract，不追踪 generated runtime outputs |
| root `repo:*` scripts | workspace maintainer | 针对 repo-local example 的回归 orchestration | 继续默认驱动 `ddd-spec` 现有 flow；在第二个 family 真实落地前，不新增“多 family 通用但无消费者”的 orchestration façade |

## Directory decision for `packages/spec-toolchain-shared-kernel/`

第一版目录方案如下：

| Path | Ownership | Responsibility |
| --- | --- | --- |
| [`packages/spec-toolchain-shared-kernel/package.json`](../../packages/spec-toolchain-shared-kernel/package.json) | workspace maintainer | 声明这是 private maintainer package，不形成新 public package boundary |
| [`packages/spec-toolchain-shared-kernel/index.ts`](../../packages/spec-toolchain-shared-kernel/index.ts) | `shared kernel` maintainers | 作为唯一入口；后续只 re-export 稳定 shared `contract` / types |
| `packages/spec-toolchain-shared-kernel/diagnostics.ts` | `shared kernel` maintainers | US-003 起承接通用 diagnostics `contract` skeleton |
| `packages/spec-toolchain-shared-kernel/artifact-manifest.ts` | `shared kernel` maintainers | US-003 起承接 artifact manifest skeleton |
| `packages/spec-toolchain-shared-kernel/extension-points.ts` | `shared kernel` maintainers | US-003 起承接极薄 extension-point interfaces |

当前 story 只要求 package root 与入口文件落地；其余文件路径在此冻结为后续 story 的 landing zone，不要求现在承诺完整实现。

## Why this structure does not recast `ddd-spec` as the brand

- `shared kernel` 的 landing zone 使用新的 internal package，而不是继续让 `ddd-spec-*` 目录充当默认宿主。
- strategy-side 定义继续落在 [`docs/strategy/`](./README.md)，品牌与产品线归属仍由 `Spec Toolchain` / `spec-alchemy` 术语控制，不让 `ddd-spec` 文档承担品牌总述。
- public package promise 继续收敛在 [`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/)，意味着当前对外承诺仍是“一个 family 的公开边界”，不是“品牌 = `ddd-spec`”。
- orchestration 资产继续服务 maintainer workflow，而不是把 root command surface 伪装成“所有 future families 已经存在”的产品表面。

## Review focus for future extraction stories

每次从 `ddd-spec` 往 `shared kernel` 抽取时，都应先回答：

1. 该改动是否只上提跨 family 稳定边界，而非 DDD 对象命名、拓扑或 viewer 语义？
2. consumer-facing promise 是否仍留在 [`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/)？
3. strategy-side 分类是否仍对齐 [`spec-family-map.md`](./spec-family-map.md) 的 runtime surfaces？
4. root orchestration 是否只是维护者回归入口，而不是提前抽象成无消费者的通用平台？

## Review notes

- 战略一致性：本方案把 `shared kernel` 放在独立 internal package，并保持 `ddd-spec` 只是当前 `wedge product`，符合 [`brand-constitution.md`](./brand-constitution.md) 与 [`spec-family-map.md`](./spec-family-map.md)。
- package boundary 一致性：consumer-facing CLI、compatibility 与 maturity 承诺继续留在 [`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/)，没有被新 internal package 稀释。
- Markdown 与术语一致性：仅使用仓库内相对 Markdown 路径，并遵循 [`terminology.md`](./terminology.md) 中的 `spec family`、`shared kernel`、`contract`、`artifact`、ownership 等规定写法。
