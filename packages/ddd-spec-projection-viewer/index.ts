import type {
  AggregateSpec,
  BusinessSpec,
  CommandSpec,
  EventSpec,
  FieldSpec,
  FieldRefSpec,
  ObjectSpec,
  ProcessSpec,
  RelationSpec
} from "../ddd-spec-core/spec.js";
import {
  hasAggregateLifecycle,
  hasObjectFields,
  isEntityObjectSpec,
  isEnumObjectSpec
} from "../ddd-spec-core/spec.js";
import type {
  AggregateGraph,
  BusinessGraph,
  ProcessGraph
} from "../ddd-spec-core/graph-analysis.js";
import { resolveFieldDescription } from "../ddd-spec-core/field-explanation.js";
import type {
  BusinessViewerSpec,
  ViewerDetailItem,
  ViewerDetailValue,
  ViewerEdgeSpec,
  ViewerNodeSpec,
  ViewerViewSpec
} from "../ddd-spec-viewer-contract/index.js";
import { BUSINESS_VIEWER_SPEC_VERSION } from "../ddd-spec-viewer-contract/index.js";
import {
  buildSemanticDetailHelp,
  getViewerDetailSemantic
} from "./viewer-semantic-help.js";

export { buildVnextViewerSpec } from "./vnext.js";

const DIMENSIONS = {
  contextGroup: { width: 360, minHeight: 240, charsPerLine: 32, minHeaderHeight: 116 },
  processGroup: { width: 320, minHeight: 220, charsPerLine: 28, minHeaderHeight: 112 },
  aggregateGroup: { width: 280, minHeight: 180, charsPerLine: 24, minHeaderHeight: 112 },
  stage: { width: 220, minHeight: 116, charsPerLine: 20 },
  finalStage: { width: 220, minHeight: 100, charsPerLine: 20 },
  aggregateState: { width: 180, minHeight: 96, charsPerLine: 16 },
  command: { width: 196, minHeight: 88, charsPerLine: 18 },
  event: { width: 184, minHeight: 88, charsPerLine: 17 },
  domainEntity: { width: 224, minHeight: 108, charsPerLine: 22 },
  domainEnum: { width: 196, minHeight: 92, charsPerLine: 18 }
} as const;

interface ViewerContext {
  spec: BusinessSpec;
  graph: BusinessGraph;
  objectById: ReadonlyMap<string, ObjectSpec>;
  commandByType: ReadonlyMap<string, CommandSpec>;
  eventByType: ReadonlyMap<string, EventSpec>;
  aggregateSpecByObjectId: ReadonlyMap<string, AggregateSpec>;
  aggregateGraphByObjectId: ReadonlyMap<string, AggregateGraph>;
  processSpecById: ReadonlyMap<string, ProcessSpec>;
  stageRefsByAggregateStateKey: ReadonlyMap<string, readonly string[]>;
  domainStructureEdges: readonly DomainStructureEdgeModel[];
  incomingStructureRefsByObjectId: ReadonlyMap<string, readonly string[]>;
}

type DomainStructureEdgeKind = Extract<
  ViewerEdgeSpec["kind"],
  "association" | "composition" | "reference"
>;

interface DomainStructureEdgeModel {
  id: string;
  kind: DomainStructureEdgeKind;
  sourceObjectId: string;
  targetObjectId: string;
  label: string;
  relationId?: string;
  fieldId?: string;
  cardinality?: string;
  description?: string;
}

interface DomainStructureAggregatePresentation {
  rootObjectId: string;
  ownedObjectIds: readonly string[];
  sharedTypeIds: readonly string[];
  externalDependencyIds: readonly string[];
  externalDependencyRefs: readonly string[];
  summary: string;
}

const DOMAIN_SHARED_TYPES_GROUP_ID = "domain-structure:group:shared-types";

export function buildBusinessViewerSpec(
  spec: BusinessSpec,
  graph: BusinessGraph
): BusinessViewerSpec {
  const context = createViewerContext(spec, graph);
  const views = [
    buildContextMapView(context),
    buildScenarioStoryView(context),
    buildMessageFlowView(context),
    buildLifecycleView(context),
    buildDomainStructureView(context)
  ];

  return {
    viewerVersion: BUSINESS_VIEWER_SPEC_VERSION,
    specId: spec.id,
    title: spec.title,
    summary: spec.summary,
    detailHelp: {
      semantic: buildSemanticDetailHelp(spec)
    },
    views
  };
}

function createViewerContext(spec: BusinessSpec, graph: BusinessGraph): ViewerContext {
  const domainStructureEdges = collectDomainStructureEdges(spec);

  return {
    spec,
    graph,
    objectById: toMap(spec.domain.objects, (object) => object.id),
    commandByType: toMap(spec.domain.commands, (command) => command.type),
    eventByType: toMap(spec.domain.events, (event) => event.type),
    aggregateSpecByObjectId: toMap(spec.domain.aggregates, (aggregate) => aggregate.objectId),
    aggregateGraphByObjectId: toMap(graph.aggregates, (aggregate) => aggregate.objectId),
    processSpecById: toMap(spec.domain.processes, (process) => process.id),
    stageRefsByAggregateStateKey: collectStageRefsByAggregateState(graph, spec),
    domainStructureEdges,
    incomingStructureRefsByObjectId: collectIncomingStructureRefs(domainStructureEdges)
  };
}

function buildContextMapView(context: ViewerContext): ViewerViewSpec {
  const nodes: ViewerNodeSpec[] = [];
  const edges: ViewerEdgeSpec[] = [];
  const contextId = toContextMapContextId(context.spec.id);
  const aggregateIds = context.spec.domain.aggregates.map((aggregate) => aggregate.objectId);
  const scenarioIds = context.spec.domain.processes.map((process) => process.id);
  const contextSummary = `${aggregateIds.length} aggregate(s), ${scenarioIds.length} scenario(s)`;
  const contextBox = measureGroupNodeBox(
    DIMENSIONS.contextGroup,
    context.spec.title,
    context.spec.id,
    contextSummary
  );

  nodes.push({
    id: contextId,
    kind: "context",
    label: context.spec.title,
    subtitle: context.spec.id,
    summary: contextSummary,
    ...contextBox,
    details: [
      detail(context, "context.id", context.spec.id),
      detail(context, "context.owned_aggregates", formatTextList(aggregateIds)),
      detail(context, "context.scenarios", formatTextList(scenarioIds))
    ]
  });

  for (const aggregateGraph of context.graph.aggregates) {
    const objectSpec = mustGetAggregateObjectSpec(context.objectById, aggregateGraph.objectId);
    const aggregateSummary = `initial: ${aggregateGraph.initialState}`;
    const aggregateBox = measureLeafNodeBox(
      DIMENSIONS.aggregateGroup,
      objectSpec.title,
      aggregateGraph.objectId,
      aggregateSummary
    );

    nodes.push({
      id: toContextMapAggregateId(aggregateGraph.objectId),
      kind: "aggregate",
      label: objectSpec.title,
      subtitle: aggregateGraph.objectId,
      summary: aggregateSummary,
      parentId: contextId,
      ...aggregateBox,
      details: [
        detail(context, "aggregate.id", aggregateGraph.objectId),
        detail(context, "aggregate.initial_state", aggregateGraph.initialState),
        detail(context, "aggregate.lifecycle", formatTextList(objectSpec.lifecycle))
      ]
    });
  }

  for (const processGraph of context.graph.processes) {
    const processSpec = mustGet(context.processSpecById, processGraph.processId, "process");
    const usedAggregateIds = unique(
      processGraph.stages
        .filter((stage) => stage.aggregateObjectId)
        .map((stage) => stage.aggregateObjectId as string)
    );
    const scenarioSummary = `initial: ${processGraph.initialStage}`;
    const scenarioBox = measureLeafNodeBox(
      DIMENSIONS.processGroup,
      processSpec.title,
      processGraph.processId,
      scenarioSummary
    );

    nodes.push({
      id: toContextMapScenarioId(processGraph.processId),
      kind: "scenario",
      label: processSpec.title,
      subtitle: processGraph.processId,
      summary: scenarioSummary,
      parentId: contextId,
      ...scenarioBox,
      details: [
        detail(context, "scenario.id", processGraph.processId),
        detail(context, "scenario.initial_step", processGraph.initialStage),
        detail(context, "scenario.final_steps", formatTextList(processGraph.finalStageIds)),
        detail(context, "scenario.related_aggregates", formatTextList(usedAggregateIds))
      ]
    });

    for (const aggregateId of usedAggregateIds) {
      edges.push({
        id: `context-map-collaboration:${processGraph.processId}:${aggregateId}`,
        kind: "collaboration",
        source: toContextMapScenarioId(processGraph.processId),
        target: toContextMapAggregateId(aggregateId),
        label: "uses",
        details: [
          detail(context, "scenario.id", processGraph.processId),
          detail(context, "aggregate.id", aggregateId)
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
    title: "Context Map",
    description:
      "Shows the current bounded context envelope, the scenarios modeled inside it, and which aggregates each scenario collaborates with.",
    nodes,
    edges
  };
}

function buildScenarioStoryView(context: ViewerContext): ViewerViewSpec {
  const nodes: ViewerNodeSpec[] = [];
  const edges: ViewerEdgeSpec[] = [];

  for (const processGraph of context.graph.processes) {
    const processSpec = mustGet(context.processSpecById, processGraph.processId, "process");
    const processGroupId = toScenarioStoryScenarioId(processGraph.processId);
    const relatedAggregateIds = unique(
      processGraph.stages
        .filter((stage) => stage.aggregateObjectId)
        .map((stage) => stage.aggregateObjectId as string)
    );
    const processSummary = `initial: ${processGraph.initialStage}`;
    const processGroupBox = measureGroupNodeBox(
      DIMENSIONS.processGroup,
      processSpec.title,
      processGraph.processId,
      processSummary
    );

    nodes.push({
      id: processGroupId,
      kind: "scenario",
      label: processSpec.title,
      subtitle: processGraph.processId,
      summary: processSummary,
      ...processGroupBox,
      details: [
        detail(context, "scenario.id", processGraph.processId),
        detail(context, "scenario.initial_step", processGraph.initialStage),
        detail(
          context,
          "scenario.related_aggregates",
          formatTextList(relatedAggregateIds)
        ),
        detail(
          context,
          "scenario.final_steps",
          formatTextList(processGraph.finalStageIds)
        )
      ]
    });

    for (const stageNode of processGraph.stages) {
      const stageSpec = processSpec.stages[stageNode.stageId];
      const acceptedCommands = stageNode.acceptedCommands;
      const observedEvents = stageNode.observedEvents;
      const stageSubtitle =
        stageNode.aggregateObjectId && stageNode.aggregateStateId
          ? `${stageNode.stageId} | ${stageNode.aggregateObjectId}.${stageNode.aggregateStateId}`
          : stageNode.stageId;
      const stageSummary = stageNode.final
        ? (stageSpec.outcome ?? "final outcome")
        : `${acceptedCommands.length + observedEvents.length} message(s)`;
      const stageBox = measureLeafNodeBox(
        stageNode.final ? DIMENSIONS.finalStage : DIMENSIONS.stage,
        stageSpec.title,
        stageSubtitle,
        stageSummary
      );

      nodes.push({
        id: toScenarioStoryStepId(processGraph.processId, stageNode.stageId),
        kind: "scenario-step",
        label: stageSpec.title,
        subtitle: stageSubtitle,
        summary: stageSummary,
        parentId: processGroupId,
        ...stageBox,
        details: [
          detail(context, "step.id", stageNode.stageId),
          detail(context, "step.final", stageNode.final ? "yes" : "no"),
          ...(stageNode.aggregateObjectId && stageNode.aggregateStateId
            ? [
                detail(context, "step.bound_aggregate", stageNode.aggregateObjectId),
                detail(context, "step.bound_state", stageNode.aggregateStateId)
              ]
            : []),
          detail(
            context,
            "behavior.accepted_commands",
            formatTextList(acceptedCommands)
          ),
          detail(
            context,
            "behavior.observed_events",
            formatTextList(observedEvents)
          ),
          ...(stageSpec.outcome ? [detail(context, "step.outcome", stageSpec.outcome)] : [])
        ]
      });
    }

    for (const advance of processGraph.advances) {
      edges.push({
        id: `scenario-story-sequence:${processGraph.processId}:${advance.sourceStage}:${advance.eventType}`,
        kind: "sequence",
        source: toScenarioStoryStepId(processGraph.processId, advance.sourceStage),
        target: toScenarioStoryStepId(processGraph.processId, advance.targetStage),
        label: advance.eventType,
        details: [
          detail(context, "scenario.id", processGraph.processId),
          detail(context, "message.type", advance.eventType),
          detail(context, "relation.from", advance.sourceStage),
          detail(context, "relation.to", advance.targetStage)
        ]
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
    title: "Scenario Story",
    description:
      "Shows how each scenario advances step by step, including the message that moves the story from one step to the next.",
    nodes,
    edges
  };
}

function buildLifecycleView(context: ViewerContext): ViewerViewSpec {
  const nodes: ViewerNodeSpec[] = [];
  const edges: ViewerEdgeSpec[] = [];

  for (const aggregateGraph of context.graph.aggregates) {
    const objectSpec = mustGetAggregateObjectSpec(context.objectById, aggregateGraph.objectId);
    const aggregateSpec = mustGet(
      context.aggregateSpecByObjectId,
      aggregateGraph.objectId,
      "aggregate spec"
    );
    const groupId = toLifecycleAggregateGroupId(aggregateGraph.objectId);
    const lifecycleSummary = `initial: ${aggregateGraph.initialState}`;
    const lifecycleGroupBox = measureGroupNodeBox(
      DIMENSIONS.aggregateGroup,
      objectSpec.title,
      aggregateGraph.objectId,
      lifecycleSummary
    );

    nodes.push({
      id: groupId,
      kind: "aggregate",
      label: objectSpec.title,
      subtitle: aggregateGraph.objectId,
      summary: lifecycleSummary,
      ...lifecycleGroupBox,
      details: [
        detail(context, "aggregate.id", aggregateGraph.objectId),
        detail(context, "aggregate.initial_state", aggregateGraph.initialState),
        detail(context, "aggregate.lifecycle", formatTextList(objectSpec.lifecycle)),
        detail(
          context,
          "behavior.accepted_commands",
          formatTextList(
            unique(
              aggregateGraph.transitions.map((transition) => transition.commandType)
            )
          )
        )
      ]
    });

    for (const stateNode of aggregateGraph.states) {
      const refs =
        context.stageRefsByAggregateStateKey.get(
          toAggregateStateKey(aggregateGraph.objectId, stateNode.stateId)
        ) ?? [];
      const lifecycleStateSubtitle = refs.length > 0 ? `used by ${refs.length} stage(s)` : "unbound";
      const lifecycleStateSummary = stateNode.terminal
        ? "terminal"
        : `${stateNode.outgoingCommands.length} command(s)`;
      const lifecycleStateBox = measureLeafNodeBox(
        DIMENSIONS.aggregateState,
        stateNode.stateId,
        lifecycleStateSubtitle,
        lifecycleStateSummary
      );

      nodes.push({
        id: toLifecycleStateId(aggregateGraph.objectId, stateNode.stateId),
        kind: "lifecycle-state",
        label: stateNode.stateId,
        subtitle: lifecycleStateSubtitle,
        summary: lifecycleStateSummary,
        parentId: groupId,
        ...lifecycleStateBox,
        details: [
          detail(context, "aggregate.id", aggregateGraph.objectId),
          detail(context, "aggregate.state.id", stateNode.stateId),
          detail(context, "aggregate.state.reachable", stateNode.reachable ? "yes" : "no"),
          detail(
            context,
            "aggregate.state.outgoing_commands",
            formatTextList(stateNode.outgoingCommands)
          ),
          detail(
            context,
            "aggregate.referenced_by_stages",
            formatTextList(refs)
          )
        ]
      });
    }

    for (const transition of aggregateGraph.transitions) {
      const transitionSpec = aggregateSpec.states[transition.sourceState].on?.[transition.commandType];

      edges.push({
        id: `lifecycle-transition:${aggregateGraph.objectId}:${transition.sourceState}:${transition.commandType}`,
        kind: "state-transition",
        source: toLifecycleStateId(aggregateGraph.objectId, transition.sourceState),
        target: toLifecycleStateId(aggregateGraph.objectId, transition.targetState),
        label: `${transition.commandType} / ${transition.eventType}`,
        details: [
          detail(context, "aggregate.id", aggregateGraph.objectId),
          detail(context, "command.type", transition.commandType),
          detail(context, "event.type", transition.eventType),
          detail(context, "relation.from", transition.sourceState),
          detail(context, "relation.to", transition.targetState),
          detail(
            context,
            "transition.payload_mapping",
            formatStructuredPayloadMapping(transitionSpec?.emit.payloadFrom ?? {})
          )
        ]
      });
    }
  }

  return {
    id: "lifecycle",
    kind: "lifecycle",
    navigation: {
      tier: "primary",
      order: 40
    },
    title: "Lifecycle",
    description:
      "Shows aggregate lifecycle states and transitions, independent of process orchestration.",
    nodes,
    edges
  };
}

function buildMessageFlowView(context: ViewerContext): ViewerViewSpec {
  const nodes: ViewerNodeSpec[] = [];
  const edges: ViewerEdgeSpec[] = [];
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();

  for (const processGraph of context.graph.processes) {
    const processSpec = mustGet(context.processSpecById, processGraph.processId, "process");
    const processGroupId = toMessageFlowScenarioId(processGraph.processId);
    const relatedAggregateIds = unique(
      processGraph.stages
        .filter((stage) => stage.aggregateObjectId)
        .map((stage) => stage.aggregateObjectId as string)
    );
    const traceGroupSummary = "step -> message -> message -> next step";
    const traceGroupBox = measureGroupNodeBox(
      DIMENSIONS.processGroup,
      processSpec.title,
      processGraph.processId,
      traceGroupSummary
    );

    nodes.push({
      id: processGroupId,
      kind: "scenario",
      label: processSpec.title,
      subtitle: processGraph.processId,
      summary: traceGroupSummary,
      ...traceGroupBox,
      details: [
        detail(context, "scenario.id", processGraph.processId),
        detail(context, "scenario.initial_step", processGraph.initialStage),
        detail(context, "scenario.final_steps", formatTextList(processGraph.finalStageIds)),
        detail(
          context,
          "scenario.related_aggregates",
          formatTextList(relatedAggregateIds)
        )
      ]
    });
    nodeIds.add(processGroupId);

    for (const stageNode of processGraph.stages) {
      const stageSpec = processSpec.stages[stageNode.stageId];
      const stageId = toMessageFlowStepId(processGraph.processId, stageNode.stageId);
      const traceStageSummary = stageNode.final
        ? (stageSpec.outcome ?? "final outcome")
        : `${stageNode.acceptedCommands.length} command(s), ${stageNode.observedEvents.length} event(s)`;
      const traceStageBox = measureLeafNodeBox(
        stageNode.final ? DIMENSIONS.finalStage : DIMENSIONS.stage,
        stageSpec.title,
        stageNode.stageId,
        traceStageSummary
      );

      if (!nodeIds.has(stageId)) {
        nodes.push({
          id: stageId,
          kind: "scenario-step",
          label: stageSpec.title,
          subtitle: stageNode.stageId,
          summary: traceStageSummary,
          parentId: processGroupId,
          ...traceStageBox,
          details: [
            detail(context, "step.id", stageNode.stageId),
            ...(stageNode.aggregateObjectId && stageNode.aggregateStateId
              ? [
                  detail(context, "step.bound_aggregate", stageNode.aggregateObjectId),
                  detail(context, "step.bound_state", stageNode.aggregateStateId)
                ]
              : []),
            detail(
              context,
              "behavior.accepted_commands",
              formatTextList(stageNode.acceptedCommands)
            ),
            detail(
              context,
              "behavior.observed_events",
              formatTextList(stageNode.observedEvents)
            ),
            ...(stageSpec.outcome ? [detail(context, "step.outcome", stageSpec.outcome)] : [])
          ]
        });
        nodeIds.add(stageId);
      }

      if (stageNode.final) {
        continue;
      }

      const binding = getStageBinding(context, processSpec, stageNode.stageId);
      const stateTransitions = binding ? Object.entries(binding.state.on ?? {}) : [];

      for (const [commandType, transition] of stateTransitions) {
        const commandSpec = mustGet(context.commandByType, commandType, "command");
        const eventSpec = mustGet(context.eventByType, transition.emit.type, "event");
        const commandNodeId = toMessageFlowCommandId(
          processGraph.processId,
          stageNode.stageId,
          commandType
        );
        const eventNodeId = toMessageFlowEventId(
          processGraph.processId,
          stageNode.stageId,
          transition.emit.type
        );
        const targetStageId = stageSpec.advancesOn?.[transition.emit.type];
        const commandSubtitle = binding
          ? `${binding.aggregate.objectId}.${binding.stateId} -> ${transition.target}`
          : undefined;
        const eventSummary = targetStageId
          ? `advances to ${targetStageId}`
          : "unhandled in scenario";
        const commandBox = measureLeafNodeBox(
          DIMENSIONS.command,
          commandType,
          commandSubtitle ?? "command",
          commandSpec.description
        );
        const eventBox = measureLeafNodeBox(
          DIMENSIONS.event,
          transition.emit.type,
          "event",
          eventSummary
        );

        if (!nodeIds.has(commandNodeId)) {
          nodes.push({
            id: commandNodeId,
            kind: "message",
            label: commandType,
            subtitle: commandSubtitle ?? "command",
            summary: commandSpec.description,
            parentId: processGroupId,
            ...commandBox,
            details: [
              detail(context, "message.kind", "command"),
              detail(context, "message.type", commandType),
              detail(context, "command.target_aggregate", commandSpec.target),
              detail(
                context,
                "command.payload_fields",
                formatPayloadFields(
                  commandSpec.payload.fields,
                  mustGet(context.objectById, commandSpec.target, "command target object")
                )
              ),
              detail(context, "entity.description", commandSpec.description),
              ...(binding
                ? [
                    detail(
                      context,
                      "transition.from_state",
                      `${binding.aggregate.objectId}.${binding.stateId}`
                    ),
                    detail(
                      context,
                      "transition.to_state",
                      `${binding.aggregate.objectId}.${transition.target}`
                    )
                  ]
                : [])
            ]
          });
          nodeIds.add(commandNodeId);
        }

        if (!nodeIds.has(eventNodeId)) {
          nodes.push({
            id: eventNodeId,
            kind: "message",
            label: transition.emit.type,
            subtitle: "event",
            summary: eventSummary,
            parentId: processGroupId,
            ...eventBox,
            details: [
              detail(context, "message.kind", "event"),
              detail(context, "message.type", transition.emit.type),
              detail(context, "event.source_aggregate", eventSpec.source),
              detail(
                context,
                "event.payload_fields",
                formatPayloadFields(
                  eventSpec.payload.fields,
                  mustGet(context.objectById, eventSpec.source, "event source object")
                )
              ),
              detail(context, "entity.description", eventSpec.description),
              detail(context, "event.observed_by_step", targetStageId ? "yes" : "no"),
              ...(targetStageId
                ? [detail(context, "event.advances_to_step", targetStageId)]
                : [])
            ]
          });
          nodeIds.add(eventNodeId);
        }

        pushEdge(
          edges,
          edgeIds,
          {
            id: `message-flow-command:${processGraph.processId}:${stageNode.stageId}:${commandType}`,
            kind: "message-flow",
            source: stageId,
            target: commandNodeId,
            label: "issues",
            details: [
              detail(context, "step.id", stageNode.stageId),
              detail(context, "message.kind", "command"),
              detail(context, "message.type", commandType)
            ]
          }
        );

        pushEdge(
          edges,
          edgeIds,
          {
            id: `message-flow-event:${processGraph.processId}:${stageNode.stageId}:${commandType}`,
            kind: "message-flow",
            source: commandNodeId,
            target: eventNodeId,
            label: "emits",
            details: [
              detail(context, "command.type", commandType),
              detail(context, "event.type", transition.emit.type)
            ]
          }
        );

        if (targetStageId) {
          pushEdge(
            edges,
            edgeIds,
            {
              id: `message-flow-advance:${processGraph.processId}:${stageNode.stageId}:${transition.emit.type}`,
              kind: "message-flow",
              source: eventNodeId,
              target: toMessageFlowStepId(processGraph.processId, targetStageId),
              label: "advances",
              details: [
                detail(context, "message.kind", "event"),
                detail(context, "message.type", transition.emit.type),
                detail(context, "relation.to", targetStageId)
              ]
            }
          );
        }
      }
    }
  }

  return {
    id: "message-flow",
    kind: "message-flow",
    navigation: {
      tier: "primary",
      order: 30
    },
    title: "Message Flow / Trace",
    description:
      "Shows how each scenario step issues commands, which events those commands emit, and where those events move the story next.",
    nodes,
    edges
  };
}

function buildDomainStructureView(context: ViewerContext): ViewerViewSpec {
  const nodes: ViewerNodeSpec[] = [];
  const ownedObjectIdsByAggregateId = collectDomainStructureOwnedObjectIds(
    context.spec,
    context.domainStructureEdges
  );
  const aggregateOwnerByObjectId = new Map<string, string>();

  for (const [aggregateId, objectIds] of ownedObjectIdsByAggregateId.entries()) {
    const objectSpec = mustGetAggregateObjectSpec(context.objectById, aggregateId);
    const groupedObjectIds = objectIds.filter((objectId) => objectId !== aggregateId);
    const presentation = createDomainStructureAggregatePresentation(
      context,
      aggregateId,
      objectIds
    );
    const groupBox = measureGroupNodeBox(
      DIMENSIONS.aggregateGroup,
      `${objectSpec.title} Aggregate`,
      `root ${aggregateId}`,
      presentation.summary
    );

    nodes.push({
      id: toDomainStructureAggregateGroupId(aggregateId),
      kind: "aggregate",
      label: `${objectSpec.title} Aggregate`,
      subtitle: `root ${aggregateId}`,
      summary: presentation.summary,
      ...groupBox,
      details: [
        detail(context, "aggregate.id", aggregateId),
        detail(context, "aggregate.root_object", presentation.rootObjectId),
        detail(context, "aggregate.owned_objects", formatList(presentation.ownedObjectIds)),
        detail(context, "aggregate.shared_types", formatList(presentation.sharedTypeIds)),
        detail(
          context,
          "aggregate.external_dependencies",
          formatList(presentation.externalDependencyRefs)
        ),
        detail(context, "aggregate.lifecycle_field", objectSpec.lifecycleField),
        detail(context, "aggregate.lifecycle", formatList(objectSpec.lifecycle)),
        detail(
          context,
          "object.referenced_by",
          formatList(context.incomingStructureRefsByObjectId.get(aggregateId) ?? [])
        )
      ]
    });

    for (const objectId of groupedObjectIds) {
      aggregateOwnerByObjectId.set(objectId, aggregateId);
    }
  }

  const sharedTypeIds = context.spec.domain.objects
    .filter(isEnumObjectSpec)
    .map((object) => object.id)
    .filter((objectId) => !aggregateOwnerByObjectId.has(objectId));

  if (sharedTypeIds.length > 0) {
    const sharedTypesSummary = `${sharedTypeIds.length} enum(s), ${countSharedTypeConsumers(
      context,
      sharedTypeIds
    )} consumer(s)`;
    const sharedTypesBox = measureGroupNodeBox(
      DIMENSIONS.aggregateGroup,
      "Shared Types",
      "shared domain enums",
      sharedTypesSummary
    );

    nodes.push({
      id: DOMAIN_SHARED_TYPES_GROUP_ID,
      kind: "shared-type-group",
      label: "Shared Types",
      subtitle: "shared domain enums",
      summary: sharedTypesSummary,
      ...sharedTypesBox,
      details: [
        detail(context, "domain.shared_types", formatList(sharedTypeIds)),
        detail(
          context,
          "domain.shared_type_consumers",
          formatList(formatSharedTypeConsumers(context, sharedTypeIds))
        )
      ]
    });
  }

  for (const object of context.spec.domain.objects) {
    if (isEntityObjectSpec(object)) {
      const relationCount = countDomainStructureRelations(object);
      const summary = `${object.fields.length} field(s), ${relationCount} relation(s)`;
      const subtitle = hasAggregateLifecycle(object)
        ? `lifecycle: ${object.lifecycleField}`
        : object.id;
      const entityBox = measureLeafNodeBox(
        DIMENSIONS.domainEntity,
        object.title,
        subtitle,
        summary
      );

      nodes.push({
        id: toDomainStructureObjectId(object.id),
        kind: "entity",
        label: object.title,
        subtitle,
        summary,
        parentId: toDomainStructureAggregateGroupId(object.id),
        ...entityBox,
        details: [
          detail(context, "object.id", object.id),
          detail(context, "object.role", object.role),
          detail(context, "object.fields", formatDomainFields(object.fields, object)),
          detail(context, "object.relations", formatDomainRelations(object.relations ?? [])),
          detail(
            context,
            "object.referenced_by",
            formatList(context.incomingStructureRefsByObjectId.get(object.id) ?? [])
          ),
          ...(hasAggregateLifecycle(object)
            ? [
                detail(context, "aggregate.lifecycle_field", object.lifecycleField),
                detail(context, "aggregate.lifecycle", formatList(object.lifecycle))
              ]
            : [])
        ]
      });

      continue;
    }

    if (hasObjectFields(object)) {
      const relationCount = countDomainStructureRelations(object);
      const summary = `${object.fields.length} field(s), ${relationCount} relation(s)`;
      const valueObjectBox = measureLeafNodeBox(
        DIMENSIONS.domainEntity,
        object.title,
        object.id,
        summary
      );

      nodes.push({
        id: toDomainStructureObjectId(object.id),
        kind: "value-object",
        label: object.title,
        subtitle: object.id,
        summary,
        ...(aggregateOwnerByObjectId.has(object.id)
          ? {
              parentId: toDomainStructureAggregateGroupId(
                mustGet(aggregateOwnerByObjectId, object.id, "aggregate owner")
              )
            }
          : {}),
        ...valueObjectBox,
        details: [
          detail(context, "object.id", object.id),
          detail(context, "object.role", object.role),
          detail(context, "object.fields", formatDomainFields(object.fields, object)),
          detail(context, "object.relations", formatDomainRelations(object.relations ?? [])),
          detail(
            context,
            "object.referenced_by",
            formatList(context.incomingStructureRefsByObjectId.get(object.id) ?? [])
          )
        ]
      });

      continue;
    }

    if (isEnumObjectSpec(object)) {
      const enumBox = measureLeafNodeBox(
        DIMENSIONS.domainEnum,
        object.title,
        getEnumSubtitle(context, object),
        getEnumSummary(context, object)
      );

      nodes.push({
        id: toDomainStructureObjectId(object.id),
        kind: "enum",
        label: object.title,
        subtitle: getEnumSubtitle(context, object),
        summary: getEnumSummary(context, object),
        ...(aggregateOwnerByObjectId.has(object.id)
          ? {
              parentId: toDomainStructureAggregateGroupId(
                mustGet(aggregateOwnerByObjectId, object.id, "aggregate owner")
              )
            }
          : sharedTypeIds.length > 0
            ? {
                parentId: DOMAIN_SHARED_TYPES_GROUP_ID
              }
          : {}),
        ...enumBox,
        details: [
          detail(context, "object.id", object.id),
          detail(context, "object.role", object.role),
          detail(context, "enum.values", formatList(object.values)),
          detail(
            context,
            "object.referenced_by",
            formatList(context.incomingStructureRefsByObjectId.get(object.id) ?? [])
          )
        ]
      });
      continue;
    }

    throw new Error(`Unsupported domain object role ${(object as { role: string }).role}`);
  }

  return {
    id: "domain-structure",
    kind: "domain-structure",
    navigation: {
      tier: "secondary",
      order: 50
    },
    title: "Aggregate Boundary / Domain Structure",
    description:
      "Shows aggregate roots with owned objects, plus a dedicated shared-types lane for enums and other cross-aggregate structure references.",
    nodes,
    edges: context.domainStructureEdges.map((edge) =>
      toViewerDomainStructureEdge(context, edge)
    )
  };
}

function collectDomainStructureEdges(
  spec: BusinessSpec
): readonly DomainStructureEdgeModel[] {
  const edges: DomainStructureEdgeModel[] = [];

  for (const object of spec.domain.objects) {
    if (!hasObjectFields(object)) {
      continue;
    }

    for (const relation of object.relations ?? []) {
      edges.push(buildExplicitDomainStructureEdgeModel(object, relation));
    }

    for (const field of object.fields) {
      const ref = field.ref;

      if (!ref) {
        continue;
      }

      edges.push(buildFieldDomainStructureEdgeModel(object, field, ref));
    }
  }

  return edges;
}

function buildExplicitDomainStructureEdgeModel(
  sourceObject: ObjectSpec,
  relation: RelationSpec
): DomainStructureEdgeModel {
  return {
    id: toDomainStructureRelationEdgeId(sourceObject.id, relation.id),
    kind: relation.kind,
    sourceObjectId: sourceObject.id,
    targetObjectId: relation.target,
    label: toReadableDomainStructureLabel(relation.id),
    relationId: relation.id,
    ...(relation.cardinality ? { cardinality: relation.cardinality } : {}),
    ...(relation.description ? { description: relation.description } : {})
  };
}

function buildFieldDomainStructureEdgeModel(
  sourceObject: Extract<ObjectSpec, { role: "entity" | "value-object" }>,
  field: FieldSpec,
  ref: FieldRefSpec
): DomainStructureEdgeModel {
  const targetObjectId = ref.objectId;
  const description = resolveFieldDescription(field, sourceObject);

  return {
    id: toDomainStructureFieldEdgeId(sourceObject.id, field.id, targetObjectId),
    kind: toViewerEdgeKindFromFieldRef(ref.kind),
    sourceObjectId: sourceObject.id,
    targetObjectId,
    label: toReadableDomainStructureLabel(field.id),
    fieldId: field.id,
    cardinality: toDomainStructureFieldCardinality(field, ref),
    ...(description ? { description } : {})
  };
}

function toViewerDomainStructureEdge(
  context: ViewerContext,
  edge: DomainStructureEdgeModel
): ViewerEdgeSpec {
  return {
    id: edge.id,
    kind: edge.kind,
    source: toDomainStructureObjectId(edge.sourceObjectId),
    target: toDomainStructureObjectId(edge.targetObjectId),
    label: edge.label,
    ...(edge.cardinality ? { cardinality: edge.cardinality } : {}),
    ...(edge.description ? { description: edge.description } : {}),
    details: [
      detail(context, "relation.kind", edge.kind),
      detail(context, "relation.from", edge.sourceObjectId),
      detail(context, "relation.to", edge.targetObjectId),
      ...(edge.fieldId ? [detail(context, "relation.field", edge.fieldId)] : []),
      ...(edge.cardinality
        ? [detail(context, "relation.cardinality", edge.cardinality)]
        : []),
      ...(edge.description
        ? [detail(context, "relation.description", edge.description)]
        : [])
    ]
  };
}

function collectIncomingStructureRefs(
  edges: readonly DomainStructureEdgeModel[]
): ReadonlyMap<string, readonly string[]> {
  const refs = new Map<string, string[]>();

  for (const edge of edges) {
    pushIncomingStructureRef(
      refs,
      edge.targetObjectId,
      formatIncomingRelationRef(edge)
    );
  }

  return refs;
}

function collectDomainStructureOwnedObjectIds(
  spec: BusinessSpec,
  edges: readonly DomainStructureEdgeModel[]
): ReadonlyMap<string, readonly string[]> {
  const aggregateIds = spec.domain.aggregates.map((aggregate) => aggregate.objectId);
  const adjacency = new Map<string, string[]>();
  const groupMembersByAggregateId = new Map<string, string[]>(
    aggregateIds.map((aggregateId) => [aggregateId, [aggregateId]])
  );

  for (const edge of edges) {
    if (edge.kind !== "composition") {
      continue;
    }

    adjacency.set(edge.sourceObjectId, [
      ...(adjacency.get(edge.sourceObjectId) ?? []),
      edge.targetObjectId
    ]);
  }

  for (const aggregateId of aggregateIds) {
    const visited = new Set<string>([aggregateId]);
    const queue = [...(adjacency.get(aggregateId) ?? [])];

    while (queue.length > 0) {
      const objectId = queue.shift() as string;

      if (visited.has(objectId)) {
        continue;
      }

      visited.add(objectId);
      groupMembersByAggregateId.set(aggregateId, [
        ...(groupMembersByAggregateId.get(aggregateId) ?? [aggregateId]),
        objectId
      ]);
      queue.push(...(adjacency.get(objectId) ?? []));
    }
  }

  return new Map(
    [...groupMembersByAggregateId.entries()].map(([aggregateId, objectIds]) => [
      aggregateId,
      unique(objectIds)
    ])
  );
}

function pushIncomingStructureRef(
  refs: Map<string, string[]>,
  targetObjectId: string,
  value: string
): void {
  refs.set(targetObjectId, unique([...(refs.get(targetObjectId) ?? []), value]));
}

function toViewerEdgeKindFromFieldRef(
  kind: FieldRefSpec["kind"]
): Extract<ViewerEdgeSpec["kind"], "association" | "composition" | "reference"> {
  switch (kind) {
    case "enum":
      return "association";
    case "composition":
      return "composition";
    case "reference":
      return "reference";
  }
}

function toDomainStructureFieldCardinality(field: FieldSpec, ref: FieldRefSpec): string {
  if (ref.cardinality) {
    return ref.cardinality;
  }

  return field.required ? "1" : "0..1";
}

function formatIncomingRelationRef(edge: DomainStructureEdgeModel): string {
  const edgeId = edge.relationId ?? edge.fieldId ?? edge.label;
  const fieldSuffix =
    edge.relationId && edge.fieldId ? ` via ${edge.fieldId}` : "";

  return `${edge.sourceObjectId}.${edgeId} [${edge.kind}${fieldSuffix}]`;
}

function toReadableDomainStructureLabel(identifier: string): string {
  return identifier
    .replace(/([A-Z]+)([A-Z][a-z0-9]+)/g, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function getStageBinding(
  context: ViewerContext,
  processSpec: ProcessSpec,
  stageId: string
):
  | {
      aggregate: AggregateSpec;
      stateId: string;
      state: AggregateSpec["states"][string];
    }
  | undefined {
  const stageSpec = processSpec.stages[stageId];

  if (stageSpec.final || !stageSpec.aggregate || !stageSpec.state) {
    return undefined;
  }

  const objectId = processSpec.uses.aggregates[stageSpec.aggregate];
  const aggregate = mustGet(context.aggregateSpecByObjectId, objectId, "aggregate spec");
  const state = aggregate.states[stageSpec.state];

  if (!state) {
    throw new Error(
      `Process ${processSpec.id} stage ${stageId} references unknown state ${objectId}.${stageSpec.state}`
    );
  }

  return {
    aggregate,
    stateId: stageSpec.state,
    state
  };
}

function collectStageRefsByAggregateState(
  graph: BusinessGraph,
  spec: BusinessSpec
): ReadonlyMap<string, readonly string[]> {
  const refs = new Map<string, string[]>();
  const processSpecById = toMap(spec.domain.processes, (process) => process.id);

  for (const processGraph of graph.processes) {
    const processSpec = mustGet(processSpecById, processGraph.processId, "process spec");

    for (const stage of processGraph.stages) {
      if (!stage.aggregateObjectId || !stage.aggregateStateId) {
        continue;
      }

      const key = toAggregateStateKey(stage.aggregateObjectId, stage.aggregateStateId);
      const stageTitle = processSpec.stages[stage.stageId].title;
      const value = `${processGraph.processId}.${stage.stageId} (${stageTitle})`;
      const existing = refs.get(key) ?? [];

      refs.set(key, [...existing, value]);
    }
  }

  return refs;
}

function pushEdge(edges: ViewerEdgeSpec[], edgeIds: Set<string>, edge: ViewerEdgeSpec): void {
  if (edgeIds.has(edge.id)) {
    return;
  }

  edges.push(edge);
  edgeIds.add(edge.id);
}

function toContextMapContextId(contextId: string): string {
  return `context-map:context:${contextId}`;
}

function toContextMapAggregateId(objectId: string): string {
  return `context-map:aggregate:${objectId}`;
}

function toContextMapScenarioId(processId: string): string {
  return `context-map:scenario:${processId}`;
}

function toScenarioStoryScenarioId(processId: string): string {
  return `scenario-story:scenario:${processId}`;
}

function toLifecycleAggregateGroupId(objectId: string): string {
  return `lifecycle:aggregate:${objectId}`;
}

function toLifecycleStateId(objectId: string, stateId: string): string {
  return `lifecycle:aggregate:${objectId}:state:${stateId}`;
}

function toScenarioStoryStepId(processId: string, stageId: string): string {
  return `scenario-story:scenario:${processId}:step:${stageId}`;
}

function toMessageFlowScenarioId(processId: string): string {
  return `message-flow:scenario:${processId}`;
}

function toMessageFlowStepId(processId: string, stageId: string): string {
  return `message-flow:scenario:${processId}:step:${stageId}`;
}

function toMessageFlowCommandId(processId: string, stageId: string, commandType: string): string {
  return `message-flow:scenario:${processId}:step:${stageId}:message:command:${commandType}`;
}

function toMessageFlowEventId(processId: string, stageId: string, eventType: string): string {
  return `message-flow:scenario:${processId}:step:${stageId}:message:event:${eventType}`;
}

function toDomainStructureAggregateGroupId(objectId: string): string {
  return `domain-structure:aggregate:${objectId}`;
}

function toDomainStructureObjectId(objectId: string): string {
  return `domain-structure:object:${objectId}`;
}

function toDomainStructureRelationEdgeId(sourceObjectId: string, relationId: string): string {
  return `domain-structure:${sourceObjectId}:relation:${relationId}`;
}

function toDomainStructureFieldEdgeId(
  sourceObjectId: string,
  fieldId: string,
  targetObjectId: string
): string {
  return `domain-structure:${sourceObjectId}:field:${fieldId}:target:${targetObjectId}`;
}

function toDomainStructureFieldEdgeKey(
  kind: "association" | "reference" | RelationSpec["kind"],
  fieldId: string,
  targetObjectId: string
): string {
  return `${kind}:${fieldId}:${targetObjectId}`;
}

function createDomainStructureAggregatePresentation(
  context: ViewerContext,
  aggregateId: string,
  objectIds: readonly string[]
): DomainStructureAggregatePresentation {
  const ownedObjectIds = objectIds.filter((objectId) => objectId !== aggregateId);
  const memberObjectIds = new Set(objectIds);
  const sharedTypeIds = unique(
    context.domainStructureEdges
      .filter(
        (edge) =>
          memberObjectIds.has(edge.sourceObjectId) &&
          !memberObjectIds.has(edge.targetObjectId) &&
          isEnumObjectSpec(mustGet(context.objectById, edge.targetObjectId, "object"))
      )
      .map((edge) => edge.targetObjectId)
  );
  const externalDependencyIds = unique(
    context.domainStructureEdges
      .filter(
        (edge) =>
          memberObjectIds.has(edge.sourceObjectId) &&
          !memberObjectIds.has(edge.targetObjectId) &&
          !sharedTypeIds.includes(edge.targetObjectId)
      )
      .map((edge) => edge.targetObjectId)
  );
  const externalDependencyRefs = unique(
    context.domainStructureEdges
      .filter(
        (edge) =>
          memberObjectIds.has(edge.sourceObjectId) &&
          !memberObjectIds.has(edge.targetObjectId) &&
          !sharedTypeIds.includes(edge.targetObjectId)
      )
      .map((edge) => formatAggregateDependencyRef(edge))
  );

  return {
    rootObjectId: aggregateId,
    ownedObjectIds,
    sharedTypeIds,
    externalDependencyIds,
    externalDependencyRefs,
    summary: formatAggregateSummary({
      ownedObjectCount: ownedObjectIds.length,
      sharedTypeCount: sharedTypeIds.length,
      externalDependencyCount: externalDependencyIds.length
    })
  };
}

function formatAggregateSummary(input: {
  ownedObjectCount: number;
  sharedTypeCount: number;
  externalDependencyCount: number;
}): string {
  const fragments = [
    input.ownedObjectCount > 0
      ? `root + ${input.ownedObjectCount} owned object(s)`
      : "root only"
  ];

  if (input.sharedTypeCount > 0) {
    fragments.push(`${input.sharedTypeCount} shared type(s)`);
  }

  if (input.externalDependencyCount > 0) {
    fragments.push(`${input.externalDependencyCount} external reference(s)`);
  }

  return fragments.join(", ");
}

function formatAggregateDependencyRef(edge: DomainStructureEdgeModel): string {
  const fieldSuffix = edge.fieldId ? ` via ${edge.fieldId}` : "";

  return `${edge.targetObjectId} [${edge.kind}${fieldSuffix}]`;
}

function getEnumSubtitle(
  context: ViewerContext,
  object: Extract<ObjectSpec, { role: "enum" }>
): string {
  const lifecycleAggregateId = findLifecycleAggregateIdForEnum(context, object.id);

  if (lifecycleAggregateId) {
    return `lifecycle type for ${lifecycleAggregateId}`;
  }

  return object.id;
}

function getEnumSummary(
  context: ViewerContext,
  object: Extract<ObjectSpec, { role: "enum" }>
): string {
  const consumerCount = countSharedTypeConsumers(context, [object.id]);

  return consumerCount > 0
    ? `${object.values.length} value(s), ${consumerCount} consumer(s)`
    : `${object.values.length} value(s)`;
}

function countSharedTypeConsumers(
  context: ViewerContext,
  sharedTypeIds: readonly string[]
): number {
  return unique(
    context.domainStructureEdges
      .filter((edge) => sharedTypeIds.includes(edge.targetObjectId))
      .map((edge) => edge.sourceObjectId)
  ).length;
}

function formatSharedTypeConsumers(
  context: ViewerContext,
  sharedTypeIds: readonly string[]
): readonly string[] {
  return sharedTypeIds.flatMap((objectId) =>
    (context.incomingStructureRefsByObjectId.get(objectId) ?? []).map(
      (value) => `${objectId}: ${value}`
    )
  );
}

function findLifecycleAggregateIdForEnum(
  context: ViewerContext,
  enumObjectId: string
): string | undefined {
  const matchingAggregateIds = context.spec.domain.aggregates
    .map((aggregate) => aggregate.objectId)
    .filter((aggregateId) => isLifecycleEnumForAggregate(context, aggregateId, enumObjectId));

  return matchingAggregateIds.length === 1 ? matchingAggregateIds[0] : undefined;
}

function isLifecycleEnumForAggregate(
  context: ViewerContext,
  aggregateId: string,
  enumObjectId: string
): boolean {
  const object = mustGetAggregateObjectSpec(context.objectById, aggregateId);
  const lifecycleField = object.fields.find((field) => field.id === object.lifecycleField);

  if (!lifecycleField?.ref || lifecycleField.ref.kind !== "enum") {
    return false;
  }

  if (lifecycleField.ref.objectId !== enumObjectId) {
    return false;
  }

  const enumObject = mustGet(context.objectById, enumObjectId, "object");

  return (
    isEnumObjectSpec(enumObject) &&
    enumObject.values.length === object.lifecycle.length &&
    enumObject.values.every((value, index) => value === object.lifecycle[index])
  );
}

function toAggregateStateKey(objectId: string, stateId: string): string {
  return `${objectId}:${stateId}`;
}

function detail(
  context: ViewerContext,
  semanticKey: string,
  value: ViewerDetailValue | string
): ViewerDetailItem {
  return {
    semanticKey,
    label: getViewerDetailSemantic(context.spec, semanticKey).label,
    value: typeof value === "string" ? textDetailValue(value) : value
  };
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

function formatList(values: readonly string[]): string {
  return values.length > 0 ? values.join(", ") : "none";
}

function formatTextList(values: readonly string[]): ViewerDetailValue {
  if (values.length === 0) {
    return textDetailValue("none");
  }

  return listDetailValue(values.map((value) => textDetailValue(value)));
}

function formatStructuredPayloadMapping(
  payloadFrom: Readonly<Record<string, string>>
): ViewerDetailValue {
  const pairs = Object.entries(payloadFrom);

  if (pairs.length === 0) {
    return textDetailValue("none");
  }

  return listDetailValue(
    pairs.map(([fieldId, source]) =>
      recordDetailValue([
        recordDetailEntry("Field", textDetailValue(fieldId)),
        recordDetailEntry("From", textDetailValue(source))
      ])
    )
  );
}

function formatPayloadFields(
  fields: readonly {
    id: string;
    type: string;
    required: boolean;
    description?: string;
  }[],
  object?: ObjectSpec
): ViewerDetailValue {
  if (fields.length === 0) {
    return textDetailValue("none");
  }

  return listDetailValue(
    fields.map((field) =>
      fieldDetailValue({
        name: field.id,
        fieldType: field.type,
        required: field.required,
        description: resolveFieldDescription(field, object) ?? "No description available."
      })
    )
  );
}

function formatDomainFields(
  fields: readonly FieldSpec[],
  object?: ObjectSpec
): ViewerDetailValue {
  if (fields.length === 0) {
    return textDetailValue("none");
  }

  return listDetailValue(
    fields.map((field) =>
      fieldDetailValue({
        name: field.id,
        fieldType: field.type,
        required: field.required,
        description: resolveFieldDescription(field, object) ?? "No description available.",
        relation: toFieldRelationDetailValue(field.ref)
      })
    )
  );
}

function formatDomainRelations(relations: readonly RelationSpec[]): ViewerDetailValue {
  if (relations.length === 0) {
    return textDetailValue("none");
  }

  return listDetailValue(
    relations.map((relation) =>
      recordDetailValue([
        recordDetailEntry("Relation", textDetailValue(relation.id)),
        recordDetailEntry("Type", textDetailValue(relation.kind)),
        recordDetailEntry("Target", textDetailValue(relation.target)),
        ...(relation.cardinality
          ? [recordDetailEntry("Cardinality", textDetailValue(relation.cardinality))]
          : []),
        ...(relation.description
          ? [recordDetailEntry("Description", textDetailValue(relation.description))]
          : [])
      ])
    )
  );
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

function recordDetailEntry(label: string, value: ViewerDetailValue): {
  label: string;
  value: ViewerDetailValue;
} {
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
  relation?: {
    kind: "reference" | "composition" | "enum";
    target: string;
    cardinality?: string;
  };
}): ViewerDetailValue {
  return {
    kind: "field",
    name: input.name,
    fieldType: input.fieldType,
    required: input.required,
    ...(input.description ? { description: input.description } : {}),
    ...(input.relation ? { relation: input.relation } : {})
  };
}

function toFieldRelationDetailValue(
  ref: FieldRefSpec | undefined
):
  | {
      kind: "reference" | "composition" | "enum";
      target: string;
      cardinality?: string;
    }
  | undefined {
  if (!ref) {
    return undefined;
  }

  return {
    kind: ref.kind,
    target: ref.objectId,
    ...(ref.cardinality ? { cardinality: ref.cardinality } : {})
  };
}

function countDomainStructureRelations(
  object: Extract<ObjectSpec, { role: "entity" | "value-object" }>
): number {
  return (object.relations?.length ?? 0) + object.fields.filter((field) => field.ref).length;
}

function toMap<Value, Key extends string>(
  values: readonly Value[],
  getKey: (value: Value) => Key
): Map<Key, Value> {
  return new Map(values.map((value) => [getKey(value), value] as const));
}

function mustGet<Key, Value>(map: ReadonlyMap<Key, Value>, key: Key, label: string): Value {
  const value = map.get(key);

  if (!value) {
    throw new Error(`Unknown ${label} ${String(key)}`);
  }

  return value;
}

function mustGetAggregateObjectSpec(
  objectById: ReadonlyMap<string, ObjectSpec>,
  objectId: string
): Extract<ObjectSpec, { role: "entity" }> & {
  lifecycleField: string;
  lifecycle: readonly string[];
} {
  const object = mustGet(objectById, objectId, "object");

  if (!hasAggregateLifecycle(object)) {
    throw new Error(`Aggregate ${objectId} must bind to entity object with lifecycle`);
  }

  return object;
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
