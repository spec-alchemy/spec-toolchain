# Cross-Context Example

`examples/cross-context/` is the repo's full cross-context example for the default maintainer demo path.

It is designed to show all four primary views in one example:

- `Context Map`: `orders` and `payments` contexts plus the external `ledger-gateway` system
- `Scenario Story`: one order-settlement scenario with ordered steps
- `Message Flow / Trace`: command, event, and query hops across contexts
- `Lifecycle`: order and payment aggregates with explicit lifecycle detail

## Files To Read

- [`./domain-model/index.yaml`](./domain-model/index.yaml)
- [`./domain-model/contexts/orders.context.yaml`](./domain-model/contexts/orders.context.yaml)
- [`./domain-model/contexts/payments.context.yaml`](./domain-model/contexts/payments.context.yaml)
- [`./domain-model/scenarios/order-settlement-flow.scenario.yaml`](./domain-model/scenarios/order-settlement-flow.scenario.yaml)
- [`./domain-model/messages/`](./domain-model/messages/)
- [`./domain-model/aggregates/`](./domain-model/aggregates/)

## Repo-Local Demo

Use the root maintainer scripts from the repo root:

```sh
npm run repo:validate
npm run repo:build
npm run repo:viewer -- --port 4173
```

Those commands route through [`../../apps/ddd-spec-viewer/ddd-spec.config.yaml`](../../apps/ddd-spec-viewer/ddd-spec.config.yaml) and write the repo-local maintainer outputs into [`../../.ddd-spec/artifacts/`](../../.ddd-spec/artifacts/). After the viewer opens, inspect the primary views in this order:

1. `Context Map`
2. `Scenario Story`
3. `Message Flow / Trace`
4. `Lifecycle`

If you want this example to emit example-local artifacts under [`./artifacts/`](./artifacts/), run the equivalent explicit-config commands instead:

```sh
npm run build --workspace=packages/ddd-spec-cli
npm run repo:cli --workspace=packages/ddd-spec-cli -- validate --config examples/cross-context/ddd-spec.config.yaml
npm run repo:cli --workspace=packages/ddd-spec-cli -- build --config examples/cross-context/ddd-spec.config.yaml
npm run repo:cli --workspace=packages/ddd-spec-cli -- viewer --config examples/cross-context/ddd-spec.config.yaml -- --port 4173
```
