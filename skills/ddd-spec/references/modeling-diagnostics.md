# Modeling Diagnostics

## First Classification

Choose the command by failure type:

- Schema failure: `ddd-spec validate schema`
- Semantic failure: `ddd-spec validate semantics`
- Analysis failure: `ddd-spec validate analysis`
- Workspace or artifact readiness failure: `ddd-spec doctor`

If the user only says "`validate` failed", ask for the exact diagnostic or infer the layer from the message.

## Common Semantic Failures

### Missing context ownership

Signal:

- diagnostic code like `missing-context-owner`
- message that a context must declare at least one owner

Fix:

- edit the relevant `*.context.yaml`
- add at least one `owners` entry
- rerun `ddd-spec validate semantics`

### Unknown resource reference

Signal:

- diagnostic code like `unknown-resource-reference`
- message, step, relationship, policy, or aggregate transition points to a missing id

Fix:

- decide whether the reference is misspelled or the resource file is missing
- correct the id or add the missing YAML resource
- rerun `ddd-spec validate semantics`

### Broken scenario message linkage

Signal:

- diagnostic code like `scenario-message-link-broken`
- a step declares an incoming or outgoing message that is not linked to the step or owner context correctly

Fix:

- inspect the scenario step and the referenced `*.message.yaml`
- align `incomingMessages` or `outgoingMessages` with valid producers and consumers
- rerun `ddd-spec validate semantics`

### Broken scenario topology

Signal:

- diagnostic code like `scenario-multiple-entry-steps`
- `next` points to a missing step

Fix:

- repair `next` edges and final-step placement in the `*.scenario.yaml`
- ensure the story has the intended entry and final steps
- rerun `ddd-spec validate semantics`

### Aggregate trigger or state mismatch

Signal:

- diagnostic codes like `aggregate-transition-trigger-consumer-mismatch`, `aggregate-state-unreachable`, or `aggregate-transition-state-invalid`

Fix:

- inspect the relevant `*.aggregate.yaml`
- verify `states`, `initialState`, `from`, and `to`
- verify `onMessage` exists and that the referenced message consumes the aggregate correctly
- rerun `ddd-spec validate semantics`

### Policy missing explicit outcome

Signal:

- policy diagnostics after removing emitted or coordinated behavior

Fix:

- inspect the `*.policy.yaml`
- restore the intended emitted messages, targets, or coordination links
- rerun `ddd-spec validate semantics`

## Viewer and Artifact Failures

### Missing viewer artifact

Signal:

- `serve` complains that viewer output is missing

Fix:

- run `ddd-spec build` or `ddd-spec generate viewer`
- use `ddd-spec serve` only after the artifact exists

### Wrong command family

Signal:

- user runs removed commands such as `viewer`, `bundle`, or `analyze`

Fix:

- translate to the current command family
- keep the user on `serve` and `generate <target>`

## Repair Style

When responding, always say:

1. what failed
2. where to edit first
3. what to rerun
