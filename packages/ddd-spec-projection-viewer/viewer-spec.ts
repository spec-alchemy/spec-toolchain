import type {
  ActorParticipant,
  AggregateLifecycle,
  BusinessSpec,
  BusinessSpecAnalysis,
  ContextBoundary,
  LifecycleTransition,
  MessageFlow,
  MessageKind,
  MessageStepLink,
  PolicyCoordination,
  ScenarioSequence,
  ScenarioStep,
  SystemParticipant
} from "../ddd-spec-core/index.js";
import { projectLifecycle } from "../ddd-spec-core/index.js";
import type {
  BusinessViewerSpec,
  ViewerDetailItem,
  ViewerDetailValue,
  ViewerLocale,
  ViewerNodeSpec,
  ViewerViewSpec
} from "../ddd-spec-viewer-contract/index.js";
import {
  BUSINESS_VIEWER_SPEC_VERSION,
  DEFAULT_VIEWER_LOCALE
} from "../ddd-spec-viewer-contract/index.js";
import {
  getViewerProjectionCopy,
  localizeViewerActorType,
  localizeViewerDependencyKind,
  localizeViewerMessageChannel,
  localizeViewerMessageKind,
  localizeViewerRelationshipDirection,
  localizeViewerRelationshipIntegration,
  localizeViewerRelationshipKind,
  localizeViewerStepLinkDirection,
  localizeViewerSystemBoundary,
  type ViewerSemanticKey
} from "./viewer-i18n.js";

const DIMENSIONS = {
  contextGroup: { width: 360, minHeight: 240, charsPerLine: 32, minHeaderHeight: 120 },
  scenarioGroup: { width: 320, minHeight: 220, charsPerLine: 28, minHeaderHeight: 116 },
  aggregateGroup: { width: 280, minHeight: 180, charsPerLine: 24, minHeaderHeight: 112 },
  step: { width: 220, minHeight: 112, charsPerLine: 20 },
  finalStep: { width: 220, minHeight: 100, charsPerLine: 20 },
  message: { width: 228, minHeight: 96, charsPerLine: 19 },
  actor: { width: 208, minHeight: 92, charsPerLine: 18 },
  system: { width: 220, minHeight: 96, charsPerLine: 20 },
  policy: { width: 220, minHeight: 96, charsPerLine: 20 },
  aggregate: { width: 220, minHeight: 96, charsPerLine: 20 },
  lifecycleState: { width: 180, minHeight: 96, charsPerLine: 16 }
} as const;

export function buildViewerSpec(
  spec: BusinessSpec,
  analysis: BusinessSpecAnalysis,
  locale: ViewerLocale = DEFAULT_VIEWER_LOCALE
): BusinessViewerSpec {
  const copy = getViewerProjectionCopy(locale);
  const views: ViewerViewSpec[] = [
    buildContextMapView(analysis, locale),
    buildScenarioStoryView(analysis, locale),
    buildMessageFlowView(analysis, locale),
    buildLifecycleView(analysis, locale)
  ];

  if (analysis.ir.policyCoordinations.length > 0) {
    views.push(buildPolicySagaView(analysis, locale));
  }

  return {
    viewerVersion: BUSINESS_VIEWER_SPEC_VERSION,
    specId: spec.id,
    title: spec.title,
    summary: spec.summary,
    detailHelp: {
      semantic: Object.fromEntries(
        Object.entries(copy.detailSemantics).map(([semanticKey, semantic]) => [
          semanticKey,
          semantic.description
        ])
      )
    },
    views
  };
}

function buildContextMapView(
  analysis: BusinessSpecAnalysis,
  locale: ViewerLocale
): ViewerViewSpec {
  const copy = getViewerProjectionCopy(locale);
  const nodes: ViewerNodeSpec[] = [];
  const edges: ViewerViewSpec["edges"][number][] = [];
  const aggregateById = toMap(analysis.ir.aggregateLifecycles, (aggregate) => aggregate.id);
  const scenarioById = toMap(analysis.ir.scenarioSequences, (scenario) => scenario.id);
  const policyById = toMap(analysis.ir.policyCoordinations, (policy) => policy.id);

  for (const context of analysis.ir.contextBoundaries) {
    const contextSummary = copy.summaries.context(
      context.aggregateIds.length,
      context.scenarioIds.length,
      context.policyIds.length
    );
    const box = measureGroupNodeBox(
      DIMENSIONS.contextGroup,
      context.title,
      context.id,
      contextSummary
    );

    nodes.push({
      id: toContextMapContextId(context.id),
      kind: "context",
      label: context.title,
      subtitle: context.id,
      summary: contextSummary,
      ...box,
      details: [
        detail(locale, "context.id", context.id),
        detail(locale, "context.owners", formatTextList(locale, context.owners)),
        detail(locale, "context.responsibilities", formatTextList(locale, context.responsibilities)),
        detail(locale, "context.owned_aggregates", formatTextList(locale, context.aggregateIds)),
        detail(locale, "context.scenarios", formatTextList(locale, context.scenarioIds)),
        detail(locale, "context.related_actors", formatTextList(locale, context.actorIds)),
        detail(locale, "context.related_systems", formatTextList(locale, context.systemIds)),
        detail(locale, "context.relationships", formatContextRelationships(locale, context))
      ]
    });

    for (const aggregateId of context.aggregateIds) {
      const aggregate = mustGet(aggregateById, aggregateId, "aggregate");
      const aggregateBox = measureLeafNodeBox(
        DIMENSIONS.aggregate,
        aggregate.title,
        aggregate.id,
        copy.summaries.aggregateInitial(aggregate.initialState)
      );

      nodes.push({
        id: toContextMapAggregateId(aggregate.id),
        kind: "aggregate",
        label: aggregate.title,
        subtitle: aggregate.id,
        summary: copy.summaries.aggregateInitial(aggregate.initialState),
        parentId: toContextMapContextId(context.id),
        ...aggregateBox,
        details: buildAggregateDetails(aggregate, locale)
      });

      edges.push({
        id: `context-map:ownership:context:${context.id}:aggregate:${aggregate.id}`,
        kind: "ownership",
        source: toContextMapContextId(context.id),
        target: toContextMapAggregateId(aggregate.id),
        label: copy.edgeLabels.owns,
        details: [
          detail(locale, "context.id", context.id),
          detail(locale, "aggregate.id", aggregate.id)
        ]
      });
    }

    for (const scenarioId of context.scenarioIds) {
      const scenario = mustGet(scenarioById, scenarioId, "scenario");
      const scenarioBox = measureLeafNodeBox(
        DIMENSIONS.actor,
        scenario.title,
        scenario.id,
        copy.summaries.scenarioGoal(scenario.goal)
      );

      nodes.push({
        id: toContextMapScenarioId(scenario.id),
        kind: "scenario",
        label: scenario.title,
        subtitle: scenario.id,
        summary: copy.summaries.scenarioGoal(scenario.goal),
        parentId: toContextMapContextId(context.id),
        ...scenarioBox,
        details: buildScenarioDetails(scenario, locale)
      });

      edges.push({
        id: `context-map:ownership:context:${context.id}:scenario:${scenario.id}`,
        kind: "ownership",
        source: toContextMapContextId(context.id),
        target: toContextMapScenarioId(scenario.id),
        label: copy.edgeLabels.owns,
        details: [
          detail(locale, "context.id", context.id),
          detail(locale, "scenario.id", scenario.id)
        ]
      });
    }

    for (const policyId of context.policyIds) {
      const policy = mustGet(policyById, policyId, "policy");
      const policySummary = copy.summaries.policy(
        policy.triggerMessageIds.length,
        policy.emittedMessageIds.length
      );
      const policyBox = measureLeafNodeBox(
        DIMENSIONS.policy,
        policy.title,
        policy.id,
        policySummary
      );

      nodes.push({
        id: toContextMapPolicyId(policy.id),
        kind: "policy",
        label: policy.title,
        subtitle: policy.id,
        summary: policySummary,
        parentId: toContextMapContextId(context.id),
        ...policyBox,
        details: buildPolicyDetails(policy, locale)
      });

      edges.push({
        id: `context-map:ownership:context:${context.id}:policy:${policy.id}`,
        kind: "ownership",
        source: toContextMapContextId(context.id),
        target: toContextMapPolicyId(policy.id),
        label: copy.edgeLabels.owns,
        details: [
          detail(locale, "context.id", context.id),
          detail(locale, "policy.id", policy.id)
        ]
      });
    }
  }

  for (const actor of analysis.ir.actors) {
    const actorSummary = copy.summaries.actorContextsSteps(
      actor.contextIds.length,
      actor.stepRefs.length
    );
    const box = measureLeafNodeBox(
      DIMENSIONS.actor,
      actor.title,
      actor.id,
      actorSummary
    );

    nodes.push({
      id: toContextMapActorId(actor.id),
      kind: "actor",
      label: actor.title,
      subtitle: actor.id,
      summary: actorSummary,
      ...box,
      details: buildActorDetails(actor, locale)
    });

    for (const contextId of actor.contextIds) {
      edges.push({
        id: `context-map:collaboration:actor:${actor.id}:context:${contextId}`,
        kind: "collaboration",
        source: toContextMapActorId(actor.id),
        target: toContextMapContextId(contextId),
        label: copy.edgeLabels.participates,
        details: [
          detail(locale, "step.actor", actor.id),
          detail(locale, "context.id", contextId)
        ]
      });
    }
  }

  for (const system of analysis.ir.systems) {
    const boundarySummary = localizeViewerSystemBoundary(
      locale,
      system.boundary ?? copy.values.internal
    );
    const box = measureLeafNodeBox(
      DIMENSIONS.system,
      system.title,
      system.id,
      boundarySummary
    );

    nodes.push({
      id: toContextMapSystemId(system.id),
      kind: "system",
      label: system.title,
      subtitle: system.id,
      summary: boundarySummary,
      ...box,
      details: buildSystemDetails(system, locale)
    });

    for (const contextId of system.contextIds) {
      edges.push({
        id: `context-map:collaboration:system:${system.id}:context:${contextId}`,
        kind: "collaboration",
        source: toContextMapSystemId(system.id),
        target: toContextMapContextId(contextId),
        label: copy.edgeLabels.touches,
        details: [
          detail(locale, "system.contexts", formatTextList(locale, [contextId])),
          detail(locale, "context.id", contextId)
        ]
      });
    }
  }

  for (const context of analysis.ir.contextBoundaries) {
    for (const relationship of context.relationships) {
      const targetId = toContextMapTargetId(
        relationship.target.target.kind,
        relationship.target.target.value
      );

      if (!targetId) {
        continue;
      }

      edges.push({
        id: `context-map:relationship:${context.id}:${relationship.id}`,
        kind: "collaboration",
        source: toContextMapContextId(context.id),
        target: targetId,
        label: localizeViewerRelationshipKind(locale, relationship.kind),
        ...(relationship.description ? { description: relationship.description } : {}),
        details: [
          detail(locale, "context.id", context.id),
          detail(locale, "relation.from", context.id),
          detail(
            locale,
            "relation.to",
            `${relationship.target.target.kind}:${relationship.target.target.value}`
          ),
          detail(locale, "context.relationships", formatContextRelationship(locale, relationship))
        ]
      });
    }
  }

  return {
    id: "context-map",
    kind: "context-map",
    navigation: {
      tier: "primary",
      order: 10,
      default: true
    },
    title: copy.views.contextMap.title,
    description: copy.views.contextMap.description,
    nodes,
    edges
  };
}

function buildScenarioStoryView(
  analysis: BusinessSpecAnalysis,
  locale: ViewerLocale
): ViewerViewSpec {
  const copy = getViewerProjectionCopy(locale);
  const nodes: ViewerNodeSpec[] = [];
  const edges: ViewerViewSpec["edges"][number][] = [];

  for (const scenario of analysis.ir.scenarioSequences) {
    const groupSummary = copy.summaries.scenarioGoal(scenario.goal);
    const groupBox = measureGroupNodeBox(
      DIMENSIONS.scenarioGroup,
      scenario.title,
      scenario.id,
      groupSummary
    );

    nodes.push({
      id: toScenarioStoryScenarioId(scenario.id),
      kind: "scenario",
      label: scenario.title,
      subtitle: scenario.id,
      summary: groupSummary,
      ...groupBox,
      details: buildScenarioDetails(scenario, locale)
    });

    for (const step of scenario.steps) {
      const subtitle = [step.id, step.contextId].join(" | ");
      const summary = step.final
        ? step.outcome ?? copy.values.finalOutcome
        : copy.summaries.scenarioMessages(
            step.incomingMessageIds.length + step.outgoingMessageIds.length
          );
      const stepBox = measureLeafNodeBox(
        step.final ? DIMENSIONS.finalStep : DIMENSIONS.step,
        step.title,
        subtitle,
        summary
      );

      nodes.push({
        id: toScenarioStoryStepId(scenario.id, step.id),
        kind: "scenario-step",
        label: step.title,
        subtitle,
        summary,
        parentId: toScenarioStoryScenarioId(scenario.id),
        ...stepBox,
        details: buildScenarioStepDetails(step, locale)
      });
    }

    for (const edge of scenario.edges) {
      const sourceStep = mustFind(scenario.steps, (step) => step.id === edge.sourceStepId, "scenario step");
      const targetStep = mustFind(scenario.steps, (step) => step.id === edge.targetStepId, "scenario step");
      const label = getScenarioProgressionLabel(sourceStep, targetStep, locale);
      const details: ViewerDetailItem[] = [
        detail(locale, "scenario.id", scenario.id),
        detail(locale, "relation.from", edge.sourceStepId),
        detail(locale, "relation.to", edge.targetStepId)
      ];

      if (label !== copy.edgeLabels.next) {
        details.push(detail(locale, "message.type", label));
      }

      edges.push({
        id: `scenario-story:sequence:${scenario.id}:${edge.sourceStepId}:${edge.targetStepId}`,
        kind: "sequence",
        source: toScenarioStoryStepId(scenario.id, edge.sourceStepId),
        target: toScenarioStoryStepId(scenario.id, edge.targetStepId),
        label,
        details
      });
    }
  }

  return {
    id: "scenario-story",
    kind: "scenario-story",
    navigation: {
      tier: "primary",
      order: 20
    },
    title: copy.views.scenarioStory.title,
    description: copy.views.scenarioStory.description,
    nodes,
    edges
  };
}

function buildMessageFlowView(
  analysis: BusinessSpecAnalysis,
  locale: ViewerLocale
): ViewerViewSpec {
  const copy = getViewerProjectionCopy(locale);
  const nodes: ViewerNodeSpec[] = [];
  const edges: ViewerViewSpec["edges"][number][] = [];
  const stepNodeIds = new Set<string>();

  for (const context of analysis.ir.contextBoundaries) {
    const linkedSteps = analysis.ir.scenarioSequences.flatMap((scenario) =>
      scenario.steps.filter((step) => step.contextId === context.id)
    );
    const linkedEndpointCount = unique([
      ...analysis.ir.aggregateLifecycles
        .filter((aggregate) => aggregate.contextId === context.id)
        .map((aggregate) => aggregate.id),
      ...analysis.ir.policyCoordinations
        .filter((policy) => policy.contextId === context.id)
        .map((policy) => policy.id)
    ]).length;
    const box = measureGroupNodeBox(
      DIMENSIONS.contextGroup,
      context.title,
      context.id,
      copy.summaries.messageFlowContext(linkedSteps.length, linkedEndpointCount)
    );

    nodes.push({
      id: toMessageFlowContextId(context.id),
      kind: "context",
      label: context.title,
      subtitle: context.id,
      summary: copy.summaries.messageFlowContext(linkedSteps.length, linkedEndpointCount),
      ...box,
      details: [
        detail(locale, "context.id", context.id),
        detail(locale, "context.owners", formatTextList(locale, context.owners)),
        detail(locale, "context.related_systems", formatTextList(locale, context.systemIds))
      ]
    });
  }

  for (const scenario of analysis.ir.scenarioSequences) {
    const scenarioBox = measureLeafNodeBox(
      DIMENSIONS.actor,
      scenario.title,
      scenario.id,
      copy.summaries.messageFlowScenario(
        scenario.steps.length,
        scenario.participatingContextIds.length
      )
    );

    nodes.push({
      id: toMessageFlowScenarioId(scenario.id),
      kind: "scenario",
      label: scenario.title,
      subtitle: scenario.id,
      summary: copy.summaries.messageFlowScenario(
        scenario.steps.length,
        scenario.participatingContextIds.length
      ),
      ...scenarioBox,
      details: buildScenarioDetails(scenario, locale)
    });

    for (const step of scenario.steps) {
      const stepNodeId = toMessageFlowStepId(scenario.id, step.id);

      if (stepNodeIds.has(stepNodeId)) {
        continue;
      }

      const summary = step.final
        ? step.outcome ?? copy.values.finalOutcome
        : copy.summaries.stepInOut(
            step.incomingMessageIds.length,
            step.outgoingMessageIds.length
          );
      const stepBox = measureLeafNodeBox(
        step.final ? DIMENSIONS.finalStep : DIMENSIONS.step,
        step.title,
        `${step.id} | ${scenario.id}`,
        summary
      );

      nodes.push({
        id: stepNodeId,
        kind: "scenario-step",
        label: step.title,
        subtitle: `${step.id} | ${scenario.id}`,
        summary,
        parentId: toMessageFlowContextId(step.contextId),
        ...stepBox,
        details: [
          detail(locale, "scenario.id", scenario.id),
          ...buildScenarioStepDetails(step, locale)
        ]
      });
      stepNodeIds.add(stepNodeId);
    }
  }

  for (const actor of analysis.ir.actors) {
    if (!analysis.ir.messageFlows.some((message) => hasEndpoint(message, "actor", actor.id))) {
      continue;
    }

    const box = measureLeafNodeBox(
      DIMENSIONS.actor,
      actor.title,
      actor.id,
      copy.summaries.actorSteps(actor.stepRefs.length)
    );

    nodes.push({
      id: toMessageFlowActorId(actor.id),
      kind: "actor",
      label: actor.title,
      subtitle: actor.id,
      summary: copy.summaries.actorSteps(actor.stepRefs.length),
      ...box,
      details: buildActorDetails(actor, locale)
    });
  }

  for (const system of analysis.ir.systems) {
    if (!analysis.ir.messageFlows.some((message) => hasEndpoint(message, "system", system.id))) {
      continue;
    }

    const box = measureLeafNodeBox(
      DIMENSIONS.system,
      system.title,
      system.id,
      system.boundary ?? copy.values.internal
    );

    nodes.push({
      id: toMessageFlowSystemId(system.id),
      kind: "system",
      label: system.title,
      subtitle: system.id,
      summary: system.boundary ?? copy.values.internal,
      ...box,
      details: buildSystemDetails(system, locale)
    });
  }

  for (const aggregate of analysis.ir.aggregateLifecycles) {
    if (!analysis.ir.messageFlows.some((message) => hasEndpoint(message, "aggregate", aggregate.id))) {
      continue;
    }

    const box = measureLeafNodeBox(
      DIMENSIONS.aggregate,
      aggregate.title,
      aggregate.id,
      copy.summaries.aggregateInitial(aggregate.initialState)
    );

    nodes.push({
      id: toMessageFlowAggregateId(aggregate.id),
      kind: "aggregate",
      label: aggregate.title,
      subtitle: aggregate.id,
      summary: copy.summaries.aggregateInitial(aggregate.initialState),
      parentId: toMessageFlowContextId(aggregate.contextId),
      ...box,
      details: buildAggregateDetails(aggregate, locale)
    });
  }

  for (const policy of analysis.ir.policyCoordinations) {
    if (!analysis.ir.messageFlows.some((message) => hasEndpoint(message, "policy", policy.id))) {
      continue;
    }

    const policySummary = copy.summaries.policy(
      policy.triggerMessageIds.length,
      policy.emittedMessageIds.length
    );
    const box = measureLeafNodeBox(
      DIMENSIONS.policy,
      policy.title,
      policy.id,
      policySummary
    );

    nodes.push({
      id: toMessageFlowPolicyId(policy.id),
      kind: "policy",
      label: policy.title,
      subtitle: policy.id,
      summary: policySummary,
      ...(policy.contextId ? { parentId: toMessageFlowContextId(policy.contextId) } : {}),
      ...box,
      details: buildPolicyDetails(policy, locale)
    });
  }

  for (const message of analysis.ir.messageFlows) {
    const messageContextIds = unique([
      ...message.producerContextIds,
      ...message.consumerContextIds
    ]);
    const subtitleParts = [message.id, localizeViewerMessageKind(locale, message.messageKind)];

    if (message.channel) {
      subtitleParts.push(localizeViewerMessageChannel(locale, message.channel));
    }

    const messageBox = measureLeafNodeBox(
      DIMENSIONS.message,
      message.title,
      subtitleParts.join(" | "),
      formatMessageTraceSummary(message, locale)
    );

    nodes.push({
      id: toMessageFlowMessageId(message.id),
      kind: "message",
      label: message.title,
      subtitle: subtitleParts.join(" | "),
      summary: formatMessageTraceSummary(message, locale),
      ...(messageContextIds.length === 1 ? { parentId: toMessageFlowContextId(messageContextIds[0] as string) } : {}),
      ...messageBox,
      details: buildMessageDetails(message, locale)
    });

    for (const producer of message.producers) {
      const sourceNodeId = resolveMessageFlowEndpointNodeId(
        producer.target.kind,
        producer.target.value
      );

      if (!sourceNodeId) {
        continue;
      }

      edges.push({
        id: `message-flow:source:${message.id}:${producer.target.kind}:${producer.target.value}`,
        kind: "message-flow",
        source: sourceNodeId,
        target: toMessageFlowMessageId(message.id),
        label: copy.edgeLabels.source,
        details: [
          detail(locale, "message.type", message.id),
          detail(locale, "relation.from", `${producer.target.kind}:${producer.target.value}`),
          detail(locale, "relation.to", message.id)
        ]
      });
    }

    for (const consumer of message.consumers) {
      const targetNodeId = resolveMessageFlowEndpointNodeId(
        consumer.target.kind,
        consumer.target.value
      );

      if (!targetNodeId) {
        continue;
      }

      edges.push({
        id: `message-flow:target:${message.id}:${consumer.target.kind}:${consumer.target.value}`,
        kind: "message-flow",
        source: toMessageFlowMessageId(message.id),
        target: targetNodeId,
        label: copy.edgeLabels.target,
        details: [
          detail(locale, "message.type", message.id),
          detail(locale, "relation.from", message.id),
          detail(locale, "relation.to", `${consumer.target.kind}:${consumer.target.value}`)
        ]
      });
    }

    for (const link of message.stepLinks) {
      const stepNodeId = toMessageFlowStepId(link.scenarioId, link.stepId);

      if (link.direction === "outgoing") {
        edges.push({
          id: `message-flow:step-outgoing:${message.id}:${link.scenarioId}:${link.stepId}`,
          kind: "message-flow",
          source: stepNodeId,
          target: toMessageFlowMessageId(message.id),
          label: messageVerbForOutgoing(message.messageKind, locale),
          details: [
            detail(locale, "scenario.id", link.scenarioId),
            detail(locale, "step.id", link.stepId),
            detail(locale, "message.type", message.id)
          ]
        });
        continue;
      }

      edges.push({
        id: `message-flow:step-incoming:${message.id}:${link.scenarioId}:${link.stepId}`,
        kind: "message-flow",
        source: toMessageFlowMessageId(message.id),
        target: stepNodeId,
        label: copy.edgeLabels.feeds,
        details: [
          detail(locale, "scenario.id", link.scenarioId),
          detail(locale, "step.id", link.stepId),
          detail(locale, "message.type", message.id)
        ]
      });
    }
  }

  for (const scenario of analysis.ir.scenarioSequences) {
    for (const edge of scenario.edges) {
      const sourceStep = mustFind(scenario.steps, (step) => step.id === edge.sourceStepId, "scenario step");
      const targetStep = mustFind(scenario.steps, (step) => step.id === edge.targetStepId, "scenario step");

      edges.push({
        id: `message-flow:sequence:${scenario.id}:${edge.sourceStepId}:${edge.targetStepId}`,
        kind: "sequence",
        source: toMessageFlowStepId(scenario.id, edge.sourceStepId),
        target: toMessageFlowStepId(scenario.id, edge.targetStepId),
        label: getScenarioProgressionLabel(sourceStep, targetStep, locale),
        details: [
          detail(locale, "scenario.id", scenario.id),
          detail(locale, "relation.from", edge.sourceStepId),
          detail(locale, "relation.to", edge.targetStepId)
        ]
      });
    }
  }

  return {
    id: "message-flow",
    kind: "message-flow",
    navigation: {
      tier: "primary",
      order: 30
    },
    title: copy.views.messageFlow.title,
    description: copy.views.messageFlow.description,
    nodes,
    edges
  };
}

function buildLifecycleView(
  analysis: BusinessSpecAnalysis,
  locale: ViewerLocale
): ViewerViewSpec {
  const copy = getViewerProjectionCopy(locale);
  const nodes: ViewerNodeSpec[] = [];
  const edges: ViewerViewSpec["edges"][number][] = [];
  const lifecycleAggregates = projectLifecycle(analysis.ir);

  for (const aggregate of lifecycleAggregates) {
    const groupBox = measureGroupNodeBox(
      DIMENSIONS.aggregateGroup,
      aggregate.title,
      `${aggregate.id} | ${aggregate.contextId}`,
      copy.summaries.aggregateInitial(aggregate.initialState)
    );

    nodes.push({
      id: toLifecycleAggregateId(aggregate.id),
      kind: "aggregate",
      label: aggregate.title,
      subtitle: `${aggregate.id} | ${aggregate.contextId}`,
      summary: copy.summaries.aggregateInitial(aggregate.initialState),
      ...groupBox,
      details: buildAggregateDetails(aggregate, locale)
    });

    for (const state of aggregate.states) {
      const emittedMessageIds = aggregate.transitions
        .filter((transition) => transition.fromStateId === state.id)
        .flatMap((transition) => transition.emittedMessageIds);
      const stateBox = measureLeafNodeBox(
        DIMENSIONS.lifecycleState,
        state.id,
        state.reachableFromInitial ? copy.values.reachable : copy.values.unreachable,
        state.terminal
          ? copy.values.terminal
          : copy.summaries.lifecycleTransitions(state.outgoingTransitionIds.length)
      );

      nodes.push({
        id: toLifecycleStateId(aggregate.id, state.id),
        kind: "lifecycle-state",
        label: state.id,
        subtitle: state.reachableFromInitial ? copy.values.reachable : copy.values.unreachable,
        summary: state.terminal
          ? copy.values.terminal
          : copy.summaries.lifecycleTransitions(state.outgoingTransitionIds.length),
        parentId: toLifecycleAggregateId(aggregate.id),
        ...stateBox,
        details: [
          detail(locale, "aggregate.id", aggregate.id),
          detail(locale, "aggregate.context", aggregate.contextId),
          detail(locale, "aggregate.state.id", state.id),
          detail(locale, "aggregate.state.reachable", state.reachableFromInitial ? copy.values.yes : copy.values.no),
          detail(locale, "aggregate.state.outgoing_messages", formatTextList(locale, unique(emittedMessageIds)))
        ]
      });
    }

    for (const transition of aggregate.transitions) {
      edges.push(toLifecycleTransitionEdge(aggregate, transition, locale));
    }
  }

  return {
    id: "lifecycle",
    kind: "lifecycle",
    navigation: {
      tier: "primary",
      order: 40
    },
    title: copy.views.lifecycle.title,
    description: copy.views.lifecycle.description,
    nodes,
    edges
  };
}

function buildPolicySagaView(
  analysis: BusinessSpecAnalysis,
  locale: ViewerLocale
): ViewerViewSpec {
  const copy = getViewerProjectionCopy(locale);
  const nodes: ViewerNodeSpec[] = [];
  const edges: ViewerViewSpec["edges"][number][] = [];

  for (const policy of analysis.ir.policyCoordinations) {
    const policySummary = copy.summaries.policy(
      policy.triggerMessageIds.length,
      policy.emittedMessageIds.length
    );
    const policyBox = measureLeafNodeBox(
      DIMENSIONS.policy,
      policy.title,
      policy.id,
      policySummary
    );

    nodes.push({
      id: toPolicyViewPolicyId(policy.id),
      kind: "policy",
      label: policy.title,
      subtitle: policy.id,
      summary: policySummary,
      ...policyBox,
      details: buildPolicyDetails(policy, locale)
    });

    for (const messageId of policy.triggerMessageIds) {
      nodes.push(...ensurePolicyViewMessageNode(nodes, analysis.ir.messageFlows, messageId, locale));
      edges.push({
        id: `policy-saga:trigger:${policy.id}:${messageId}`,
        kind: "coordination",
        source: toPolicyViewMessageId(messageId),
        target: toPolicyViewPolicyId(policy.id),
        label: copy.edgeLabels.triggers,
        details: [
          detail(locale, "policy.id", policy.id),
          detail(locale, "message.type", messageId)
        ]
      });
    }

    for (const messageId of policy.emittedMessageIds) {
      nodes.push(...ensurePolicyViewMessageNode(nodes, analysis.ir.messageFlows, messageId, locale));
      edges.push({
        id: `policy-saga:emit:${policy.id}:${messageId}`,
        kind: "coordination",
        source: toPolicyViewPolicyId(policy.id),
        target: toPolicyViewMessageId(messageId),
        label: copy.edgeLabels.emits,
        details: [
          detail(locale, "policy.id", policy.id),
          detail(locale, "message.type", messageId)
        ]
      });
    }
  }

  return {
    id: "policy-saga",
    kind: "policy-saga",
    navigation: {
      tier: "secondary",
      order: 50
    },
    title: copy.views.policySaga.title,
    description: copy.views.policySaga.description,
    nodes,
    edges
  };
}

function buildActorDetails(
  actor: ActorParticipant,
  locale: ViewerLocale
): ViewerDetailItem[] {
  const copy = getViewerProjectionCopy(locale);

  return [
    detail(
      locale,
      "actor.type",
      actor.actorType
        ? localizeViewerActorType(locale, actor.actorType)
        : copy.values.unspecified
    ),
    detail(locale, "actor.contexts", formatTextList(locale, actor.contextIds)),
    detail(locale, "actor.scenarios", formatTextList(locale, actor.scenarioIds)),
    detail(
      locale,
      "actor.scenario_steps",
      formatTextList(
        locale,
        actor.stepRefs.map(
          (stepRef) => `${stepRef.scenarioId}.${stepRef.stepId} (${stepRef.contextId})`
        )
      )
    )
  ];
}

function buildSystemDetails(
  system: SystemParticipant,
  locale: ViewerLocale
): ViewerDetailItem[] {
  const copy = getViewerProjectionCopy(locale);

  return [
    detail(
      locale,
      "system.boundary",
      localizeViewerSystemBoundary(locale, system.boundary ?? copy.values.internal)
    ),
    detail(locale, "system.capabilities", formatTextList(locale, system.capabilities)),
    detail(locale, "system.contexts", formatTextList(locale, system.contextIds)),
    detail(locale, "system.dependencies", formatSystemDependencies(locale, system))
  ];
}

function buildScenarioDetails(
  scenario: ScenarioSequence,
  locale: ViewerLocale
): ViewerDetailItem[] {
  return [
    detail(locale, "scenario.id", scenario.id),
    detail(locale, "scenario.goal", scenario.goal),
    detail(locale, "scenario.owner_context", scenario.ownerContextId),
    detail(
      locale,
      "scenario.participating_contexts",
      formatTextList(locale, scenario.participatingContextIds)
    ),
    detail(locale, "scenario.actors", formatTextList(locale, scenario.actorIds)),
    detail(locale, "scenario.systems", formatTextList(locale, scenario.systemIds)),
    detail(locale, "scenario.final_steps", formatTextList(locale, scenario.finalStepIds))
  ];
}

function buildScenarioStepDetails(
  step: ScenarioStep,
  locale: ViewerLocale
): ViewerDetailItem[] {
  const copy = getViewerProjectionCopy(locale);

  return [
    detail(locale, "step.id", step.id),
    detail(locale, "step.context", step.contextId),
    detail(locale, "step.entry", step.entry ? copy.values.yes : copy.values.no),
    detail(locale, "step.final", step.final ? copy.values.yes : copy.values.no),
    ...(step.actorId ? [detail(locale, "step.actor", step.actorId)] : []),
    ...(step.systemId ? [detail(locale, "step.system", step.systemId)] : []),
    detail(locale, "step.incoming_messages", formatTextList(locale, step.incomingMessageIds)),
    detail(locale, "step.outgoing_messages", formatTextList(locale, step.outgoingMessageIds)),
    ...(step.outcome ? [detail(locale, "step.outcome", step.outcome)] : [])
  ];
}

function buildMessageDetails(
  message: MessageFlow,
  locale: ViewerLocale
): ViewerDetailItem[] {
  const copy = getViewerProjectionCopy(locale);

  return [
    detail(locale, "message.kind", localizeViewerMessageKind(locale, message.messageKind)),
    detail(locale, "message.type", message.id),
    detail(
      locale,
      "message.channel",
      message.channel
        ? localizeViewerMessageChannel(locale, message.channel)
        : copy.values.unspecified
    ),
    detail(locale, "message.endpoints", formatMessageEndpoints(locale, message)),
    detail(
      locale,
      "message.crosses_context_boundary",
      message.crossesContextBoundary ? copy.values.yes : copy.values.no
    ),
    detail(locale, "message.step_links", formatMessageStepLinks(locale, message.stepLinks)),
    detail(locale, "message.payload_fields", formatPayloadFields(locale, message.payload))
  ];
}

function buildAggregateDetails(
  aggregate: AggregateLifecycle,
  locale: ViewerLocale
): ViewerDetailItem[] {
  return [
    detail(locale, "aggregate.id", aggregate.id),
    detail(locale, "aggregate.context", aggregate.contextId),
    detail(locale, "aggregate.initial_state", aggregate.initialState),
    detail(locale, "aggregate.lifecycle", formatTextList(locale, aggregate.states.map((state) => state.id))),
    detail(locale, "aggregate.accepted_messages", formatTextList(locale, aggregate.acceptedMessageIds)),
    detail(locale, "aggregate.emitted_messages", formatTextList(locale, aggregate.emittedMessageIds)),
    detail(locale, "aggregate.reachable_states", formatTextList(locale, aggregate.reachableStateIds)),
    detail(locale, "aggregate.unreachable_states", formatTextList(locale, aggregate.unreachableStateIds))
  ];
}

function buildPolicyDetails(
  policy: PolicyCoordination,
  locale: ViewerLocale
): ViewerDetailItem[] {
  const copy = getViewerProjectionCopy(locale);

  return [
    detail(locale, "policy.id", policy.id),
    detail(locale, "policy.context", policy.contextId ?? copy.values.none),
    detail(locale, "policy.trigger_messages", formatTextList(locale, policy.triggerMessageIds)),
    detail(locale, "policy.emitted_messages", formatTextList(locale, policy.emittedMessageIds)),
    detail(locale, "policy.target_systems", formatTextList(locale, policy.targetSystemIds)),
    detail(locale, "policy.related_contexts", formatTextList(locale, policy.relatedContextIds)),
    detail(locale, "policy.coordinates", formatPolicyCoordinates(locale, policy))
  ];
}

function toLifecycleTransitionEdge(
  aggregate: AggregateLifecycle,
  transition: LifecycleTransition,
  locale: ViewerLocale
): ViewerViewSpec["edges"][number] {
  const edgeLabel = transition.emittedMessageIds.length > 0
    ? `${transition.onMessageId} / ${transition.emittedMessageIds.join(", ")}`
    : transition.onMessageId;

  return {
    id: `lifecycle:transition:${aggregate.id}:${transition.id}`,
    kind: "state-transition",
    source: toLifecycleStateId(aggregate.id, transition.fromStateId),
    target: toLifecycleStateId(aggregate.id, transition.toStateId),
    label: edgeLabel,
    details: [
      detail(locale, "aggregate.id", aggregate.id),
      detail(locale, "aggregate.context", aggregate.contextId),
      detail(locale, "relation.from", transition.fromStateId),
      detail(locale, "relation.to", transition.toStateId),
      detail(locale, "transition.trigger_message", transition.onMessageId),
      detail(locale, "transition.emitted_messages", formatTextList(locale, transition.emittedMessageIds))
    ]
  };
}

function ensurePolicyViewMessageNode(
  existingNodes: readonly ViewerNodeSpec[],
  messages: readonly MessageFlow[],
  messageId: string,
  locale: ViewerLocale
): ViewerNodeSpec[] {
  const nodeId = toPolicyViewMessageId(messageId);

  if (existingNodes.some((node) => node.id === nodeId)) {
    return [];
  }

  const message = mustFind(messages, (candidate) => candidate.id === messageId, "message");
  const box = measureLeafNodeBox(
    DIMENSIONS.message,
    message.title,
    `${message.id} | ${message.messageKind}`,
    formatMessageTraceSummary(message, locale)
  );

  return [
    {
      id: nodeId,
      kind: "message",
      label: message.title,
      subtitle: `${message.id} | ${message.messageKind}`,
      summary: formatMessageTraceSummary(message, locale),
      ...box,
      details: buildMessageDetails(message, locale)
    }
  ];
}

function formatContextRelationships(
  locale: ViewerLocale,
  context: ContextBoundary
): ViewerDetailValue {
  const copy = getViewerProjectionCopy(locale);

  if (context.relationships.length === 0) {
    return textDetailValue(copy.values.none);
  }

  return listDetailValue(
    context.relationships.map((relationship) => formatContextRelationship(locale, relationship))
  );
}

function formatContextRelationship(
  locale: ViewerLocale,
  relationship: ContextBoundary["relationships"][number]
): ViewerDetailValue {
  const copy = getViewerProjectionCopy(locale);

  return recordDetailValue([
    recordDetailEntry(copy.recordLabels.relationship, textDetailValue(relationship.id)),
    recordDetailEntry(
      copy.recordLabels.kind,
      textDetailValue(localizeViewerRelationshipKind(locale, relationship.kind))
    ),
    ...(relationship.direction
      ? [
          recordDetailEntry(
            copy.recordLabels.direction,
            textDetailValue(localizeViewerRelationshipDirection(locale, relationship.direction))
          )
        ]
      : []),
    ...(relationship.integration
      ? [
          recordDetailEntry(
            copy.recordLabels.integration,
            textDetailValue(localizeViewerRelationshipIntegration(locale, relationship.integration))
          )
        ]
      : []),
    recordDetailEntry(
      copy.recordLabels.target,
      textDetailValue(
        `${relationship.target.target.kind}:${relationship.target.target.value}`
      )
    ),
    ...(relationship.description
      ? [recordDetailEntry(copy.recordLabels.description, textDetailValue(relationship.description))]
      : [])
  ]);
}

function formatSystemDependencies(
  locale: ViewerLocale,
  system: SystemParticipant
): ViewerDetailValue {
  const copy = getViewerProjectionCopy(locale);

  if (system.dependencyRefs.length === 0) {
    return textDetailValue(copy.values.none);
  }

  return listDetailValue(
    system.dependencyRefs.map((dependency) =>
      recordDetailValue([
        recordDetailEntry(
          copy.recordLabels.kind,
          textDetailValue(localizeViewerDependencyKind(locale, dependency.kind))
        ),
        recordDetailEntry(copy.recordLabels.contexts, formatTextList(locale, dependency.contextIds)),
        ...(dependency.scenarioId
          ? [recordDetailEntry(copy.recordLabels.scenario, textDetailValue(dependency.scenarioId))]
          : []),
        ...(dependency.stepId
          ? [recordDetailEntry(copy.recordLabels.step, textDetailValue(dependency.stepId))]
          : []),
        ...(dependency.messageId
          ? [recordDetailEntry(copy.recordLabels.message, textDetailValue(dependency.messageId))]
          : []),
        ...(dependency.policyId
          ? [recordDetailEntry(copy.recordLabels.policy, textDetailValue(dependency.policyId))]
          : []),
        ...(dependency.description
          ? [recordDetailEntry(copy.recordLabels.description, textDetailValue(dependency.description))]
          : [])
      ])
    )
  );
}

function formatMessageEndpoints(
  locale: ViewerLocale,
  message: MessageFlow
): ViewerDetailValue {
  const copy = getViewerProjectionCopy(locale);

  return recordDetailValue([
    recordDetailEntry(
      copy.recordLabels.sources,
      formatTextList(
        locale,
        message.producers.map((producer) =>
          formatEndpointRef(producer.target.kind, producer.target.value)
        )
      )
    ),
    recordDetailEntry(
      copy.recordLabels.targets,
      formatTextList(
        locale,
        message.consumers.map((consumer) =>
          formatEndpointRef(consumer.target.kind, consumer.target.value)
        )
      )
    ),
    recordDetailEntry(copy.recordLabels.sourceContexts, formatTextList(locale, message.producerContextIds)),
    recordDetailEntry(copy.recordLabels.targetContexts, formatTextList(locale, message.consumerContextIds))
  ]);
}

function formatMessageStepLinks(
  locale: ViewerLocale,
  stepLinks: readonly MessageStepLink[]
): ViewerDetailValue {
  const copy = getViewerProjectionCopy(locale);

  if (stepLinks.length === 0) {
    return textDetailValue(copy.values.none);
  }

  return listDetailValue(
    stepLinks.map((link) =>
      recordDetailValue([
        recordDetailEntry(
          copy.recordLabels.direction,
          textDetailValue(localizeViewerStepLinkDirection(locale, link.direction))
        ),
        recordDetailEntry(copy.recordLabels.scenario, textDetailValue(link.scenarioId)),
        recordDetailEntry(copy.recordLabels.step, textDetailValue(link.stepId)),
        recordDetailEntry(copy.recordLabels.context, textDetailValue(link.contextId))
      ])
    )
  );
}

function formatPolicyCoordinates(
  locale: ViewerLocale,
  policy: PolicyCoordination
): ViewerDetailValue {
  const copy = getViewerProjectionCopy(locale);

  if (policy.coordinates.length === 0) {
    return textDetailValue(copy.values.none);
  }

  return formatTextList(
    locale,
    policy.coordinates.map((coordinate) =>
      formatEndpointRef(coordinate.target.kind, coordinate.target.value)
    )
  );
}

function formatPayloadFields(
  locale: ViewerLocale,
  fields: readonly {
    id: string;
    type: string;
    required: boolean;
    description?: string;
  }[]
): ViewerDetailValue {
  const copy = getViewerProjectionCopy(locale);

  if (fields.length === 0) {
    return textDetailValue(copy.values.none);
  }

  return listDetailValue(
    fields.map((field) =>
      fieldDetailValue({
        name: field.id,
        fieldType: field.type,
        required: field.required,
        description: field.description ?? copy.values.noDescriptionAvailable
      })
    )
  );
}

function formatMessageTraceSummary(
  message: MessageFlow,
  locale: ViewerLocale
): string {
  const copy = getViewerProjectionCopy(locale);
  const producerContexts = message.producerContextIds.join(", ");
  const consumerContexts = message.consumerContextIds.join(", ");

  return copy.summaries.messageTrace(producerContexts, consumerContexts);
}

function getScenarioProgressionLabel(
  sourceStep: ScenarioStep,
  targetStep: ScenarioStep,
  locale: ViewerLocale
): string {
  const sharedMessageIds = sourceStep.outgoingMessageIds.filter((messageId) =>
    targetStep.incomingMessageIds.includes(messageId)
  );

  if (sharedMessageIds.length > 0) {
    return sharedMessageIds.join(", ");
  }

  return (
    targetStep.incomingMessageIds[0] ??
    sourceStep.outgoingMessageIds[0] ??
    getViewerProjectionCopy(locale).edgeLabels.next
  );
}

function hasEndpoint(
  message: MessageFlow,
  kind: string,
  id: string
): boolean {
  return [...message.producers, ...message.consumers].some(
    (endpoint) => endpoint.target.kind === kind && endpoint.target.value === id
  );
}

function messageVerbForOutgoing(
  messageKind: MessageKind,
  locale: ViewerLocale
): string {
  return getViewerProjectionCopy(locale).messageVerbs[messageKind];
}

function formatEndpointRef(kind: string, id: string): string {
  return `${kind}:${id}`;
}

function detail(
  locale: ViewerLocale,
  semanticKey: ViewerSemanticKey,
  value: ViewerDetailValue | string
): ViewerDetailItem {
  return {
    semanticKey,
    label: getViewerProjectionCopy(locale).detailSemantics[semanticKey].label,
    value: typeof value === "string" ? textDetailValue(value) : value
  };
}

function textDetailValue(text: string): ViewerDetailValue {
  return {
    kind: "text",
    text
  };
}

function listDetailValue(items: readonly ViewerDetailValue[]): ViewerDetailValue {
  return {
    kind: "list",
    items
  };
}

function recordDetailEntry(label: string, value: ViewerDetailValue) {
  return {
    label,
    value
  };
}

function recordDetailValue(
  entries: readonly {
    label: string;
    value: ViewerDetailValue;
  }[]
): ViewerDetailValue {
  return {
    kind: "record",
    entries
  };
}

function fieldDetailValue(input: {
  name: string;
  fieldType: string;
  required: boolean;
  description?: string;
}): ViewerDetailValue {
  return {
    kind: "field",
    name: input.name,
    fieldType: input.fieldType,
    required: input.required,
    ...(input.description ? { description: input.description } : {})
  };
}

function formatTextList(
  locale: ViewerLocale,
  values: readonly string[]
): ViewerDetailValue {
  if (values.length === 0) {
    return textDetailValue(getViewerProjectionCopy(locale).values.none);
  }

  return listDetailValue(values.map((value) => textDetailValue(value)));
}

function measureLeafNodeBox(
  preset: {
    width: number;
    minHeight: number;
    charsPerLine: number;
  },
  label: string,
  subtitle?: string,
  summary?: string
): Pick<ViewerNodeSpec, "width" | "height"> {
  const sectionCount = 2 + (subtitle ? 1 : 0) + (summary ? 1 : 0);
  const lineHeight =
    estimateLineCount(label, preset.charsPerLine) * 19 +
    (subtitle ? estimateLineCount(subtitle, preset.charsPerLine) * 16 : 0) +
    (summary ? estimateLineCount(summary, preset.charsPerLine) * 16 : 0);
  const gapHeight = (sectionCount - 1) * 8;
  const totalHeight = 28 + 20 + gapHeight + lineHeight;

  return {
    width: preset.width,
    height: Math.max(preset.minHeight, totalHeight)
  };
}

function measureGroupNodeBox(
  preset: {
    width: number;
    minHeight: number;
    charsPerLine: number;
    minHeaderHeight: number;
  },
  label: string,
  subtitle?: string,
  summary?: string
): Pick<ViewerNodeSpec, "width" | "height" | "headerHeight"> {
  const sectionCount = 2 + (subtitle ? 1 : 0) + (summary ? 1 : 0);
  const lineHeight =
    estimateLineCount(label, preset.charsPerLine) * 19 +
    (subtitle ? estimateLineCount(subtitle, preset.charsPerLine) * 16 : 0) +
    (summary ? estimateLineCount(summary, preset.charsPerLine) * 16 : 0);
  const gapHeight = (sectionCount - 1) * 4;
  const headerHeight = Math.max(preset.minHeaderHeight, 26 + 18 + gapHeight + lineHeight);

  return {
    width: preset.width,
    height: Math.max(preset.minHeight, headerHeight + 72),
    headerHeight
  };
}

function estimateLineCount(text: string, charsPerLine: number): number {
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}

function toMap<Value, Key extends string>(
  values: readonly Value[],
  getKey: (value: Value) => Key
): ReadonlyMap<Key, Value> {
  return new Map(values.map((value) => [getKey(value), value] as const));
}

function mustGet<Key, Value>(map: ReadonlyMap<Key, Value>, key: Key, label: string): Value {
  const value = map.get(key);

  if (!value) {
    throw new Error(`Unknown ${label} ${String(key)}`);
  }

  return value;
}

function mustFind<Value>(
  values: readonly Value[],
  predicate: (value: Value) => boolean,
  label: string
): Value {
  const value = values.find(predicate);

  if (!value) {
    throw new Error(`Unknown ${label}`);
  }

  return value;
}

function unique<Value>(values: readonly Value[]): Value[] {
  return [...new Set(values)];
}

function toContextMapContextId(contextId: string): string {
  return `context-map:context:${contextId}`;
}

function toContextMapAggregateId(aggregateId: string): string {
  return `context-map:aggregate:${aggregateId}`;
}

function toContextMapScenarioId(scenarioId: string): string {
  return `context-map:scenario:${scenarioId}`;
}

function toContextMapActorId(actorId: string): string {
  return `context-map:actor:${actorId}`;
}

function toContextMapSystemId(systemId: string): string {
  return `context-map:system:${systemId}`;
}

function toContextMapPolicyId(policyId: string): string {
  return `context-map:policy:${policyId}`;
}

function toContextMapTargetId(kind: string, id: string): string | undefined {
  switch (kind) {
    case "context":
      return toContextMapContextId(id);
    case "actor":
      return toContextMapActorId(id);
    case "system":
      return toContextMapSystemId(id);
    case "scenario":
      return toContextMapScenarioId(id);
    case "aggregate":
      return toContextMapAggregateId(id);
    case "policy":
      return toContextMapPolicyId(id);
    default:
      return undefined;
  }
}

function toScenarioStoryScenarioId(scenarioId: string): string {
  return `scenario-story:scenario:${scenarioId}`;
}

function toScenarioStoryStepId(scenarioId: string, stepId: string): string {
  return `scenario-story:scenario:${scenarioId}:step:${stepId}`;
}

function toMessageFlowContextId(contextId: string): string {
  return `message-flow:context:${contextId}`;
}

function toMessageFlowScenarioId(scenarioId: string): string {
  return `message-flow:scenario:${scenarioId}`;
}

function toMessageFlowStepId(scenarioId: string, stepId: string): string {
  return `message-flow:scenario:${scenarioId}:step:${stepId}`;
}

function toMessageFlowActorId(actorId: string): string {
  return `message-flow:actor:${actorId}`;
}

function toMessageFlowSystemId(systemId: string): string {
  return `message-flow:system:${systemId}`;
}

function toMessageFlowAggregateId(aggregateId: string): string {
  return `message-flow:aggregate:${aggregateId}`;
}

function toMessageFlowPolicyId(policyId: string): string {
  return `message-flow:policy:${policyId}`;
}

function toMessageFlowMessageId(messageId: string): string {
  return `message-flow:message:${messageId}`;
}

function resolveMessageFlowEndpointNodeId(kind: string, id: string): string | undefined {
  switch (kind) {
    case "context":
      return toMessageFlowContextId(id);
    case "actor":
      return toMessageFlowActorId(id);
    case "system":
      return toMessageFlowSystemId(id);
    case "scenario":
      return toMessageFlowScenarioId(id);
    case "aggregate":
      return toMessageFlowAggregateId(id);
    case "policy":
      return toMessageFlowPolicyId(id);
    default:
      return undefined;
  }
}

function toLifecycleAggregateId(aggregateId: string): string {
  return `lifecycle:aggregate:${aggregateId}`;
}

function toLifecycleStateId(aggregateId: string, stateId: string): string {
  return `lifecycle:aggregate:${aggregateId}:state:${stateId}`;
}

function toPolicyViewPolicyId(policyId: string): string {
  return `policy-saga:policy:${policyId}`;
}

function toPolicyViewMessageId(messageId: string): string {
  return `policy-saga:message:${messageId}`;
}
