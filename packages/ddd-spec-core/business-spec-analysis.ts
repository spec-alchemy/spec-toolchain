import type {
  ActorSpec,
  ActorType,
  AggregateSpec,
  BusinessSpec,
  ContextRelationshipSpec,
  ContextRelationshipDirection,
  ContextSpec,
  MessageChannel,
  MessageKind,
  MessageSpec,
  PayloadFieldSpec,
  PolicySpec,
  ResourceKind,
  ResourceRef,
  ScenarioSpec,
  ScenarioStepSpec,
  SystemBoundary,
  SystemSpec
} from "./spec.js";
import type { SharedReference } from "../spec-toolchain-shared-kernel/reference.js";
import type { SharedStableId } from "../spec-toolchain-shared-kernel/stable-identity.js";

export const BUSINESS_SPEC_ANALYSIS_VERSION = 1 as const;
export const SEMANTIC_VALIDATION_VERSION = 1 as const;

export const ANALYSIS_DIAGNOSTIC_CODES = [
  "duplicate-resource-id",
  "duplicate-local-id",
  "duplicate-array-value",
  "missing-required-link",
  "missing-context-owner",
  "unknown-resource-reference",
  "unsupported-resource-kind-reference",
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
  "aggregate-state-unreachable",
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

export type AnalysisDiagnosticCode =
  (typeof ANALYSIS_DIAGNOSTIC_CODES)[number];

export interface AnalysisDiagnostic {
  severity: "error";
  code: AnalysisDiagnosticCode;
  path: string;
  message: string;
}

interface CanonicalSourceIdentity {
  stableId: SharedStableId;
}

export interface ContextBoundaryRelationship {
  id: string;
  kind: string;
  target: SharedReference;
  direction?: ContextRelationshipDirection;
  integration?: string;
  description?: string;
  path: string;
}

export interface ContextBoundary extends CanonicalSourceIdentity {
  kind: string;
  id: string;
  title: string;
  summary: string;
  owners: readonly string[];
  responsibilities: readonly string[];
  aggregateIds: readonly string[];
  scenarioIds: readonly string[];
  policyIds: readonly string[];
  actorIds: readonly string[];
  systemIds: readonly string[];
  relationships: readonly ContextBoundaryRelationship[];
  path: string;
}

export interface ActorStepRef {
  scenarioId: string;
  stepId: string;
  contextId: string;
  path: string;
}

export interface ActorParticipant extends CanonicalSourceIdentity {
  kind: string;
  id: string;
  title: string;
  summary: string;
  actorType?: ActorType;
  contextIds: readonly string[];
  scenarioIds: readonly string[];
  stepRefs: readonly ActorStepRef[];
  path: string;
}

export type SystemDependencyKind =
  | "context-relationship"
  | "scenario-step"
  | "message-producer"
  | "message-consumer"
  | "policy-target";

export interface SystemDependencyRef {
  kind: SystemDependencyKind;
  contextIds: readonly string[];
  path: string;
  description?: string;
  scenarioId?: string;
  stepId?: string;
  messageId?: string;
  policyId?: string;
}

export interface SystemParticipant extends CanonicalSourceIdentity {
  kind: string;
  id: string;
  title: string;
  summary: string;
  boundary?: SystemBoundary;
  capabilities: readonly string[];
  contextIds: readonly string[];
  dependencyRefs: readonly SystemDependencyRef[];
  path: string;
}

export interface ScenarioStep {
  id: string;
  title: string;
  contextId: string;
  actorId?: string;
  systemId?: string;
  incomingMessageIds: readonly string[];
  outgoingMessageIds: readonly string[];
  nextStepIds: readonly string[];
  final: boolean;
  outcome?: string;
  entry: boolean;
  reachableFromEntry: boolean;
  path: string;
}

export interface ScenarioSequenceEdge {
  sourceStepId: string;
  targetStepId: string;
  path: string;
}

export interface ScenarioSequence extends CanonicalSourceIdentity {
  kind: string;
  id: string;
  title: string;
  summary: string;
  goal: string;
  ownerContextId: string;
  entryStepIds: readonly string[];
  finalStepIds: readonly string[];
  participatingContextIds: readonly string[];
  actorIds: readonly string[];
  systemIds: readonly string[];
  steps: readonly ScenarioStep[];
  edges: readonly ScenarioSequenceEdge[];
  path: string;
}

export interface MessageEndpoint {
  target: SharedReference["target"];
  contextId?: string;
  path: string;
}

export interface MessageStepLink {
  scenarioId: string;
  stepId: string;
  contextId: string;
  direction: "incoming" | "outgoing";
  path: string;
}

export interface MessageFlow extends CanonicalSourceIdentity {
  kind: string;
  id: string;
  title: string;
  summary: string;
  messageKind: MessageKind;
  channel?: MessageChannel;
  producers: readonly MessageEndpoint[];
  consumers: readonly MessageEndpoint[];
  payload: readonly PayloadFieldSpec[];
  stepLinks: readonly MessageStepLink[];
  producerContextIds: readonly string[];
  consumerContextIds: readonly string[];
  crossesContextBoundary: boolean;
  path: string;
}

export interface LifecycleState {
  id: string;
  reachableFromInitial: boolean;
  terminal: boolean;
  outgoingTransitionIds: readonly string[];
  path: string;
}

export interface LifecycleTransition {
  id: string;
  fromStateId: string;
  toStateId: string;
  onMessageId: string;
  emittedMessageIds: readonly string[];
  reachableFromInitial: boolean;
  path: string;
}

export interface AggregateLifecycle extends CanonicalSourceIdentity {
  kind: string;
  id: string;
  title: string;
  summary: string;
  contextId: string;
  lifecycleComplexity: boolean;
  initialState: string;
  states: readonly LifecycleState[];
  transitions: readonly LifecycleTransition[];
  acceptedMessageIds: readonly string[];
  emittedMessageIds: readonly string[];
  reachableStateIds: readonly string[];
  unreachableStateIds: readonly string[];
  path: string;
}

export interface PolicyCoordination extends CanonicalSourceIdentity {
  kind: string;
  id: string;
  title: string;
  summary: string;
  contextId?: string;
  triggerMessageIds: readonly string[];
  emittedMessageIds: readonly string[];
  targetSystemIds: readonly string[];
  coordinates: readonly SharedReference[];
  relatedContextIds: readonly string[];
  path: string;
}

const ALLOWED_CONTEXT_RELATIONSHIP_TARGET_KINDS = new Set<ResourceKind>([
  "context",
  "system"
]);

const ALLOWED_MESSAGE_ENDPOINT_KINDS = new Set<ResourceKind>([
  "context",
  "actor",
  "system",
  "scenario",
  "aggregate",
  "policy"
]);

const ALLOWED_POLICY_COORDINATE_KINDS = new Set<ResourceKind>([
  "context",
  "system",
  "scenario",
  "aggregate",
  "policy"
]);

export interface AnalysisIR {
  contextBoundaries: readonly ContextBoundary[];
  actors: readonly ActorParticipant[];
  systems: readonly SystemParticipant[];
  scenarioSequences: readonly ScenarioSequence[];
  messageFlows: readonly MessageFlow[];
  aggregateLifecycles: readonly AggregateLifecycle[];
  policyCoordinations: readonly PolicyCoordination[];
}

export interface BusinessSpecAnalysis {
  analysisVersion: typeof BUSINESS_SPEC_ANALYSIS_VERSION;
  specId: string;
  ir: AnalysisIR;
  diagnostics: readonly AnalysisDiagnostic[];
  summary: {
    errorCount: number;
  };
}

export interface SemanticValidationResult {
  validationVersion: typeof SEMANTIC_VALIDATION_VERSION;
  specId: string;
  diagnostics: readonly AnalysisDiagnostic[];
  summary: {
    errorCount: number;
  };
}

export interface ContextMapProjection {
  contexts: readonly ContextBoundary[];
  actors: readonly ActorParticipant[];
  systems: readonly SystemParticipant[];
}

interface RawResourceMaps {
  contexts: ReadonlyMap<string, ContextSpec>;
  actors: ReadonlyMap<string, ActorSpec>;
  systems: ReadonlyMap<string, SystemSpec>;
  scenarios: ReadonlyMap<string, ScenarioSpec>;
  messages: ReadonlyMap<string, MessageSpec>;
  aggregates: ReadonlyMap<string, AggregateSpec>;
  policies: ReadonlyMap<string, PolicySpec>;
}

interface AnalysisMaps {
  contexts: ReadonlyMap<string, ContextBoundary>;
  actors: ReadonlyMap<string, ActorParticipant>;
  systems: ReadonlyMap<string, SystemParticipant>;
  scenarios: ReadonlyMap<string, ScenarioSequence>;
  messages: ReadonlyMap<string, MessageFlow>;
  aggregates: ReadonlyMap<string, AggregateLifecycle>;
  policies: ReadonlyMap<string, PolicyCoordination>;
}

type DiagnosticCollector = {
  push: (diagnostic: AnalysisDiagnostic) => void;
};

export function buildBusinessSpecAnalysisIR(spec: BusinessSpec): AnalysisIR {
  const rawMaps = createRawResourceMaps(spec);
  const scenarioSequences = buildScenarioSequences(spec);
  const messageFlows = buildMessageFlows(spec, rawMaps);
  const aggregateLifecycles = buildAggregateLifecycles(spec);
  const policyCoordinations = buildPolicyCoordinations(spec, rawMaps);
  const actors = buildActorParticipants(spec);
  const systems = buildSystemParticipants(spec, messageFlows);

  return {
    contextBoundaries: buildContextBoundaries(
      spec,
      scenarioSequences,
      messageFlows,
      policyCoordinations
    ),
    actors,
    systems,
    scenarioSequences,
    messageFlows,
    aggregateLifecycles,
    policyCoordinations
  };
}

export function analyzeBusinessSpec(
  spec: BusinessSpec
): BusinessSpecAnalysis {
  const ir = buildBusinessSpecAnalysisIR(spec);
  const diagnostics = collectBusinessSpecAnalysisDiagnostics(ir);

  return {
    analysisVersion: BUSINESS_SPEC_ANALYSIS_VERSION,
    specId: spec.id,
    ir,
    diagnostics,
    summary: {
      errorCount: diagnostics.length
    }
  };
}

export function collectBusinessSpecAnalysisDiagnostics(
  ir: AnalysisIR
): readonly AnalysisDiagnostic[] {
  const diagnostics: AnalysisDiagnostic[] = [];
  const collector: DiagnosticCollector = {
    push(diagnostic) {
      diagnostics.push(diagnostic);
    }
  };
  const maps = createAnalysisMaps(ir, collector);
  const resourceRegistry = buildResourceRegistry(maps);

  for (const context of ir.contextBoundaries) {
    validateContextBoundary(context, collector, resourceRegistry);
  }

  for (const actor of ir.actors) {
    assertKind(actor.kind, "actor", `Actor ${actor.id}`, actor.path, collector);
  }

  for (const system of ir.systems) {
    validateSystemParticipant(system, collector);
  }

  for (const scenario of ir.scenarioSequences) {
    validateScenarioSequence(scenario, maps, collector);
  }

  for (const message of ir.messageFlows) {
    validateMessageFlow(message, maps, collector, resourceRegistry);
  }

  for (const aggregate of ir.aggregateLifecycles) {
    validateAggregateLifecycle(aggregate, maps, collector);
  }

  for (const policy of ir.policyCoordinations) {
    validatePolicyCoordination(policy, maps, collector, resourceRegistry);
  }

  return diagnostics;
}

export function analyzeBusinessSpecSemantics(
  spec: BusinessSpec
): SemanticValidationResult {
  const analysis = analyzeBusinessSpec(spec);

  return {
    validationVersion: SEMANTIC_VALIDATION_VERSION,
    specId: analysis.specId,
    diagnostics: analysis.diagnostics,
    summary: {
      errorCount: analysis.summary.errorCount
    }
  };
}

export function collectBusinessSpecSemanticDiagnostics(
  spec: BusinessSpec
): readonly AnalysisDiagnostic[] {
  return analyzeBusinessSpec(spec).diagnostics;
}

export function validateBusinessSpecSemantics(spec: BusinessSpec): void {
  const diagnostics = collectBusinessSpecSemanticDiagnostics(spec);

  if (diagnostics.length === 0) {
    return;
  }

  throw new Error(formatDiagnostics(diagnostics));
}

export function projectContextMap(ir: AnalysisIR): ContextMapProjection {
  return {
    contexts: ir.contextBoundaries,
    actors: ir.actors,
    systems: ir.systems
  };
}

export function projectScenarioStory(
  ir: AnalysisIR
): readonly ScenarioSequence[] {
  return ir.scenarioSequences;
}

export function projectMessageFlow(
  ir: AnalysisIR
): readonly MessageFlow[] {
  return ir.messageFlows;
}

export function projectLifecycle(
  ir: AnalysisIR
): readonly AggregateLifecycle[] {
  return ir.aggregateLifecycles.filter((aggregate) => aggregate.lifecycleComplexity);
}

export function projectPolicyCoordination(
  ir: AnalysisIR
): readonly PolicyCoordination[] {
  return ir.policyCoordinations;
}

function createRawResourceMaps(spec: BusinessSpec): RawResourceMaps {
  return {
    contexts: firstById(spec.contexts),
    actors: firstById(spec.actors),
    systems: firstById(spec.systems),
    scenarios: firstById(spec.scenarios),
    messages: firstById(spec.messages),
    aggregates: firstById(spec.aggregates),
    policies: firstById(spec.policies)
  };
}

function buildContextBoundaries(
  spec: BusinessSpec,
  scenarios: readonly ScenarioSequence[],
  messages: readonly MessageFlow[],
  policies: readonly PolicyCoordination[]
): readonly ContextBoundary[] {
  return spec.contexts.map((context) => {
    const aggregateIds = unique(
      spec.aggregates
        .filter((aggregate) => aggregate.context === context.id)
        .map((aggregate) => aggregate.id)
    );
    const scenarioIds = unique(
      scenarios
        .filter((scenario) => scenario.ownerContextId === context.id)
        .map((scenario) => scenario.id)
    );
    const policyIds = unique(
      policies
        .filter((policy) => policy.contextId === context.id)
        .map((policy) => policy.id)
    );
    const actorIds = unique(
      scenarios.flatMap((scenario) =>
        scenario.steps
          .filter((step) => step.contextId === context.id && typeof step.actorId === "string")
          .map((step) => step.actorId as string)
      )
    );
    const systemIds = unique([
      ...(context.relationships ?? [])
        .filter((relationship) => relationship.target.kind === "system")
        .map((relationship) => relationship.target.id),
      ...scenarios.flatMap((scenario) =>
        scenario.steps
          .filter((step) => step.contextId === context.id && typeof step.systemId === "string")
          .map((step) => step.systemId as string)
      ),
      ...messages.flatMap((message) => collectSystemIdsForContext(message, context.id)),
      ...policies
        .filter((policy) => policy.contextId === context.id)
        .flatMap((policy) => policy.targetSystemIds)
    ]);

    return {
      kind: context.kind,
      stableId: toStableId(context.kind, context.id),
      id: context.id,
      title: context.title,
      summary: context.summary,
      owners: [...context.owners],
      responsibilities: [...context.responsibilities],
      aggregateIds,
      scenarioIds,
      policyIds,
      actorIds,
      systemIds,
      relationships: (context.relationships ?? []).map((relationship) =>
        toContextBoundaryRelationship(context.id, relationship)
      ),
      path: contextPath(context.id)
    };
  });
}

function buildActorParticipants(
  spec: BusinessSpec
): readonly ActorParticipant[] {
  return spec.actors.map((actor) => {
    const stepRefs = spec.scenarios.flatMap((scenario) =>
      scenario.steps.flatMap((step) =>
        step.actor === actor.id
          ? [
              {
                scenarioId: scenario.id,
                stepId: step.id,
                contextId: step.context,
                path: scenarioStepPath(scenario.id, step.id, "/actor")
              } satisfies ActorStepRef
            ]
          : []
      )
    );

    return {
      kind: actor.kind,
      stableId: toStableId(actor.kind, actor.id),
      id: actor.id,
      title: actor.title,
      summary: actor.summary,
      actorType: actor.actorType,
      contextIds: unique(stepRefs.map((stepRef) => stepRef.contextId)),
      scenarioIds: unique(stepRefs.map((stepRef) => stepRef.scenarioId)),
      stepRefs,
      path: actorPath(actor.id)
    };
  });
}

function buildSystemParticipants(
  spec: BusinessSpec,
  messages: readonly MessageFlow[]
): readonly SystemParticipant[] {
  return spec.systems.map((system) => {
    const dependencyRefs: SystemDependencyRef[] = [];

    for (const context of spec.contexts) {
      for (const relationship of context.relationships ?? []) {
        if (relationship.target.kind !== "system" || relationship.target.id !== system.id) {
          continue;
        }

        dependencyRefs.push({
          kind: "context-relationship",
          contextIds: [context.id],
          path: contextPath(context.id, `/relationships/${relationship.id}`),
          description: relationship.description
        });
      }
    }

    for (const scenario of spec.scenarios) {
      for (const step of scenario.steps) {
        if (step.system !== system.id) {
          continue;
        }

        dependencyRefs.push({
          kind: "scenario-step",
          contextIds: [step.context],
          path: scenarioStepPath(scenario.id, step.id, "/system"),
          scenarioId: scenario.id,
          stepId: step.id
        });
      }
    }

    for (const message of messages) {
      for (const producer of message.producers) {
        if (producer.target.kind !== "system" || producer.target.value !== system.id) {
          continue;
        }

        dependencyRefs.push({
          kind: "message-producer",
          contextIds: message.consumerContextIds,
          path: producer.path,
          messageId: message.id
        });
      }

      for (const consumer of message.consumers) {
        if (consumer.target.kind !== "system" || consumer.target.value !== system.id) {
          continue;
        }

        dependencyRefs.push({
          kind: "message-consumer",
          contextIds: message.producerContextIds,
          path: consumer.path,
          messageId: message.id
        });
      }
    }

    for (const policy of spec.policies) {
      if (!(policy.targetSystems ?? []).includes(system.id)) {
        continue;
      }

      dependencyRefs.push({
        kind: "policy-target",
        contextIds: policy.context ? [policy.context] : [],
        path: policyPath(policy.id, `/targetSystems/${system.id}`),
        policyId: policy.id
      });
    }

    return {
      kind: system.kind,
      stableId: toStableId(system.kind, system.id),
      id: system.id,
      title: system.title,
      summary: system.summary,
      boundary: system.boundary,
      capabilities: [...(system.capabilities ?? [])],
      contextIds: unique(dependencyRefs.flatMap((dependency) => dependency.contextIds)),
      dependencyRefs,
      path: systemPath(system.id)
    };
  });
}

function buildScenarioSequences(
  spec: BusinessSpec
): readonly ScenarioSequence[] {
  return spec.scenarios.map((scenario) => {
    const stepMap = firstById(scenario.steps);
    const incomingStepIds = new Set<string>();

    for (const step of scenario.steps) {
      for (const nextStepId of step.next ?? []) {
        if (stepMap.has(nextStepId)) {
          incomingStepIds.add(nextStepId);
        }
      }
    }

    const entrySteps = scenario.steps.filter((step) => !incomingStepIds.has(step.id));
    const reachableStepIds =
      entrySteps.length === 1
        ? collectReachableStepIds(entrySteps[0], stepMap)
        : new Set<string>();

    return {
      kind: scenario.kind,
      stableId: toStableId(scenario.kind, scenario.id),
      id: scenario.id,
      title: scenario.title,
      summary: scenario.summary,
      goal: scenario.goal,
      ownerContextId: scenario.ownerContext,
      entryStepIds: entrySteps.map((step) => step.id),
      finalStepIds: scenario.steps.filter((step) => step.final).map((step) => step.id),
      participatingContextIds: unique(scenario.steps.map((step) => step.context)),
      actorIds: uniqueDefined(scenario.steps.map((step) => step.actor)),
      systemIds: uniqueDefined(scenario.steps.map((step) => step.system)),
      steps: scenario.steps.map((step) =>
        toScenarioStep(step, scenario.id, incomingStepIds, reachableStepIds)
      ),
      edges: scenario.steps.flatMap((step) =>
        (step.next ?? [])
          .filter((nextStepId) => stepMap.has(nextStepId))
          .map((nextStepId) => ({
            sourceStepId: step.id,
            targetStepId: nextStepId,
            path: scenarioStepPath(scenario.id, step.id, `/next/${nextStepId}`)
          }))
      ),
      path: scenarioPath(scenario.id)
    };
  });
}

function buildMessageFlows(
  spec: BusinessSpec,
  rawMaps: RawResourceMaps
): readonly MessageFlow[] {
  return spec.messages.map((message) => {
    const producers = message.producers.map((producer) =>
      toMessageEndpoint(message.id, "producers", producer, rawMaps)
    );
    const consumers = message.consumers.map((consumer) =>
      toMessageEndpoint(message.id, "consumers", consumer, rawMaps)
    );
    const producerContextIds = uniqueDefined(
      producers.map((producer) => producer.contextId)
    );
    const consumerContextIds = uniqueDefined(
      consumers.map((consumer) => consumer.contextId)
    );

    return {
      kind: message.kind,
      stableId: toStableId(message.kind, message.id),
      id: message.id,
      title: message.title,
      summary: message.summary,
      messageKind: message.messageKind,
      channel: message.channel,
      producers,
      consumers,
      payload: (message.payload ?? []).map((field) => ({ ...field })),
      stepLinks: collectMessageStepLinks(spec.scenarios, message.id),
      producerContextIds,
      consumerContextIds,
      crossesContextBoundary: hasCrossContextFlow(
        producerContextIds,
        consumerContextIds
      ),
      path: messagePath(message.id)
    };
  });
}

function buildAggregateLifecycles(
  spec: BusinessSpec
): readonly AggregateLifecycle[] {
  return spec.aggregates.map((aggregate) => {
    const adjacency = new Map<string, string[]>();
    const transitions: LifecycleTransition[] = aggregate.transitions.map((transition) => {
      adjacency.set(
        transition.from,
        [...(adjacency.get(transition.from) ?? []), transition.to]
      );

      return {
        id: transition.id,
        fromStateId: transition.from,
        toStateId: transition.to,
        onMessageId: transition.onMessage,
        emittedMessageIds: [...(transition.emits ?? [])],
        reachableFromInitial: false,
        path: aggregatePath(aggregate.id, `/transitions/${transition.id}`)
      };
    });

    for (const stateId of aggregate.states) {
      if (!adjacency.has(stateId)) {
        adjacency.set(stateId, []);
      }
    }

    const reachableStateIds = collectReachableNodeIds([aggregate.initialState], adjacency);
    const reachableStateSet = new Set(reachableStateIds);

    for (const transition of transitions) {
      transition.reachableFromInitial = reachableStateSet.has(transition.fromStateId);
    }

    return {
      kind: aggregate.kind,
      stableId: toStableId(aggregate.kind, aggregate.id),
      id: aggregate.id,
      title: aggregate.title,
      summary: aggregate.summary,
      contextId: aggregate.context,
      lifecycleComplexity: aggregate.lifecycleComplexity === true,
      initialState: aggregate.initialState,
      states: aggregate.states.map((stateId) => ({
        id: stateId,
        reachableFromInitial: reachableStateSet.has(stateId),
        terminal: !transitions.some((transition) => transition.fromStateId === stateId),
        outgoingTransitionIds: transitions
          .filter((transition) => transition.fromStateId === stateId)
          .map((transition) => transition.id),
        path: aggregatePath(aggregate.id, `/states/${stateId}`)
      })),
      transitions,
      acceptedMessageIds: unique(transitions.map((transition) => transition.onMessageId)),
      emittedMessageIds: unique(
        transitions.flatMap((transition) => transition.emittedMessageIds)
      ),
      reachableStateIds,
      unreachableStateIds: aggregate.states.filter(
        (stateId) => !reachableStateSet.has(stateId)
      ),
      path: aggregatePath(aggregate.id)
    };
  });
}

function buildPolicyCoordinations(
  spec: BusinessSpec,
  rawMaps: RawResourceMaps
): readonly PolicyCoordination[] {
  return spec.policies.map((policy) => {
    const relatedContextIds = uniqueDefined([
      policy.context,
      ...policy.triggerMessages.flatMap((messageId) =>
        collectMessageContextIds(rawMaps.messages.get(messageId), rawMaps)
      ),
      ...(policy.emittedMessages ?? []).flatMap((messageId) =>
        collectMessageContextIds(rawMaps.messages.get(messageId), rawMaps)
      ),
      ...(policy.coordinates ?? []).map((coordinate) =>
        resolveRawResourceContext(coordinate, rawMaps)
      )
    ]);

    return {
      kind: policy.kind,
      stableId: toStableId(policy.kind, policy.id),
      id: policy.id,
      title: policy.title,
      summary: policy.summary,
      contextId: policy.context,
      triggerMessageIds: [...policy.triggerMessages],
      emittedMessageIds: [...(policy.emittedMessages ?? [])],
      targetSystemIds: [...(policy.targetSystems ?? [])],
      coordinates: (policy.coordinates ?? []).map((coordinate) =>
        toSharedReference(
          coordinate,
          `${policyPath(policy.id)}/coordinates/${coordinate.kind}:${coordinate.id}`
        )
      ),
      relatedContextIds,
      path: policyPath(policy.id)
    };
  });
}

function createAnalysisMaps(
  ir: AnalysisIR,
  collector: DiagnosticCollector
): AnalysisMaps {
  return {
    contexts: indexById(ir.contextBoundaries, "Context", collector),
    actors: indexById(ir.actors, "Actor", collector),
    systems: indexById(ir.systems, "System", collector),
    scenarios: indexById(ir.scenarioSequences, "Scenario", collector),
    messages: indexById(ir.messageFlows, "Message", collector),
    aggregates: indexById(ir.aggregateLifecycles, "Aggregate", collector),
    policies: indexById(ir.policyCoordinations, "Policy", collector)
  };
}

function buildResourceRegistry(maps: AnalysisMaps): ReadonlySet<string> {
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

function toStableId(kind: ResourceKind, id: string): SharedStableId {
  return {
    family: "ddd-spec",
    kind,
    value: id
  };
}

function validateContextBoundary(
  context: ContextBoundary,
  collector: DiagnosticCollector,
  resourceRegistry: ReadonlySet<string>
): void {
  assertKind(context.kind, "context", `Context ${context.id}`, context.path, collector);

  if (context.owners.length === 0) {
    collector.push({
      severity: "error",
      code: "missing-context-owner",
      path: `${context.path}/owners`,
      message: `Context ${context.id} must declare at least one owner`
    });
  }

  reportDuplicateStrings(
    context.owners,
    `${context.path}/owners`,
    `context ${context.id} owners`,
    collector
  );
  reportDuplicateStrings(
    context.responsibilities,
    `${context.path}/responsibilities`,
    `context ${context.id} responsibilities`,
    collector
  );

  const relationshipIds = new Set<string>();

  for (const relationship of context.relationships) {
    if (relationshipIds.has(relationship.id)) {
      collector.push({
        severity: "error",
        code: "duplicate-local-id",
        path: relationship.path,
        message: `Duplicate relationship ${relationship.id} in context ${context.id}`
      });
      continue;
    }

    relationshipIds.add(relationship.id);
    assertAllowedResourceRefKind(
      ALLOWED_CONTEXT_RELATIONSHIP_TARGET_KINDS,
      relationship.target,
      `Context ${context.id} relationship ${relationship.id} target`,
      `${relationship.path}/target`,
      collector
    );
    assertKnownResourceRef(
      resourceRegistry,
      relationship.target,
      `Context ${context.id} relationship ${relationship.id} target`,
      `${relationship.path}/target`,
      collector
    );
  }
}

function validateSystemParticipant(
  system: SystemParticipant,
  collector: DiagnosticCollector
): void {
  assertKind(system.kind, "system", `System ${system.id}`, system.path, collector);
  reportDuplicateStrings(
    system.capabilities,
    `${system.path}/capabilities`,
    `system ${system.id} capabilities`,
    collector
  );
}

function validateScenarioSequence(
  scenario: ScenarioSequence,
  maps: AnalysisMaps,
  collector: DiagnosticCollector
): void {
  assertKind(
    scenario.kind,
    "scenario",
    `Scenario ${scenario.id}`,
    scenario.path,
    collector
  );

  if (!maps.contexts.has(scenario.ownerContextId)) {
    collector.push({
      severity: "error",
      code: "scenario-owner-context-missing",
      path: `${scenario.path}/ownerContext`,
      message: `Scenario ${scenario.id} ownerContext ${scenario.ownerContextId} must reference existing context`
    });
  }

  const stepMap = indexById(
    scenario.steps,
    `Scenario ${scenario.id} step`,
    collector
  );
  const incomingStepIds = new Set<string>();

  for (const step of scenario.steps) {
    validateScenarioStep(scenario, step, maps, stepMap, collector);

    for (const nextStepId of step.nextStepIds) {
      if (stepMap.has(nextStepId)) {
        incomingStepIds.add(nextStepId);
      }
    }
  }

  const ownerContextSteps = scenario.steps.filter(
    (step) => step.contextId === scenario.ownerContextId
  );

  if (ownerContextSteps.length === 0) {
    collector.push({
      severity: "error",
      code: "scenario-owner-context-unused",
      path: `${scenario.path}/steps`,
      message: `Scenario ${scenario.id} must include at least one step in ownerContext ${scenario.ownerContextId}`
    });
  }

  const entrySteps = scenario.steps.filter((step) => !incomingStepIds.has(step.id));

  if (entrySteps.length === 0) {
    collector.push({
      severity: "error",
      code: "scenario-entry-step-missing",
      path: `${scenario.path}/steps`,
      message: `Scenario ${scenario.id} must define at least one entry step`
    });
  }

  if (entrySteps.length > 1) {
    collector.push({
      severity: "error",
      code: "scenario-multiple-entry-steps",
      path: `${scenario.path}/steps`,
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
      path: `${scenario.path}/steps`,
      message: `Scenario ${scenario.id} must define at least one final step`
    });
  }

  const reachableStepIds =
    entrySteps.length === 1
      ? collectReachableScenarioStepIds(entrySteps[0], stepMap)
      : new Set<string>();

  for (const step of scenario.steps) {
    if (entrySteps.length === 1 && !reachableStepIds.has(step.id)) {
      collector.push({
        severity: "error",
        code: "scenario-step-unreachable",
        path: step.path,
        message: `Scenario ${scenario.id} step ${step.id} is unreachable from entry step ${entrySteps[0].id}`
      });
    }

    if (entrySteps.length === 1 && step.final && !reachableStepIds.has(step.id)) {
      collector.push({
        severity: "error",
        code: "scenario-final-step-unreachable",
        path: step.path,
        message: `Scenario ${scenario.id} final step ${step.id} cannot be reached from entry step ${entrySteps[0].id}`
      });
    }
  }
}

function validateScenarioStep(
  scenario: ScenarioSequence,
  step: ScenarioStep,
  maps: AnalysisMaps,
  stepMap: ReadonlyMap<string, ScenarioStep>,
  collector: DiagnosticCollector
): void {
  if (!maps.contexts.has(step.contextId)) {
    collector.push({
      severity: "error",
      code: "unknown-resource-reference",
      path: `${step.path}/context`,
      message: `Scenario ${scenario.id} step ${step.id} context ${step.contextId} must reference existing context`
    });
  }

  if (step.actorId && !maps.actors.has(step.actorId)) {
    collector.push({
      severity: "error",
      code: "unknown-resource-reference",
      path: `${step.path}/actor`,
      message: `Scenario ${scenario.id} step ${step.id} actor ${step.actorId} must reference existing actor`
    });
  }

  if (step.systemId && !maps.systems.has(step.systemId)) {
    collector.push({
      severity: "error",
      code: "unknown-resource-reference",
      path: `${step.path}/system`,
      message: `Scenario ${scenario.id} step ${step.id} system ${step.systemId} must reference existing system`
    });
  }

  if (step.final && !step.outcome) {
    collector.push({
      severity: "error",
      code: "missing-required-link",
      path: `${step.path}/outcome`,
      message: `Scenario ${scenario.id} final step ${step.id} must define outcome`
    });
  }

  if (!step.final && step.outcome) {
    collector.push({
      severity: "error",
      code: "missing-required-link",
      path: `${step.path}/outcome`,
      message: `Scenario ${scenario.id} non-final step ${step.id} cannot define outcome`
    });
  }

  if (step.final && step.nextStepIds.length > 0) {
    collector.push({
      severity: "error",
      code: "missing-required-link",
      path: `${step.path}/next`,
      message: `Scenario ${scenario.id} final step ${step.id} cannot define next`
    });
  }

  if (!step.final && step.nextStepIds.length === 0) {
    collector.push({
      severity: "error",
      code: "scenario-step-next-missing",
      path: `${step.path}/next`,
      message: `Scenario ${scenario.id} non-final step ${step.id} must define at least one next step`
    });
  }

  reportDuplicateStrings(
    step.incomingMessageIds,
    `${step.path}/incomingMessages`,
    `scenario ${scenario.id} step ${step.id} incomingMessages`,
    collector
  );
  reportDuplicateStrings(
    step.outgoingMessageIds,
    `${step.path}/outgoingMessages`,
    `scenario ${scenario.id} step ${step.id} outgoingMessages`,
    collector
  );
  reportDuplicateStrings(
    step.nextStepIds,
    `${step.path}/next`,
    `scenario ${scenario.id} step ${step.id} next`,
    collector
  );

  for (const messageId of step.incomingMessageIds) {
    const message = maps.messages.get(messageId);

    if (!message) {
      collector.push({
        severity: "error",
        code: "unknown-resource-reference",
        path: `${step.path}/incomingMessages/${messageId}`,
        message: `Scenario ${scenario.id} step ${step.id} incoming message ${messageId} must reference existing message`
      });
      continue;
    }

    if (!stepCanReceiveMessage(scenario, step, message, maps)) {
      collector.push({
        severity: "error",
        code: "scenario-message-link-broken",
        path: `${step.path}/incomingMessages/${messageId}`,
        message: `Scenario ${scenario.id} step ${step.id} incoming message ${messageId} is not linked to the step or its owner context`
      });
    }
  }

  for (const messageId of step.outgoingMessageIds) {
    const message = maps.messages.get(messageId);

    if (!message) {
      collector.push({
        severity: "error",
        code: "unknown-resource-reference",
        path: `${step.path}/outgoingMessages/${messageId}`,
        message: `Scenario ${scenario.id} step ${step.id} outgoing message ${messageId} must reference existing message`
      });
      continue;
    }

    if (!stepCanProduceMessage(scenario, step, message, maps)) {
      collector.push({
        severity: "error",
        code: "scenario-message-link-broken",
        path: `${step.path}/outgoingMessages/${messageId}`,
        message: `Scenario ${scenario.id} step ${step.id} outgoing message ${messageId} is not linked to the step or its owner context`
      });
    }
  }

  for (const nextStepId of step.nextStepIds) {
    if (!stepMap.has(nextStepId)) {
      collector.push({
        severity: "error",
        code: "unknown-resource-reference",
        path: `${step.path}/next/${nextStepId}`,
        message: `Scenario ${scenario.id} step ${step.id} next ${nextStepId} must reference existing step`
      });
    }
  }
}

function validateMessageFlow(
  message: MessageFlow,
  maps: AnalysisMaps,
  collector: DiagnosticCollector,
  resourceRegistry: ReadonlySet<string>
): void {
  assertKind(message.kind, "message", `Message ${message.id}`, message.path, collector);

  validateMessageRefs(
    resourceRegistry,
    message.producers,
    ALLOWED_MESSAGE_ENDPOINT_KINDS,
    `Message ${message.id} producer`,
    collector
  );
  validateMessageRefs(
    resourceRegistry,
    message.consumers,
    ALLOWED_MESSAGE_ENDPOINT_KINDS,
    `Message ${message.id} consumer`,
    collector
  );

  reportDuplicateStrings(
    message.payload.map((field) => field.id),
    `${message.path}/payload`,
    `message ${message.id} payload`,
    collector
  );
  validatePayload(message.payload, `Message ${message.id}`, message.path, collector);

  if (message.producerContextIds.length > 1) {
    collector.push({
      severity: "error",
      code: "ambiguous-message-ownership",
      path: `${message.path}/producers`,
      message: `Message ${message.id} producers span multiple contexts: ${message.producerContextIds.join(", ")}`
    });
  }

  validateScenarioBacklinks(message, maps, collector);
}

function validateAggregateLifecycle(
  aggregate: AggregateLifecycle,
  maps: AnalysisMaps,
  collector: DiagnosticCollector
): void {
  assertKind(
    aggregate.kind,
    "aggregate",
    `Aggregate ${aggregate.id}`,
    aggregate.path,
    collector
  );

  if (!maps.contexts.has(aggregate.contextId)) {
    collector.push({
      severity: "error",
      code: "unknown-resource-reference",
      path: `${aggregate.path}/context`,
      message: `Aggregate ${aggregate.id} context ${aggregate.contextId} must reference existing context`
    });
  }

  reportDuplicateStrings(
    aggregate.states.map((state) => state.id),
    `${aggregate.path}/states`,
    `aggregate ${aggregate.id} states`,
    collector
  );

  const hasValidInitialState = aggregate.states.some(
    (state) => state.id === aggregate.initialState
  );

  if (!hasValidInitialState) {
    collector.push({
      severity: "error",
      code: "aggregate-initial-state-invalid",
      path: `${aggregate.path}/initialState`,
      message: `Aggregate ${aggregate.id} initialState ${aggregate.initialState} must belong to states`
    });
  }

  const transitionIds = new Set<string>();
  const stateIds = new Set(aggregate.states.map((state) => state.id));

  if (hasValidInitialState) {
    for (const state of aggregate.states) {
      if (state.reachableFromInitial) {
        continue;
      }

      collector.push({
        severity: "error",
        code: "aggregate-state-unreachable",
        path: state.path,
        message: `Aggregate ${aggregate.id} state ${state.id} is unreachable from initialState ${aggregate.initialState}`
      });
    }
  }

  for (const transition of aggregate.transitions) {
    if (transitionIds.has(transition.id)) {
      collector.push({
        severity: "error",
        code: "duplicate-local-id",
        path: transition.path,
        message: `Duplicate transition ${transition.id} in aggregate ${aggregate.id}`
      });
      continue;
    }

    transitionIds.add(transition.id);

    if (!stateIds.has(transition.fromStateId)) {
      collector.push({
        severity: "error",
        code: "aggregate-transition-state-invalid",
        path: `${transition.path}/from`,
        message: `Aggregate ${aggregate.id} transition ${transition.id} from ${transition.fromStateId} must belong to states`
      });
    }

    if (!stateIds.has(transition.toStateId)) {
      collector.push({
        severity: "error",
        code: "aggregate-transition-state-invalid",
        path: `${transition.path}/to`,
        message: `Aggregate ${aggregate.id} transition ${transition.id} to ${transition.toStateId} must belong to states`
      });
    }

    const triggeringMessage = maps.messages.get(transition.onMessageId);

    if (!triggeringMessage) {
      collector.push({
        severity: "error",
        code: "aggregate-transition-trigger-missing",
        path: `${transition.path}/onMessage`,
        message: `Aggregate ${aggregate.id} transition ${transition.id} onMessage ${transition.onMessageId} must reference existing message`
      });
    } else if (!hasResourceEndpoint(triggeringMessage.consumers, "aggregate", aggregate.id)) {
      collector.push({
        severity: "error",
        code: "aggregate-transition-trigger-consumer-mismatch",
        path: `${transition.path}/onMessage`,
        message: `Aggregate ${aggregate.id} transition ${transition.id} onMessage ${transition.onMessageId} must list aggregate ${aggregate.id} as a consumer`
      });
    }

    reportDuplicateStrings(
      transition.emittedMessageIds,
      `${transition.path}/emits`,
      `aggregate ${aggregate.id} transition ${transition.id} emits`,
      collector
    );

    for (const emittedMessageId of transition.emittedMessageIds) {
      const emittedMessage = maps.messages.get(emittedMessageId);

      if (!emittedMessage) {
        collector.push({
          severity: "error",
          code: "aggregate-transition-emitted-message-missing",
          path: `${transition.path}/emits/${emittedMessageId}`,
          message: `Aggregate ${aggregate.id} transition ${transition.id} emits ${emittedMessageId}, but that message does not exist`
        });
        continue;
      }

      if (!hasResourceEndpoint(emittedMessage.producers, "aggregate", aggregate.id)) {
        collector.push({
          severity: "error",
          code: "aggregate-transition-emitted-producer-mismatch",
          path: `${transition.path}/emits/${emittedMessageId}`,
          message: `Aggregate ${aggregate.id} transition ${transition.id} emitted message ${emittedMessageId} must list aggregate ${aggregate.id} as a producer`
        });
      }
    }
  }
}

function validatePolicyCoordination(
  policy: PolicyCoordination,
  maps: AnalysisMaps,
  collector: DiagnosticCollector,
  resourceRegistry: ReadonlySet<string>
): void {
  assertKind(policy.kind, "policy", `Policy ${policy.id}`, policy.path, collector);

  if (policy.contextId && !maps.contexts.has(policy.contextId)) {
    collector.push({
      severity: "error",
      code: "unknown-resource-reference",
      path: `${policy.path}/context`,
      message: `Policy ${policy.id} context ${policy.contextId} must reference existing context`
    });
  }

  reportDuplicateStrings(
    policy.triggerMessageIds,
    `${policy.path}/triggerMessages`,
    `policy ${policy.id} triggerMessages`,
    collector
  );

  for (const messageId of policy.triggerMessageIds) {
    const message = maps.messages.get(messageId);

    if (!message) {
      collector.push({
        severity: "error",
        code: "policy-trigger-message-missing",
        path: `${policy.path}/triggerMessages/${messageId}`,
        message: `Policy ${policy.id} trigger message ${messageId} must reference existing message`
      });
      continue;
    }

    if (!hasResourceEndpoint(message.consumers, "policy", policy.id)) {
      collector.push({
        severity: "error",
        code: "policy-trigger-consumer-mismatch",
        path: `${policy.path}/triggerMessages/${messageId}`,
        message: `Policy ${policy.id} trigger message ${messageId} must list policy ${policy.id} as a consumer`
      });
    }
  }

  reportDuplicateStrings(
    policy.emittedMessageIds,
    `${policy.path}/emittedMessages`,
    `policy ${policy.id} emittedMessages`,
    collector
  );

  if (policy.emittedMessageIds.length === 0) {
    collector.push({
      severity: "error",
      code: "policy-outcome-missing",
      path: `${policy.path}/emittedMessages`,
      message: `Policy ${policy.id} must declare at least one emitted message to describe its outcome`
    });
  }

  const emittedMessageConsumerIds = new Set<string>();

  for (const messageId of policy.emittedMessageIds) {
    const emittedMessage = maps.messages.get(messageId);

    if (!emittedMessage) {
      collector.push({
        severity: "error",
        code: "policy-emitted-message-missing",
        path: `${policy.path}/emittedMessages/${messageId}`,
        message: `Policy ${policy.id} emitted message ${messageId} must reference existing message`
      });
      continue;
    }

    if (!hasResourceEndpoint(emittedMessage.producers, "policy", policy.id)) {
      collector.push({
        severity: "error",
        code: "policy-emitted-producer-mismatch",
        path: `${policy.path}/emittedMessages/${messageId}`,
        message: `Policy ${policy.id} emitted message ${messageId} must list policy ${policy.id} as a producer`
      });
    }

    for (const consumer of emittedMessage.consumers) {
      if (consumer.target.kind === "system") {
        emittedMessageConsumerIds.add(consumer.target.value);
      }
    }
  }

  reportDuplicateStrings(
    policy.targetSystemIds,
    `${policy.path}/targetSystems`,
    `policy ${policy.id} targetSystems`,
    collector
  );

  for (const systemId of policy.targetSystemIds) {
    if (!maps.systems.has(systemId)) {
      collector.push({
        severity: "error",
        code: "unknown-resource-reference",
        path: `${policy.path}/targetSystems/${systemId}`,
        message: `Policy ${policy.id} target system ${systemId} must reference existing system`
      });
      continue;
    }

    if (policy.emittedMessageIds.length > 0 && !emittedMessageConsumerIds.has(systemId)) {
      collector.push({
        severity: "error",
        code: "policy-target-system-mismatch",
        path: `${policy.path}/targetSystems/${systemId}`,
        message: `Policy ${policy.id} target system ${systemId} must appear as a consumer of at least one emitted message`
      });
    }
  }

  for (const coordinate of policy.coordinates) {
    assertAllowedResourceRefKind(
      ALLOWED_POLICY_COORDINATE_KINDS,
      coordinate,
      `Policy ${policy.id} coordinate`,
      `${policy.path}/coordinates/${coordinate.target.kind}:${coordinate.target.value}`,
      collector
    );
    assertKnownResourceRef(
      resourceRegistry,
      coordinate,
      `Policy ${policy.id} coordinate`,
      `${policy.path}/coordinates/${coordinate.target.kind}:${coordinate.target.value}`,
      collector
    );
  }
}

function validateMessageRefs(
  resourceRegistry: ReadonlySet<string>,
  refs: readonly MessageEndpoint[],
  allowedKinds: ReadonlySet<ResourceKind>,
  label: string,
  collector: DiagnosticCollector
): void {
  const seenRefs = new Set<string>();

  for (const ref of refs) {
    const key = toResourceKey(ref.target.kind as ResourceKind, ref.target.value);

    if (seenRefs.has(key)) {
      collector.push({
        severity: "error",
        code: "duplicate-array-value",
        path: ref.path,
        message: `Duplicate ${label} ${ref.target.kind} ${ref.target.value}`
      });
      continue;
    }

    seenRefs.add(key);
    assertAllowedResourceRefKind(allowedKinds, ref, label, ref.path, collector);
    assertKnownResourceRef(resourceRegistry, ref, label, ref.path, collector);
  }
}

function validatePayload(
  payload: readonly PayloadFieldSpec[],
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
  message: MessageFlow,
  maps: AnalysisMaps,
  collector: DiagnosticCollector
): void {
  for (const producer of message.producers) {
    if (producer.target.kind !== "scenario") {
      continue;
    }

    const scenario = maps.scenarios.get(producer.target.value);

    if (!scenario) {
      continue;
    }

    const linked = scenario.steps.some((step) => step.outgoingMessageIds.includes(message.id));

    if (!linked) {
      collector.push({
        severity: "error",
        code: "scenario-message-link-broken",
        path: producer.path,
        message: `Message ${message.id} producer scenario ${scenario.id} must reference the message from at least one outgoing step`
      });
    }
  }

  for (const consumer of message.consumers) {
    if (consumer.target.kind !== "scenario") {
      continue;
    }

    const scenario = maps.scenarios.get(consumer.target.value);

    if (!scenario) {
      continue;
    }

    const linked = scenario.steps.some((step) => step.incomingMessageIds.includes(message.id));

    if (!linked) {
      collector.push({
        severity: "error",
        code: "scenario-message-link-broken",
        path: consumer.path,
        message: `Message ${message.id} consumer scenario ${scenario.id} must reference the message from at least one incoming step`
      });
    }
  }
}

function collectReachableStepIds(
  entryStep: ScenarioStepSpec,
  stepMap: ReadonlyMap<string, ScenarioStepSpec>
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

function collectReachableScenarioStepIds(
  entryStep: ScenarioStep,
  stepMap: ReadonlyMap<string, ScenarioStep>
): ReadonlySet<string> {
  const visited = new Set<string>();
  const queue = [entryStep];

  while (queue.length > 0) {
    const currentStep = queue.shift();

    if (!currentStep || visited.has(currentStep.id)) {
      continue;
    }

    visited.add(currentStep.id);

    for (const nextStepId of currentStep.nextStepIds) {
      const nextStep = stepMap.get(nextStepId);

      if (nextStep && !visited.has(nextStep.id)) {
        queue.push(nextStep);
      }
    }
  }

  return visited;
}

function stepCanReceiveMessage(
  scenario: ScenarioSequence,
  step: ScenarioStep,
  message: MessageFlow,
  maps: AnalysisMaps
): boolean {
  return message.consumers.some((consumer) =>
    isStepCompatibleRef(consumer, scenario, step, maps)
  );
}

function stepCanProduceMessage(
  scenario: ScenarioSequence,
  step: ScenarioStep,
  message: MessageFlow,
  maps: AnalysisMaps
): boolean {
  return message.producers.some((producer) =>
    isStepCompatibleRef(producer, scenario, step, maps)
  );
}

function isStepCompatibleRef(
  ref: ResourceRef | MessageEndpoint,
  scenario: ScenarioSequence,
  step: ScenarioStep,
  maps: AnalysisMaps
): boolean {
  const resourceRef = toResourceRef(ref);

  if (resourceRef.kind === "scenario") {
    return resourceRef.id === scenario.id;
  }

  if (resourceRef.kind === "context") {
    return resourceRef.id === step.contextId;
  }

  if (resourceRef.kind === "actor") {
    return step.actorId === resourceRef.id;
  }

  if (resourceRef.kind === "system") {
    return step.systemId === resourceRef.id;
  }

  if (resourceRef.kind === "aggregate") {
    return maps.aggregates.get(resourceRef.id)?.contextId === step.contextId;
  }

  if (resourceRef.kind === "policy") {
    return maps.policies.get(resourceRef.id)?.contextId === step.contextId;
  }

  return false;
}

function resolveRawResourceContext(
  ref: ResourceRef | SharedReference | MessageEndpoint,
  rawMaps: RawResourceMaps
): string | undefined {
  const resourceRef = toResourceRef(ref);

  if (resourceRef.kind === "context") {
    return resourceRef.id;
  }

  if (resourceRef.kind === "scenario") {
    return rawMaps.scenarios.get(resourceRef.id)?.ownerContext;
  }

  if (resourceRef.kind === "aggregate") {
    return rawMaps.aggregates.get(resourceRef.id)?.context;
  }

  if (resourceRef.kind === "policy") {
    return rawMaps.policies.get(resourceRef.id)?.context;
  }

  return undefined;
}

function firstById<Value extends { id: string }>(
  values: readonly Value[]
): ReadonlyMap<string, Value> {
  const entries = new Map<string, Value>();

  for (const value of values) {
    if (!entries.has(value.id)) {
      entries.set(value.id, value);
    }
  }

  return entries;
}

function indexById<Value extends { id: string; path: string }>(
  values: readonly Value[],
  label: string,
  collector: DiagnosticCollector
): ReadonlyMap<string, Value> {
  const entries = new Map<string, Value>();

  for (const value of values) {
    if (entries.has(value.id)) {
      collector.push({
        severity: "error",
        code: "duplicate-resource-id",
        path: value.path,
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
  kind: ResourceKind,
  values: ReadonlyMap<string, Value>
): void {
  for (const value of values.values()) {
    registry.add(toResourceKey(kind, value.id));
  }
}

function hasResourceEndpoint(
  refs: readonly MessageEndpoint[],
  kind: ResourceKind,
  id: string
): boolean {
  return refs.some(
    (ref) => ref.target.kind === kind && ref.target.value === id
  );
}

function assertKnownResourceRef(
  resourceRegistry: ReadonlySet<string>,
  ref: ResourceRef | SharedReference,
  label: string,
  path: string,
  collector: DiagnosticCollector
): void {
  const resourceRef = toResourceRef(ref);

  if (!resourceRegistry.has(toResourceKey(resourceRef.kind, resourceRef.id))) {
    collector.push({
      severity: "error",
      code: "unknown-resource-reference",
      path,
      message: `${label} ${resourceRef.kind} ${resourceRef.id} must reference existing ${resourceRef.kind}`
    });
  }
}

function assertAllowedResourceRefKind(
  allowedKinds: ReadonlySet<ResourceKind>,
  ref: ResourceRef | SharedReference,
  label: string,
  path: string,
  collector: DiagnosticCollector
): void {
  const resourceRef = toResourceRef(ref);

  if (allowedKinds.has(resourceRef.kind)) {
    return;
  }

  collector.push({
      severity: "error",
      code: "unsupported-resource-kind-reference",
      path,
      message: `${label} kind ${resourceRef.kind} is not allowed here; expected one of ${[
        ...allowedKinds
      ].join(", ")}`
    });
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

function toScenarioStep(
  step: ScenarioStepSpec,
  scenarioId: string,
  incomingStepIds: ReadonlySet<string>,
  reachableStepIds: ReadonlySet<string>
): ScenarioStep {
  return {
    id: step.id,
    title: step.title,
    contextId: step.context,
    actorId: step.actor,
    systemId: step.system,
    incomingMessageIds: [...(step.incomingMessages ?? [])],
    outgoingMessageIds: [...(step.outgoingMessages ?? [])],
    nextStepIds: [...(step.next ?? [])],
    final: Boolean(step.final),
    outcome: step.outcome,
    entry: !incomingStepIds.has(step.id),
    reachableFromEntry: reachableStepIds.has(step.id),
    path: scenarioStepPath(scenarioId, step.id)
  };
}

function toContextBoundaryRelationship(
  contextId: string,
  relationship: ContextRelationshipSpec
): ContextBoundaryRelationship {
  return {
    id: relationship.id,
    kind: relationship.kind,
    target: toSharedReference(
      relationship.target,
      `${contextPath(contextId, `/relationships/${relationship.id}`)}/target`
    ),
    direction: relationship.direction,
    integration: relationship.integration,
    description: relationship.description,
    path: contextPath(contextId, `/relationships/${relationship.id}`)
  };
}

function toMessageEndpoint(
  messageId: string,
  side: "producers" | "consumers",
  ref: ResourceRef,
  rawMaps: RawResourceMaps
): MessageEndpoint {
  return {
    target: toStableId(ref.kind, ref.id),
    contextId: resolveRawResourceContext(ref, rawMaps),
    path: messagePath(messageId, `/${side}/${ref.kind}:${ref.id}`)
  };
}

function collectMessageStepLinks(
  scenarios: readonly ScenarioSpec[],
  messageId: string
): readonly MessageStepLink[] {
  return scenarios.flatMap((scenario) =>
    scenario.steps.flatMap((step) => {
      const links: MessageStepLink[] = [];

      if (step.incomingMessages?.includes(messageId)) {
        links.push({
          scenarioId: scenario.id,
          stepId: step.id,
          contextId: step.context,
          direction: "incoming",
          path: scenarioStepPath(scenario.id, step.id, `/incomingMessages/${messageId}`)
        });
      }

      if (step.outgoingMessages?.includes(messageId)) {
        links.push({
          scenarioId: scenario.id,
          stepId: step.id,
          contextId: step.context,
          direction: "outgoing",
          path: scenarioStepPath(scenario.id, step.id, `/outgoingMessages/${messageId}`)
        });
      }

      return links;
    })
  );
}

function collectSystemIdsForContext(
  message: MessageFlow,
  contextId: string
): readonly string[] {
  const systemIds: string[] = [];

  if (message.producerContextIds.includes(contextId)) {
    for (const consumer of message.consumers) {
      if (consumer.target.kind === "system") {
        systemIds.push(consumer.target.value);
      }
    }
  }

  if (message.consumerContextIds.includes(contextId)) {
    for (const producer of message.producers) {
      if (producer.target.kind === "system") {
        systemIds.push(producer.target.value);
      }
    }
  }

  return unique(systemIds);
}

function collectMessageContextIds(
  message: MessageSpec | undefined,
  rawMaps: RawResourceMaps
): readonly string[] {
  if (!message) {
    return [];
  }

  return uniqueDefined([
    ...message.producers.map((producer) => resolveRawResourceContext(producer, rawMaps)),
    ...message.consumers.map((consumer) => resolveRawResourceContext(consumer, rawMaps))
  ]);
}

function hasCrossContextFlow(
  producerContextIds: readonly string[],
  consumerContextIds: readonly string[]
): boolean {
  const allContextIds = unique([...producerContextIds, ...consumerContextIds]);

  return allContextIds.length > 1;
}

function collectReachableNodeIds(
  roots: readonly string[],
  adjacency: ReadonlyMap<string, readonly string[]>
): readonly string[] {
  const visited = new Set<string>();
  const queue = [...roots];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);

    for (const next of adjacency.get(current) ?? []) {
      if (!visited.has(next)) {
        queue.push(next);
      }
    }
  }

  return [...visited];
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function uniqueDefined(
  values: readonly (string | undefined)[]
): readonly string[] {
  return unique(values.filter((value): value is string => typeof value === "string"));
}

function toResourceKey(kind: ResourceKind, id: string): string {
  return `${kind}:${id}`;
}

function toSharedReference(ref: ResourceRef, path: string): SharedReference {
  return {
    target: toStableId(ref.kind, ref.id),
    path
  };
}

function toResourceRef(ref: ResourceRef | SharedReference): ResourceRef {
  if ("target" in ref) {
    return {
      kind: ref.target.kind as ResourceKind,
      id: ref.target.value
    };
  }

  return ref;
}

function formatDiagnostics(diagnostics: readonly AnalysisDiagnostic[]): string {
  return [
    `Domain model semantic validation failed with ${diagnostics.length} error(s):`,
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
