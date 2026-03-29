# YAML Types

## Index

`domain-model/index.yaml` is the workspace root. It should declare:

- `version`
- `id`
- `title`
- `summary`
- `model` paths for `contexts`, `actors`, `systems`, `scenarios`, `messages`, `aggregates`, and `policies`

If `index.yaml` is malformed, start with `ddd-spec validate schema`.

## File Types

### `*.context.yaml`

Use for bounded-context ownership and relationships.

- Required shape: `kind`, `id`, `title`, `summary`, `owners`, `responsibilities`
- Optional relationship fields: `relationships[].id`, `kind`, `target`, `direction`, `integration`, `description`
- Semantic rule: every context must declare at least one owner
- Common error: define a scenario or aggregate with an `ownerContext` or `context` that does not exist

### `*.actor.yaml`

Use for a person, role, or team that initiates behavior.

- Required shape: `kind`, `id`, `title`, `summary`
- Optional: `actorType` with `person`, `role`, or `team`
- Common error: use an actor id in a scenario step or message producer without creating the actor resource

### `*.system.yaml`

Use for an external or internal system that participates in a flow.

- Required shape: `kind`, `id`, `title`, `summary`
- Optional: `boundary`, `capabilities`
- Common error: reference a system in a context relationship, scenario step, or policy target without defining it

### `*.scenario.yaml`

Use for the business story and step topology.

- Required shape: `kind`, `id`, `title`, `summary`, `goal`, `ownerContext`, `steps`
- Each step requires `id`, `title`, `context`
- Optional per step: `actor`, `system`, `incomingMessages`, `outgoingMessages`, `next`, `final`, `outcome`
- Rule: a `final: true` step must define `outcome`
- Semantic rules:
  - `ownerContext` must reference an existing context
  - `next` must point to real step ids
  - `incomingMessages` and `outgoingMessages` must match real message linkage

### `*.message.yaml`

Use for commands, events, and queries shared across scenarios, contexts, aggregates, and systems.

- Required shape: `kind`, `id`, `title`, `summary`, `messageKind`, `producers`, `consumers`
- Optional: `channel`, `payload`
- `messageKind` must be `command`, `event`, or `query`
- `channel` must be `sync` or `async`
- Common error: make producers or consumers point to resources that do not exist
- Common error: define a step incoming or outgoing message that is not compatible with the message producers or consumers

### `*.aggregate.yaml`

Use only when lifecycle state matters.

- Required shape: `kind`, `id`, `title`, `summary`, `context`, `states`, `initialState`, `transitions`
- Optional: `lifecycleComplexity`
- Every transition requires `id`, `from`, `to`, `onMessage`
- Optional transition field: `emits`
- Semantic rules:
  - `context` must reference an existing context
  - `initialState`, `from`, and `to` must belong to `states`
  - transition trigger messages must exist and align with aggregate consumers
  - all declared states should be reachable from `initialState`

### `*.policy.yaml`

Use for an explicit coordination rule that reacts to messages and emits follow-up behavior.

- Required shape: `kind`, `id`, `title`, `summary`, `triggerMessages`
- Optional: `context`, `emittedMessages`, `targetSystems`, `coordinates`
- Semantic rule: policy triggers, emitted messages, targets, and coordinates must resolve to real resources
- Practical rule: only add a policy when there is a clear triggered outcome beyond the primary scenario path

## Authoring Order

Prefer this build-up:

1. Define `context`, `actor`, and `system`
2. Write one `scenario`
3. Add `message` resources to support the scenario links
4. Add `aggregate` only if lifecycle complexity is real
5. Add `policy` only if a triggered follow-up rule is real

## Verification

- After shape edits: `ddd-spec validate schema`
- After cross-file edits: `ddd-spec validate semantics`
- After a larger milestone: `ddd-spec build` or `ddd-spec dev`
