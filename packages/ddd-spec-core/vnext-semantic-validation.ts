import type {
  VnextAggregateSpec,
  VnextBusinessSpec,
  VnextContextSpec,
  VnextMessageSpec,
  VnextPayloadFieldSpec,
  VnextPolicySpec,
  VnextResourceKind,
  VnextResourceRef,
  VnextScenarioSpec
} from "./spec.js";

export function validateVnextBusinessSpecSemantics(spec: VnextBusinessSpec): void {
  const contextMap = asMap(spec.contexts, "id", "context", "context");
  const actorMap = asMap(spec.actors, "id", "actor", "actor");
  const systemMap = asMap(spec.systems, "id", "system", "system");
  const scenarioMap = asMap(spec.scenarios, "id", "scenario", "scenario");
  const messageMap = asMap(spec.messages, "id", "message", "message");
  const aggregateMap = asMap(spec.aggregates, "id", "aggregate", "aggregate");
  const policyMap = asMap(spec.policies, "id", "policy", "policy");
  const resourceRegistry = new Set<string>();

  registerResources(resourceRegistry, "context", spec.contexts);
  registerResources(resourceRegistry, "actor", spec.actors);
  registerResources(resourceRegistry, "system", spec.systems);
  registerResources(resourceRegistry, "scenario", spec.scenarios);
  registerResources(resourceRegistry, "message", spec.messages);
  registerResources(resourceRegistry, "aggregate", spec.aggregates);
  registerResources(resourceRegistry, "policy", spec.policies);

  for (const context of spec.contexts) {
    assertKind(context.kind, "context", `Context ${context.id}`);
    assertUniqueStrings(context.owners, `context ${context.id} owners`);
    assertUniqueStrings(context.responsibilities, `context ${context.id} responsibilities`);

    const relationships = context.relationships ?? [];
    const relationshipIds = new Set<string>();

    for (const relationship of relationships) {
      if (relationshipIds.has(relationship.id)) {
        throw new Error(`Duplicate relationship ${relationship.id} in context ${context.id}`);
      }

      relationshipIds.add(relationship.id);
      assertKnownResourceRef(
        resourceRegistry,
        relationship.target,
        `Context ${context.id} relationship ${relationship.id} target`
      );
    }
  }

  for (const actor of spec.actors) {
    assertKind(actor.kind, "actor", `Actor ${actor.id}`);
  }

  for (const system of spec.systems) {
    assertKind(system.kind, "system", `System ${system.id}`);
    assertOptionalUniqueStrings(system.capabilities, `system ${system.id} capabilities`);
  }

  for (const scenario of spec.scenarios) {
    validateScenarioSemantics(
      scenario,
      contextMap,
      actorMap,
      systemMap,
      messageMap
    );
  }

  for (const message of spec.messages) {
    assertKind(message.kind, "message", `Message ${message.id}`);
    validateMessageRefs(resourceRegistry, message.producers, `Message ${message.id} producer`);
    validateMessageRefs(resourceRegistry, message.consumers, `Message ${message.id} consumer`);
    assertOptionalUniqueStrings(
      message.payload?.map((field) => field.id),
      `message ${message.id} payload`
    );
    validatePayload(message.payload ?? [], `Message ${message.id}`);
  }

  for (const aggregate of spec.aggregates) {
    validateAggregateSemantics(aggregate, contextMap, messageMap);
  }

  for (const policy of spec.policies) {
    validatePolicySemantics(
      policy,
      contextMap,
      systemMap,
      messageMap,
      resourceRegistry
    );
  }

  void scenarioMap;
  void aggregateMap;
  void policyMap;
}

function validateScenarioSemantics(
  scenario: VnextScenarioSpec,
  contextMap: ReadonlyMap<string, VnextContextSpec>,
  actorMap: ReadonlyMap<string, { id: string }>,
  systemMap: ReadonlyMap<string, { id: string }>,
  messageMap: ReadonlyMap<string, VnextMessageSpec>
): void {
  assertKind(scenario.kind, "scenario", `Scenario ${scenario.id}`);

  if (!contextMap.has(scenario.ownerContext)) {
    throw new Error(
      `Scenario ${scenario.id} ownerContext ${scenario.ownerContext} must reference existing context`
    );
  }

  const stepMap = asMap(scenario.steps, "id", "step", `scenario ${scenario.id} step`);

  for (const step of scenario.steps) {
    if (!contextMap.has(step.context)) {
      throw new Error(
        `Scenario ${scenario.id} step ${step.id} context ${step.context} must reference existing context`
      );
    }

    if (step.actor && !actorMap.has(step.actor)) {
      throw new Error(
        `Scenario ${scenario.id} step ${step.id} actor ${step.actor} must reference existing actor`
      );
    }

    if (step.system && !systemMap.has(step.system)) {
      throw new Error(
        `Scenario ${scenario.id} step ${step.id} system ${step.system} must reference existing system`
      );
    }

    if (step.final && !step.outcome) {
      throw new Error(`Scenario ${scenario.id} final step ${step.id} must define outcome`);
    }

    if (!step.final && step.outcome) {
      throw new Error(`Scenario ${scenario.id} non-final step ${step.id} cannot define outcome`);
    }

    if (step.final && (step.next?.length ?? 0) > 0) {
      throw new Error(`Scenario ${scenario.id} final step ${step.id} cannot define next`);
    }

    assertOptionalUniqueStrings(step.incomingMessages, `scenario ${scenario.id} step ${step.id} incomingMessages`);
    assertOptionalUniqueStrings(step.outgoingMessages, `scenario ${scenario.id} step ${step.id} outgoingMessages`);
    assertOptionalUniqueStrings(step.next, `scenario ${scenario.id} step ${step.id} next`);

    for (const messageId of step.incomingMessages ?? []) {
      if (!messageMap.has(messageId)) {
        throw new Error(
          `Scenario ${scenario.id} step ${step.id} incoming message ${messageId} must reference existing message`
        );
      }
    }

    for (const messageId of step.outgoingMessages ?? []) {
      if (!messageMap.has(messageId)) {
        throw new Error(
          `Scenario ${scenario.id} step ${step.id} outgoing message ${messageId} must reference existing message`
        );
      }
    }

    for (const nextStepId of step.next ?? []) {
      if (!stepMap.has(nextStepId)) {
        throw new Error(
          `Scenario ${scenario.id} step ${step.id} next ${nextStepId} must reference existing step`
        );
      }
    }
  }
}

function validateAggregateSemantics(
  aggregate: VnextAggregateSpec,
  contextMap: ReadonlyMap<string, VnextContextSpec>,
  messageMap: ReadonlyMap<string, VnextMessageSpec>
): void {
  assertKind(aggregate.kind, "aggregate", `Aggregate ${aggregate.id}`);

  if (!contextMap.has(aggregate.context)) {
    throw new Error(
      `Aggregate ${aggregate.id} context ${aggregate.context} must reference existing context`
    );
  }

  assertUniqueStrings(aggregate.states, `aggregate ${aggregate.id} states`);

  if (!aggregate.states.includes(aggregate.initialState)) {
    throw new Error(
      `Aggregate ${aggregate.id} initialState ${aggregate.initialState} must belong to states`
    );
  }

  const transitionIds = new Set<string>();

  for (const transition of aggregate.transitions) {
    if (transitionIds.has(transition.id)) {
      throw new Error(`Duplicate transition ${transition.id} in aggregate ${aggregate.id}`);
    }

    transitionIds.add(transition.id);

    if (!aggregate.states.includes(transition.from)) {
      throw new Error(
        `Aggregate ${aggregate.id} transition ${transition.id} from ${transition.from} must belong to states`
      );
    }

    if (!aggregate.states.includes(transition.to)) {
      throw new Error(
        `Aggregate ${aggregate.id} transition ${transition.id} to ${transition.to} must belong to states`
      );
    }

    const triggeringMessage = messageMap.get(transition.onMessage);

    if (!triggeringMessage) {
      throw new Error(
        `Aggregate ${aggregate.id} transition ${transition.id} onMessage ${transition.onMessage} must reference existing message`
      );
    }

    if (!hasResourceRef(triggeringMessage.consumers, "aggregate", aggregate.id)) {
      throw new Error(
        `Aggregate ${aggregate.id} transition ${transition.id} onMessage ${transition.onMessage} must list aggregate ${aggregate.id} as a consumer`
      );
    }

    assertOptionalUniqueStrings(
      transition.emits,
      `aggregate ${aggregate.id} transition ${transition.id} emits`
    );

    for (const emittedMessageId of transition.emits ?? []) {
      const emittedMessage = messageMap.get(emittedMessageId);

      if (!emittedMessage) {
        throw new Error(
          `Aggregate ${aggregate.id} transition ${transition.id} emits ${emittedMessageId}, but that message does not exist`
        );
      }

      if (!hasResourceRef(emittedMessage.producers, "aggregate", aggregate.id)) {
        throw new Error(
          `Aggregate ${aggregate.id} transition ${transition.id} emitted message ${emittedMessageId} must list aggregate ${aggregate.id} as a producer`
        );
      }
    }
  }
}

function validatePolicySemantics(
  policy: VnextPolicySpec,
  contextMap: ReadonlyMap<string, VnextContextSpec>,
  systemMap: ReadonlyMap<string, { id: string }>,
  messageMap: ReadonlyMap<string, VnextMessageSpec>,
  resourceRegistry: ReadonlySet<string>
): void {
  assertKind(policy.kind, "policy", `Policy ${policy.id}`);

  if (policy.context && !contextMap.has(policy.context)) {
    throw new Error(
      `Policy ${policy.id} context ${policy.context} must reference existing context`
    );
  }

  assertUniqueStrings(policy.triggerMessages, `policy ${policy.id} triggerMessages`);

  for (const messageId of policy.triggerMessages) {
    if (!messageMap.has(messageId)) {
      throw new Error(
        `Policy ${policy.id} trigger message ${messageId} must reference existing message`
      );
    }
  }

  assertOptionalUniqueStrings(policy.emittedMessages, `policy ${policy.id} emittedMessages`);

  for (const messageId of policy.emittedMessages ?? []) {
    const emittedMessage = messageMap.get(messageId);

    if (!emittedMessage) {
      throw new Error(
        `Policy ${policy.id} emitted message ${messageId} must reference existing message`
      );
    }

    if (!hasResourceRef(emittedMessage.producers, "policy", policy.id)) {
      throw new Error(
        `Policy ${policy.id} emitted message ${messageId} must list policy ${policy.id} as a producer`
      );
    }
  }

  assertOptionalUniqueStrings(policy.targetSystems, `policy ${policy.id} targetSystems`);

  for (const systemId of policy.targetSystems ?? []) {
    if (!systemMap.has(systemId)) {
      throw new Error(
        `Policy ${policy.id} target system ${systemId} must reference existing system`
      );
    }
  }

  for (const coordinate of policy.coordinates ?? []) {
    assertKnownResourceRef(
      resourceRegistry,
      coordinate,
      `Policy ${policy.id} coordinate`
    );
  }
}

function validateMessageRefs(
  resourceRegistry: ReadonlySet<string>,
  refs: readonly VnextResourceRef[],
  label: string
): void {
  const seenRefs = new Set<string>();

  for (const ref of refs) {
    const key = toResourceKey(ref.kind, ref.id);

    if (seenRefs.has(key)) {
      throw new Error(`Duplicate ${label} ${ref.kind} ${ref.id}`);
    }

    seenRefs.add(key);
    assertKnownResourceRef(resourceRegistry, ref, label);
  }
}

function validatePayload(
  payload: readonly VnextPayloadFieldSpec[],
  label: string
): void {
  const fieldIds = new Set<string>();

  for (const field of payload) {
    if (fieldIds.has(field.id)) {
      throw new Error(`Duplicate payload field ${field.id} in ${label}`);
    }

    fieldIds.add(field.id);
  }
}

function registerResources<Value extends { id: string }>(
  registry: Set<string>,
  kind: VnextResourceKind,
  values: readonly Value[]
): void {
  for (const value of values) {
    registry.add(toResourceKey(kind, value.id));
  }
}

function asMap<Value extends Record<Key, string>, Key extends keyof Value>(
  values: readonly Value[],
  key: Key,
  label: string,
  scope: string
): Map<Value[Key], Value> {
  const entries = new Map<Value[Key], Value>();

  for (const value of values) {
    const entryKey = value[key];

    if (entries.has(entryKey)) {
      throw new Error(`Duplicate ${label} ${String(entryKey)} in ${scope}`);
    }

    entries.set(entryKey, value);
  }

  return entries;
}

function hasResourceRef(
  refs: readonly VnextResourceRef[],
  kind: VnextResourceKind,
  id: string
): boolean {
  return refs.some((ref) => ref.kind === kind && ref.id === id);
}

function assertKnownResourceRef(
  resourceRegistry: ReadonlySet<string>,
  ref: VnextResourceRef,
  label: string
): void {
  if (!resourceRegistry.has(toResourceKey(ref.kind, ref.id))) {
    throw new Error(`${label} ${ref.kind} ${ref.id} must reference existing ${ref.kind}`);
  }
}

function assertKind(actualKind: string, expectedKind: string, label: string): void {
  if (actualKind !== expectedKind) {
    throw new Error(`${label} kind ${actualKind} must be ${expectedKind}`);
  }
}

function assertUniqueStrings(values: readonly string[], label: string): void {
  const seenValues = new Set<string>();

  for (const value of values) {
    if (seenValues.has(value)) {
      throw new Error(`Duplicate value ${value} in ${label}`);
    }

    seenValues.add(value);
  }
}

function assertOptionalUniqueStrings(
  values: readonly string[] | undefined,
  label: string
): void {
  if (!values) {
    return;
  }

  assertUniqueStrings(values, label);
}

function toResourceKey(kind: VnextResourceKind, id: string): string {
  return `${kind}:${id}`;
}
