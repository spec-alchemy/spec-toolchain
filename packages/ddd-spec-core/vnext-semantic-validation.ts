import type {
  VnextActorSpec,
  VnextAggregateSpec,
  VnextBusinessSpec,
  VnextContextSpec,
  VnextMessageSpec,
  VnextPayloadFieldSpec,
  VnextPolicySpec,
  VnextResourceKind,
  VnextResourceRef,
  VnextScenarioSpec,
  VnextScenarioStepSpec,
  VnextSystemSpec
} from "./spec.js";

export const VNEXT_SEMANTIC_VALIDATION_VERSION = 1 as const;

export const VNEXT_SEMANTIC_DIAGNOSTIC_CODES = [
  "duplicate-resource-id",
  "duplicate-local-id",
  "duplicate-array-value",
  "missing-required-link",
  "missing-context-owner",
  "unknown-resource-reference",
  "scenario-owner-context-missing",
  "scenario-owner-context-unused",
  "scenario-entry-step-missing",
  "scenario-multiple-entry-steps",
  "scenario-final-step-missing",
  "scenario-step-next-missing",
  "scenario-step-unreachable",
  "scenario-final-step-unreachable",
  "scenario-message-link-broken",
  "ambiguous-message-ownership",
  "aggregate-initial-state-invalid",
  "aggregate-transition-state-invalid",
  "aggregate-transition-trigger-missing",
  "aggregate-transition-trigger-consumer-mismatch",
  "aggregate-transition-emitted-message-missing",
  "aggregate-transition-emitted-producer-mismatch",
  "policy-trigger-message-missing",
  "policy-trigger-consumer-mismatch",
  "policy-outcome-missing",
  "policy-emitted-message-missing",
  "policy-emitted-producer-mismatch",
  "policy-target-system-mismatch"
] as const;

export type VnextSemanticDiagnosticCode =
  (typeof VNEXT_SEMANTIC_DIAGNOSTIC_CODES)[number];

export interface VnextSemanticDiagnostic {
  severity: "error";
  code: VnextSemanticDiagnosticCode;
  path: string;
  message: string;
}

export interface VnextSemanticValidationResult {
  validationVersion: typeof VNEXT_SEMANTIC_VALIDATION_VERSION;
  specId: string;
  diagnostics: readonly VnextSemanticDiagnostic[];
  summary: {
    errorCount: number;
  };
}

interface MutableMaps {
  contexts: ReadonlyMap<string, VnextContextSpec>;
  actors: ReadonlyMap<string, VnextActorSpec>;
  systems: ReadonlyMap<string, VnextSystemSpec>;
  scenarios: ReadonlyMap<string, VnextScenarioSpec>;
  messages: ReadonlyMap<string, VnextMessageSpec>;
  aggregates: ReadonlyMap<string, VnextAggregateSpec>;
  policies: ReadonlyMap<string, VnextPolicySpec>;
}

type DiagnosticCollector = {
  push: (diagnostic: VnextSemanticDiagnostic) => void;
};

export function analyzeVnextBusinessSpecSemantics(
  spec: VnextBusinessSpec
): VnextSemanticValidationResult {
  const diagnostics: VnextSemanticDiagnostic[] = [];
  const collector: DiagnosticCollector = {
    push(diagnostic) {
      diagnostics.push(diagnostic);
    }
  };
  const maps = createMutableMaps(spec, collector);
  const resourceRegistry = buildResourceRegistry(maps);

  for (const context of spec.contexts) {
    validateContextSemantics(context, collector, resourceRegistry);
  }

  for (const actor of spec.actors) {
    assertKind(actor.kind, "actor", `Actor ${actor.id}`, actorPath(actor.id), collector);
  }

  for (const system of spec.systems) {
    assertKind(system.kind, "system", `System ${system.id}`, systemPath(system.id), collector);
    reportDuplicateStrings(
      system.capabilities,
      systemPath(system.id, "/capabilities"),
      `system ${system.id} capabilities`,
      collector
    );
  }

  for (const scenario of spec.scenarios) {
    validateScenarioSemantics(scenario, maps, collector);
  }

  for (const message of spec.messages) {
    validateMessageSemantics(message, maps, collector, resourceRegistry);
  }

  for (const aggregate of spec.aggregates) {
    validateAggregateSemantics(aggregate, maps, collector);
  }

  for (const policy of spec.policies) {
    validatePolicySemantics(policy, maps, collector, resourceRegistry);
  }

  return {
    validationVersion: VNEXT_SEMANTIC_VALIDATION_VERSION,
    specId: spec.id,
    diagnostics,
    summary: {
      errorCount: diagnostics.length
    }
  };
}

export function collectVnextBusinessSpecSemanticDiagnostics(
  spec: VnextBusinessSpec
): readonly VnextSemanticDiagnostic[] {
  return analyzeVnextBusinessSpecSemantics(spec).diagnostics;
}

export function validateVnextBusinessSpecSemantics(spec: VnextBusinessSpec): void {
  const diagnostics = collectVnextBusinessSpecSemanticDiagnostics(spec);

  if (diagnostics.length === 0) {
    return;
  }

  throw new Error(formatDiagnostics(diagnostics));
}

function createMutableMaps(
  spec: VnextBusinessSpec,
  collector: DiagnosticCollector
): MutableMaps {
  return {
    contexts: indexById(spec.contexts, "Context", contextPath, collector),
    actors: indexById(spec.actors, "Actor", actorPath, collector),
    systems: indexById(spec.systems, "System", systemPath, collector),
    scenarios: indexById(spec.scenarios, "Scenario", scenarioPath, collector),
    messages: indexById(spec.messages, "Message", messagePath, collector),
    aggregates: indexById(spec.aggregates, "Aggregate", aggregatePath, collector),
    policies: indexById(spec.policies, "Policy", policyPath, collector)
  };
}

function buildResourceRegistry(maps: MutableMaps): ReadonlySet<string> {
  const registry = new Set<string>();

  registerResourceMap(registry, "context", maps.contexts);
  registerResourceMap(registry, "actor", maps.actors);
  registerResourceMap(registry, "system", maps.systems);
  registerResourceMap(registry, "scenario", maps.scenarios);
  registerResourceMap(registry, "message", maps.messages);
  registerResourceMap(registry, "aggregate", maps.aggregates);
  registerResourceMap(registry, "policy", maps.policies);

  return registry;
}

function validateContextSemantics(
  context: VnextContextSpec,
  collector: DiagnosticCollector,
  resourceRegistry: ReadonlySet<string>
): void {
  assertKind(
    context.kind,
    "context",
    `Context ${context.id}`,
    contextPath(context.id),
    collector
  );

  if (context.owners.length === 0) {
    collector.push({
      severity: "error",
      code: "missing-context-owner",
      path: contextPath(context.id, "/owners"),
      message: `Context ${context.id} must declare at least one owner`
    });
  }

  reportDuplicateStrings(
    context.owners,
    contextPath(context.id, "/owners"),
    `context ${context.id} owners`,
    collector
  );
  reportDuplicateStrings(
    context.responsibilities,
    contextPath(context.id, "/responsibilities"),
    `context ${context.id} responsibilities`,
    collector
  );

  const relationshipIds = new Set<string>();

  for (const relationship of context.relationships ?? []) {
    const path = contextPath(context.id, `/relationships/${relationship.id}`);

    if (relationshipIds.has(relationship.id)) {
      collector.push({
        severity: "error",
        code: "duplicate-local-id",
        path,
        message: `Duplicate relationship ${relationship.id} in context ${context.id}`
      });
      continue;
    }

    relationshipIds.add(relationship.id);
    assertKnownResourceRef(
      resourceRegistry,
      relationship.target,
      `Context ${context.id} relationship ${relationship.id} target`,
      `${path}/target`,
      collector
    );
  }
}

function validateScenarioSemantics(
  scenario: VnextScenarioSpec,
  maps: MutableMaps,
  collector: DiagnosticCollector
): void {
  assertKind(
    scenario.kind,
    "scenario",
    `Scenario ${scenario.id}`,
    scenarioPath(scenario.id),
    collector
  );

  if (!maps.contexts.has(scenario.ownerContext)) {
    collector.push({
      severity: "error",
      code: "scenario-owner-context-missing",
      path: scenarioPath(scenario.id, "/ownerContext"),
      message: `Scenario ${scenario.id} ownerContext ${scenario.ownerContext} must reference existing context`
    });
  }

  const stepMap = indexById(
    scenario.steps,
    `Scenario ${scenario.id} step`,
    (stepId) => scenarioStepPath(scenario.id, stepId),
    collector
  );
  const incomingStepIds = new Set<string>();

  for (const step of scenario.steps) {
    validateScenarioStepSemantics(scenario, step, maps, stepMap, collector);

    for (const nextStepId of step.next ?? []) {
      if (stepMap.has(nextStepId)) {
        incomingStepIds.add(nextStepId);
      }
    }
  }

  const ownerContextSteps = scenario.steps.filter(
    (step) => step.context === scenario.ownerContext
  );

  if (ownerContextSteps.length === 0) {
    collector.push({
      severity: "error",
      code: "scenario-owner-context-unused",
      path: scenarioPath(scenario.id, "/steps"),
      message: `Scenario ${scenario.id} must include at least one step in ownerContext ${scenario.ownerContext}`
    });
  }

  const entrySteps = scenario.steps.filter((step) => !incomingStepIds.has(step.id));

  if (entrySteps.length === 0) {
    collector.push({
      severity: "error",
      code: "scenario-entry-step-missing",
      path: scenarioPath(scenario.id, "/steps"),
      message: `Scenario ${scenario.id} must define at least one entry step`
    });
  }

  if (entrySteps.length > 1) {
    collector.push({
      severity: "error",
      code: "scenario-multiple-entry-steps",
      path: scenarioPath(scenario.id, "/steps"),
      message: `Scenario ${scenario.id} must define exactly one entry step, found ${entrySteps
        .map((step) => step.id)
        .join(", ")}`
    });
  }

  const finalSteps = scenario.steps.filter((step) => step.final);

  if (finalSteps.length === 0) {
    collector.push({
      severity: "error",
      code: "scenario-final-step-missing",
      path: scenarioPath(scenario.id, "/steps"),
      message: `Scenario ${scenario.id} must define at least one final step`
    });
  }

  const reachableStepIds =
    entrySteps.length === 1
      ? collectReachableStepIds(entrySteps[0], stepMap)
      : new Set<string>();

  for (const step of scenario.steps) {
    if (entrySteps.length === 1 && !reachableStepIds.has(step.id)) {
      collector.push({
        severity: "error",
        code: "scenario-step-unreachable",
        path: scenarioStepPath(scenario.id, step.id),
        message: `Scenario ${scenario.id} step ${step.id} is unreachable from entry step ${entrySteps[0].id}`
      });
    }

    if (entrySteps.length === 1 && step.final && !reachableStepIds.has(step.id)) {
      collector.push({
        severity: "error",
        code: "scenario-final-step-unreachable",
        path: scenarioStepPath(scenario.id, step.id),
        message: `Scenario ${scenario.id} final step ${step.id} cannot be reached from entry step ${entrySteps[0].id}`
      });
    }
  }
}

function validateScenarioStepSemantics(
  scenario: VnextScenarioSpec,
  step: VnextScenarioStepSpec,
  maps: MutableMaps,
  stepMap: ReadonlyMap<string, VnextScenarioStepSpec>,
  collector: DiagnosticCollector
): void {
  const stepPath = scenarioStepPath(scenario.id, step.id);

  if (!maps.contexts.has(step.context)) {
    collector.push({
      severity: "error",
      code: "unknown-resource-reference",
      path: `${stepPath}/context`,
      message: `Scenario ${scenario.id} step ${step.id} context ${step.context} must reference existing context`
    });
  }

  if (step.actor && !maps.actors.has(step.actor)) {
    collector.push({
      severity: "error",
      code: "unknown-resource-reference",
      path: `${stepPath}/actor`,
      message: `Scenario ${scenario.id} step ${step.id} actor ${step.actor} must reference existing actor`
    });
  }

  if (step.system && !maps.systems.has(step.system)) {
    collector.push({
      severity: "error",
      code: "unknown-resource-reference",
      path: `${stepPath}/system`,
      message: `Scenario ${scenario.id} step ${step.id} system ${step.system} must reference existing system`
    });
  }

  if (step.final && !step.outcome) {
    collector.push({
      severity: "error",
      code: "missing-required-link",
      path: `${stepPath}/outcome`,
      message: `Scenario ${scenario.id} final step ${step.id} must define outcome`
    });
  }

  if (!step.final && step.outcome) {
    collector.push({
      severity: "error",
      code: "missing-required-link",
      path: `${stepPath}/outcome`,
      message: `Scenario ${scenario.id} non-final step ${step.id} cannot define outcome`
    });
  }

  if (step.final && (step.next?.length ?? 0) > 0) {
    collector.push({
      severity: "error",
      code: "missing-required-link",
      path: `${stepPath}/next`,
      message: `Scenario ${scenario.id} final step ${step.id} cannot define next`
    });
  }

  if (!step.final && (step.next?.length ?? 0) === 0) {
    collector.push({
      severity: "error",
      code: "scenario-step-next-missing",
      path: `${stepPath}/next`,
      message: `Scenario ${scenario.id} non-final step ${step.id} must define at least one next step`
    });
  }

  reportDuplicateStrings(
    step.incomingMessages,
    `${stepPath}/incomingMessages`,
    `scenario ${scenario.id} step ${step.id} incomingMessages`,
    collector
  );
  reportDuplicateStrings(
    step.outgoingMessages,
    `${stepPath}/outgoingMessages`,
    `scenario ${scenario.id} step ${step.id} outgoingMessages`,
    collector
  );
  reportDuplicateStrings(
    step.next,
    `${stepPath}/next`,
    `scenario ${scenario.id} step ${step.id} next`,
    collector
  );

  for (const messageId of step.incomingMessages ?? []) {
    const message = maps.messages.get(messageId);

    if (!message) {
      collector.push({
        severity: "error",
        code: "unknown-resource-reference",
        path: `${stepPath}/incomingMessages/${messageId}`,
        message: `Scenario ${scenario.id} step ${step.id} incoming message ${messageId} must reference existing message`
      });
      continue;
    }

    if (!stepCanReceiveMessage(scenario, step, message, maps)) {
      collector.push({
        severity: "error",
        code: "scenario-message-link-broken",
        path: `${stepPath}/incomingMessages/${messageId}`,
        message: `Scenario ${scenario.id} step ${step.id} incoming message ${messageId} is not linked to the step or its owner context`
      });
    }
  }

  for (const messageId of step.outgoingMessages ?? []) {
    const message = maps.messages.get(messageId);

    if (!message) {
      collector.push({
        severity: "error",
        code: "unknown-resource-reference",
        path: `${stepPath}/outgoingMessages/${messageId}`,
        message: `Scenario ${scenario.id} step ${step.id} outgoing message ${messageId} must reference existing message`
      });
      continue;
    }

    if (!stepCanProduceMessage(scenario, step, message, maps)) {
      collector.push({
        severity: "error",
        code: "scenario-message-link-broken",
        path: `${stepPath}/outgoingMessages/${messageId}`,
        message: `Scenario ${scenario.id} step ${step.id} outgoing message ${messageId} is not linked to the step or its owner context`
      });
    }
  }

  for (const nextStepId of step.next ?? []) {
    if (!stepMap.has(nextStepId)) {
      collector.push({
        severity: "error",
        code: "unknown-resource-reference",
        path: `${stepPath}/next/${nextStepId}`,
        message: `Scenario ${scenario.id} step ${step.id} next ${nextStepId} must reference existing step`
      });
    }
  }
}

function validateMessageSemantics(
  message: VnextMessageSpec,
  maps: MutableMaps,
  collector: DiagnosticCollector,
  resourceRegistry: ReadonlySet<string>
): void {
  assertKind(
    message.kind,
    "message",
    `Message ${message.id}`,
    messagePath(message.id),
    collector
  );

  validateMessageRefs(
    resourceRegistry,
    message.producers,
    `Message ${message.id} producer`,
    messagePath(message.id, "/producers"),
    collector
  );
  validateMessageRefs(
    resourceRegistry,
    message.consumers,
    `Message ${message.id} consumer`,
    messagePath(message.id, "/consumers"),
    collector
  );
  reportDuplicateStrings(
    message.payload?.map((field) => field.id),
    messagePath(message.id, "/payload"),
    `message ${message.id} payload`,
    collector
  );
  validatePayload(message.payload ?? [], `Message ${message.id}`, messagePath(message.id), collector);

  const producerContextIds = new Set(
    message.producers
      .map((ref) => resolveResourceContext(ref, maps))
      .filter((contextId): contextId is string => typeof contextId === "string")
  );

  if (producerContextIds.size > 1) {
    collector.push({
      severity: "error",
      code: "ambiguous-message-ownership",
      path: messagePath(message.id, "/producers"),
      message: `Message ${message.id} producers span multiple contexts: ${[...producerContextIds].join(", ")}`
    });
  }

  validateScenarioBacklinks(message, maps, collector);
}

function validateAggregateSemantics(
  aggregate: VnextAggregateSpec,
  maps: MutableMaps,
  collector: DiagnosticCollector
): void {
  assertKind(
    aggregate.kind,
    "aggregate",
    `Aggregate ${aggregate.id}`,
    aggregatePath(aggregate.id),
    collector
  );

  if (!maps.contexts.has(aggregate.context)) {
    collector.push({
      severity: "error",
      code: "unknown-resource-reference",
      path: aggregatePath(aggregate.id, "/context"),
      message: `Aggregate ${aggregate.id} context ${aggregate.context} must reference existing context`
    });
  }

  reportDuplicateStrings(
    aggregate.states,
    aggregatePath(aggregate.id, "/states"),
    `aggregate ${aggregate.id} states`,
    collector
  );

  if (!aggregate.states.includes(aggregate.initialState)) {
    collector.push({
      severity: "error",
      code: "aggregate-initial-state-invalid",
      path: aggregatePath(aggregate.id, "/initialState"),
      message: `Aggregate ${aggregate.id} initialState ${aggregate.initialState} must belong to states`
    });
  }

  const transitionIds = new Set<string>();

  for (const transition of aggregate.transitions) {
    const transitionPath = aggregatePath(aggregate.id, `/transitions/${transition.id}`);

    if (transitionIds.has(transition.id)) {
      collector.push({
        severity: "error",
        code: "duplicate-local-id",
        path: transitionPath,
        message: `Duplicate transition ${transition.id} in aggregate ${aggregate.id}`
      });
      continue;
    }

    transitionIds.add(transition.id);

    if (!aggregate.states.includes(transition.from)) {
      collector.push({
        severity: "error",
        code: "aggregate-transition-state-invalid",
        path: `${transitionPath}/from`,
        message: `Aggregate ${aggregate.id} transition ${transition.id} from ${transition.from} must belong to states`
      });
    }

    if (!aggregate.states.includes(transition.to)) {
      collector.push({
        severity: "error",
        code: "aggregate-transition-state-invalid",
        path: `${transitionPath}/to`,
        message: `Aggregate ${aggregate.id} transition ${transition.id} to ${transition.to} must belong to states`
      });
    }

    const triggeringMessage = maps.messages.get(transition.onMessage);

    if (!triggeringMessage) {
      collector.push({
        severity: "error",
        code: "aggregate-transition-trigger-missing",
        path: `${transitionPath}/onMessage`,
        message: `Aggregate ${aggregate.id} transition ${transition.id} onMessage ${transition.onMessage} must reference existing message`
      });
    } else if (!hasResourceRef(triggeringMessage.consumers, "aggregate", aggregate.id)) {
      collector.push({
        severity: "error",
        code: "aggregate-transition-trigger-consumer-mismatch",
        path: `${transitionPath}/onMessage`,
        message: `Aggregate ${aggregate.id} transition ${transition.id} onMessage ${transition.onMessage} must list aggregate ${aggregate.id} as a consumer`
      });
    }

    reportDuplicateStrings(
      transition.emits,
      `${transitionPath}/emits`,
      `aggregate ${aggregate.id} transition ${transition.id} emits`,
      collector
    );

    for (const emittedMessageId of transition.emits ?? []) {
      const emittedMessage = maps.messages.get(emittedMessageId);

      if (!emittedMessage) {
        collector.push({
          severity: "error",
          code: "aggregate-transition-emitted-message-missing",
          path: `${transitionPath}/emits/${emittedMessageId}`,
          message: `Aggregate ${aggregate.id} transition ${transition.id} emits ${emittedMessageId}, but that message does not exist`
        });
        continue;
      }

      if (!hasResourceRef(emittedMessage.producers, "aggregate", aggregate.id)) {
        collector.push({
          severity: "error",
          code: "aggregate-transition-emitted-producer-mismatch",
          path: `${transitionPath}/emits/${emittedMessageId}`,
          message: `Aggregate ${aggregate.id} transition ${transition.id} emitted message ${emittedMessageId} must list aggregate ${aggregate.id} as a producer`
        });
      }
    }
  }
}

function validatePolicySemantics(
  policy: VnextPolicySpec,
  maps: MutableMaps,
  collector: DiagnosticCollector,
  resourceRegistry: ReadonlySet<string>
): void {
  assertKind(
    policy.kind,
    "policy",
    `Policy ${policy.id}`,
    policyPath(policy.id),
    collector
  );

  if (policy.context && !maps.contexts.has(policy.context)) {
    collector.push({
      severity: "error",
      code: "unknown-resource-reference",
      path: policyPath(policy.id, "/context"),
      message: `Policy ${policy.id} context ${policy.context} must reference existing context`
    });
  }

  reportDuplicateStrings(
    policy.triggerMessages,
    policyPath(policy.id, "/triggerMessages"),
    `policy ${policy.id} triggerMessages`,
    collector
  );

  for (const messageId of policy.triggerMessages) {
    const message = maps.messages.get(messageId);

    if (!message) {
      collector.push({
        severity: "error",
        code: "policy-trigger-message-missing",
        path: policyPath(policy.id, `/triggerMessages/${messageId}`),
        message: `Policy ${policy.id} trigger message ${messageId} must reference existing message`
      });
      continue;
    }

    if (!hasResourceRef(message.consumers, "policy", policy.id)) {
      collector.push({
        severity: "error",
        code: "policy-trigger-consumer-mismatch",
        path: policyPath(policy.id, `/triggerMessages/${messageId}`),
        message: `Policy ${policy.id} trigger message ${messageId} must list policy ${policy.id} as a consumer`
      });
    }
  }

  reportDuplicateStrings(
    policy.emittedMessages,
    policyPath(policy.id, "/emittedMessages"),
    `policy ${policy.id} emittedMessages`,
    collector
  );

  if ((policy.emittedMessages?.length ?? 0) === 0) {
    collector.push({
      severity: "error",
      code: "policy-outcome-missing",
      path: policyPath(policy.id, "/emittedMessages"),
      message: `Policy ${policy.id} must declare at least one emitted message to describe its outcome`
    });
  }

  const emittedMessageConsumerIds = new Set<string>();

  for (const messageId of policy.emittedMessages ?? []) {
    const emittedMessage = maps.messages.get(messageId);

    if (!emittedMessage) {
      collector.push({
        severity: "error",
        code: "policy-emitted-message-missing",
        path: policyPath(policy.id, `/emittedMessages/${messageId}`),
        message: `Policy ${policy.id} emitted message ${messageId} must reference existing message`
      });
      continue;
    }

    if (!hasResourceRef(emittedMessage.producers, "policy", policy.id)) {
      collector.push({
        severity: "error",
        code: "policy-emitted-producer-mismatch",
        path: policyPath(policy.id, `/emittedMessages/${messageId}`),
        message: `Policy ${policy.id} emitted message ${messageId} must list policy ${policy.id} as a producer`
      });
    }

    for (const consumer of emittedMessage.consumers) {
      if (consumer.kind === "system") {
        emittedMessageConsumerIds.add(consumer.id);
      }
    }
  }

  reportDuplicateStrings(
    policy.targetSystems,
    policyPath(policy.id, "/targetSystems"),
    `policy ${policy.id} targetSystems`,
    collector
  );

  for (const systemId of policy.targetSystems ?? []) {
    if (!maps.systems.has(systemId)) {
      collector.push({
        severity: "error",
        code: "unknown-resource-reference",
        path: policyPath(policy.id, `/targetSystems/${systemId}`),
        message: `Policy ${policy.id} target system ${systemId} must reference existing system`
      });
      continue;
    }

    if ((policy.emittedMessages?.length ?? 0) > 0 && !emittedMessageConsumerIds.has(systemId)) {
      collector.push({
        severity: "error",
        code: "policy-target-system-mismatch",
        path: policyPath(policy.id, `/targetSystems/${systemId}`),
        message: `Policy ${policy.id} target system ${systemId} must appear as a consumer of at least one emitted message`
      });
    }
  }

  for (const coordinate of policy.coordinates ?? []) {
    assertKnownResourceRef(
      resourceRegistry,
      coordinate,
      `Policy ${policy.id} coordinate`,
      policyPath(policy.id, `/coordinates/${coordinate.kind}:${coordinate.id}`),
      collector
    );
  }
}

function validateMessageRefs(
  resourceRegistry: ReadonlySet<string>,
  refs: readonly VnextResourceRef[],
  label: string,
  path: string,
  collector: DiagnosticCollector
): void {
  const seenRefs = new Set<string>();

  for (const ref of refs) {
    const key = toResourceKey(ref.kind, ref.id);

    if (seenRefs.has(key)) {
      collector.push({
        severity: "error",
        code: "duplicate-array-value",
        path: `${path}/${ref.kind}:${ref.id}`,
        message: `Duplicate ${label} ${ref.kind} ${ref.id}`
      });
      continue;
    }

    seenRefs.add(key);
    assertKnownResourceRef(resourceRegistry, ref, label, `${path}/${ref.kind}:${ref.id}`, collector);
  }
}

function validatePayload(
  payload: readonly VnextPayloadFieldSpec[],
  label: string,
  path: string,
  collector: DiagnosticCollector
): void {
  const fieldIds = new Set<string>();

  for (const field of payload) {
    if (fieldIds.has(field.id)) {
      collector.push({
        severity: "error",
        code: "duplicate-local-id",
        path: `${path}/payload/${field.id}`,
        message: `Duplicate payload field ${field.id} in ${label}`
      });
      continue;
    }

    fieldIds.add(field.id);
  }
}

function validateScenarioBacklinks(
  message: VnextMessageSpec,
  maps: MutableMaps,
  collector: DiagnosticCollector
): void {
  for (const ref of message.producers) {
    if (ref.kind !== "scenario") {
      continue;
    }

    const scenario = maps.scenarios.get(ref.id);

    if (!scenario) {
      continue;
    }

    const linked = scenario.steps.some((step) => step.outgoingMessages?.includes(message.id));

    if (!linked) {
      collector.push({
        severity: "error",
        code: "scenario-message-link-broken",
        path: messagePath(message.id, `/producers/scenario:${scenario.id}`),
        message: `Message ${message.id} producer scenario ${scenario.id} must reference the message from at least one outgoing step`
      });
    }
  }

  for (const ref of message.consumers) {
    if (ref.kind !== "scenario") {
      continue;
    }

    const scenario = maps.scenarios.get(ref.id);

    if (!scenario) {
      continue;
    }

    const linked = scenario.steps.some((step) => step.incomingMessages?.includes(message.id));

    if (!linked) {
      collector.push({
        severity: "error",
        code: "scenario-message-link-broken",
        path: messagePath(message.id, `/consumers/scenario:${scenario.id}`),
        message: `Message ${message.id} consumer scenario ${scenario.id} must reference the message from at least one incoming step`
      });
    }
  }
}

function collectReachableStepIds(
  entryStep: VnextScenarioStepSpec,
  stepMap: ReadonlyMap<string, VnextScenarioStepSpec>
): ReadonlySet<string> {
  const visited = new Set<string>();
  const queue = [entryStep];

  while (queue.length > 0) {
    const currentStep = queue.shift();

    if (!currentStep || visited.has(currentStep.id)) {
      continue;
    }

    visited.add(currentStep.id);

    for (const nextStepId of currentStep.next ?? []) {
      const nextStep = stepMap.get(nextStepId);

      if (nextStep && !visited.has(nextStep.id)) {
        queue.push(nextStep);
      }
    }
  }

  return visited;
}

function stepCanReceiveMessage(
  scenario: VnextScenarioSpec,
  step: VnextScenarioStepSpec,
  message: VnextMessageSpec,
  maps: MutableMaps
): boolean {
  return message.consumers.some((ref) => isStepCompatibleRef(ref, scenario, step, maps));
}

function stepCanProduceMessage(
  scenario: VnextScenarioSpec,
  step: VnextScenarioStepSpec,
  message: VnextMessageSpec,
  maps: MutableMaps
): boolean {
  return message.producers.some((ref) => isStepCompatibleRef(ref, scenario, step, maps));
}

function isStepCompatibleRef(
  ref: VnextResourceRef,
  scenario: VnextScenarioSpec,
  step: VnextScenarioStepSpec,
  maps: MutableMaps
): boolean {
  if (ref.kind === "scenario") {
    return ref.id === scenario.id;
  }

  if (ref.kind === "context") {
    return ref.id === step.context;
  }

  if (ref.kind === "actor") {
    return step.actor === ref.id;
  }

  if (ref.kind === "system") {
    return step.system === ref.id;
  }

  if (ref.kind === "aggregate") {
    return maps.aggregates.get(ref.id)?.context === step.context;
  }

  if (ref.kind === "policy") {
    return maps.policies.get(ref.id)?.context === step.context;
  }

  return false;
}

function resolveResourceContext(
  ref: VnextResourceRef,
  maps: MutableMaps
): string | undefined {
  if (ref.kind === "context") {
    return ref.id;
  }

  if (ref.kind === "scenario") {
    return maps.scenarios.get(ref.id)?.ownerContext;
  }

  if (ref.kind === "aggregate") {
    return maps.aggregates.get(ref.id)?.context;
  }

  if (ref.kind === "policy") {
    return maps.policies.get(ref.id)?.context;
  }

  return undefined;
}

function indexById<Value extends { id: string }>(
  values: readonly Value[],
  label: string,
  pathForId: (id: string) => string,
  collector: DiagnosticCollector
): ReadonlyMap<string, Value> {
  const entries = new Map<string, Value>();

  for (const value of values) {
    if (entries.has(value.id)) {
      collector.push({
        severity: "error",
        code: "duplicate-resource-id",
        path: pathForId(value.id),
        message: `Duplicate ${label} ${value.id}`
      });
      continue;
    }

    entries.set(value.id, value);
  }

  return entries;
}

function registerResourceMap<Value extends { id: string }>(
  registry: Set<string>,
  kind: VnextResourceKind,
  values: ReadonlyMap<string, Value>
): void {
  for (const value of values.values()) {
    registry.add(toResourceKey(kind, value.id));
  }
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
  label: string,
  path: string,
  collector: DiagnosticCollector
): void {
  if (!resourceRegistry.has(toResourceKey(ref.kind, ref.id))) {
    collector.push({
      severity: "error",
      code: "unknown-resource-reference",
      path,
      message: `${label} ${ref.kind} ${ref.id} must reference existing ${ref.kind}`
    });
  }
}

function assertKind(
  actualKind: string,
  expectedKind: string,
  label: string,
  path: string,
  collector: DiagnosticCollector
): void {
  if (actualKind !== expectedKind) {
    collector.push({
      severity: "error",
      code: "missing-required-link",
      path,
      message: `${label} kind ${actualKind} must be ${expectedKind}`
    });
  }
}

function reportDuplicateStrings(
  values: readonly string[] | undefined,
  path: string,
  label: string,
  collector: DiagnosticCollector
): void {
  if (!values) {
    return;
  }

  const seenValues = new Set<string>();

  for (const value of values) {
    if (seenValues.has(value)) {
      collector.push({
        severity: "error",
        code: "duplicate-array-value",
        path: `${path}/${value}`,
        message: `Duplicate value ${value} in ${label}`
      });
      continue;
    }

    seenValues.add(value);
  }
}

function toResourceKey(kind: VnextResourceKind, id: string): string {
  return `${kind}:${id}`;
}

function formatDiagnostics(diagnostics: readonly VnextSemanticDiagnostic[]): string {
  return [
    `vNext semantic validation failed with ${diagnostics.length} error(s):`,
    ...diagnostics.map((diagnostic) => `- ${diagnostic.message}`)
  ].join("\n");
}

function contextPath(contextId: string, suffix = ""): string {
  return `/contexts/${contextId}${suffix}`;
}

function actorPath(actorId: string, suffix = ""): string {
  return `/actors/${actorId}${suffix}`;
}

function systemPath(systemId: string, suffix = ""): string {
  return `/systems/${systemId}${suffix}`;
}

function scenarioPath(scenarioId: string, suffix = ""): string {
  return `/scenarios/${scenarioId}${suffix}`;
}

function scenarioStepPath(scenarioId: string, stepId: string, suffix = ""): string {
  return `/scenarios/${scenarioId}/steps/${stepId}${suffix}`;
}

function messagePath(messageId: string, suffix = ""): string {
  return `/messages/${messageId}${suffix}`;
}

function aggregatePath(aggregateId: string, suffix = ""): string {
  return `/aggregates/${aggregateId}${suffix}`;
}

function policyPath(policyId: string, suffix = ""): string {
  return `/policies/${policyId}${suffix}`;
}
