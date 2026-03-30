# `shared kernel` contract skeleton

本文件定义 US-003 的最小 shared `contract` skeleton，用于把 [`packages/spec-toolchain-shared-kernel/`](../../packages/spec-toolchain-shared-kernel/) 从纯占位 package 推进到可审查的 `shared kernel candidate` 边界。

本文档只描述第一版 skeleton 的边界，不承诺完整迁移计划，也不改变 [`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/) 作为唯一 public package boundary 的事实。

## Included in the first skeleton

| Surface | Current landing | Why it is included now | Current limit |
| --- | --- | --- | --- |
| reference `contract` | [`packages/spec-toolchain-shared-kernel/reference.ts`](../../packages/spec-toolchain-shared-kernel/reference.ts) | 给 cross-family linking 提供独立 shared seam，并让 diagnostics 等相邻 shared surface 复用同一条 reference shape | 只定义 `target` 与可选 locator hint，不承诺解析器、版本协商、path grammar 或 family-specific canonical object model |
| diagnostics `contract` | [`packages/spec-toolchain-shared-kernel/diagnostics.ts`](../../packages/spec-toolchain-shared-kernel/diagnostics.ts) | 已经存在跨 family 可复用的最小 shape：severity、code、message、location、related resource | 只定义通用 shape，不上提任何 DDD rule code、resource kind 或 formatting policy |
| `artifact manifest` skeleton | [`packages/spec-toolchain-shared-kernel/artifact-manifest.ts`](../../packages/spec-toolchain-shared-kernel/artifact-manifest.ts) | 为后续 `analysis` / `generation` / `viewer` artifact 提供最薄的可枚举 envelope | 只保留 `id`、`family`、`kind`、`role`、locator、`sourceIds`，不承诺版本协商或 execution surface |
| extension points | [`packages/spec-toolchain-shared-kernel/extension-points.ts`](../../packages/spec-toolchain-shared-kernel/extension-points.ts) | 给后续 family 预演保留统一挂点 | 明确只允许 `reserved` / `candidate` 状态，不表示已经有稳定 runtime behavior |

## Explicit non-goals for this story

- 不把 `ddd-spec-core` 的 DDD-specific `analysis` IR、semantic rule names 或 canonical input 上提到 `shared kernel`
- 不在 shared package 内新增 viewer abstraction、execution abstraction 或 cross-family utilities
- 不把 consumer-facing CLI、compatibility 或 maturity promise 从 [`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/) 挪走

## Placeholder policy

本轮 skeleton 中，以下部分都视为占位，不承诺稳定实现：

- `SharedKernelFamilyContract`
- `SharedKernelArtifactContract`
- `SharedArtifactManifestEntry.kind` 的枚举空间
- `SharedDiagnostic.code` 的词表
- `SharedReference.path` 的 locator grammar

这些表面当前只用于建立 review seam，后续必须经过 family preflight 或 extraction story 才能收敛为更稳定的 `contract`。

## Review notes

- 战略一致性：本 skeleton 只上提 [`spec-family-map.md`](./spec-family-map.md) 已定义的 cross-family reference、`diagnostics` 与 `artifact` envelope，不把 DDD 对象语义伪装成 cross-family surface。
- package boundary 一致性：shared types 落在新的 private maintainer package；所有 public promise 仍留在 [`packages/ddd-spec-cli/`](../../packages/ddd-spec-cli/)。
- Markdown 与术语一致性：只使用仓库内相对 Markdown 路径，并遵循 [`terminology.md`](./terminology.md) 中的 `shared kernel`、`spec family`、`contract`、`artifact` 等规定写法。
