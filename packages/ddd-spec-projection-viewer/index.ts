import type {
  AggregateSpec,
  BusinessSpec,
  CommandSpec,
  EventSpec,
  FieldSpec,
  ObjectSpec,
  ProcessSpec,
  RelationSpec
} from "../ddd-spec-core/spec.js";
import {
  isAggregateObjectSpec,
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
  ViewerEdgeSpec,
  ViewerNodeSpec,
  ViewerViewSpec
} from "../ddd-spec-viewer-contract/index.js";
import { BUSINESS_VIEWER_SPEC_VERSION } from "../ddd-spec-viewer-contract/index.js";
import {
  buildSemanticDetailHelp,
  getViewerDetailSemantic
} from "./viewer-semantic-help.js";

const DIMENSIONS = {
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

export function buildBusinessViewerSpec(
  spec: BusinessSpec,
  graph: BusinessGraph
): BusinessViewerSpec {
  const context = createViewerContext(spec, graph);
  const views = [
    buildCompositionView(context),
    buildLifecycleView(context),
    buildTraceView(context),
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

function buildCompositionView(context: ViewerContext): ViewerViewSpec {
  const nodes: ViewerNodeSpec[] = [];
  const edges: ViewerEdgeSpec[] = [];
  const aggregateGroupIds = new Set<string>();
  const aggregateStateNodeIds = new Set<string>();

  for (const processGraph of context.graph.processes) {
    const processSpec = mustGet(context.processSpecById, processGraph.processId, "process");
    const processGroupId = toCompositionProcessGroupId(processGraph.processId);
    const usedAggregateIds = unique(
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
      kind: "process-group",
      label: processSpec.title,
      subtitle: processGraph.processId,
      summary: processSummary,
      ...processGroupBox,
      details: [
        detail(context, "process.id", processGraph.processId),
        detail(context, "process.initial_stage", processGraph.initialStage),
        detail(context, "process.used_aggregates", formatList(usedAggregateIds)),
        detail(context, "process.final_stages", formatList(processGraph.finalStageIds))
      ]
    });

    for (const stageNode of processGraph.stages) {
      const stageSpec = processSpec.stages[stageNode.stageId];
      const acceptedCommands = stageNode.acceptedCommands;
      const observedEvents = stageNode.observedEvents;
      const stageSubtitle = stageNode.final
        ? stageNode.stageId
        : `${stageNode.aggregateObjectId}.${stageNode.aggregateStateId}`;
      const stageSummary = stageNode.final
        ? stageSpec.outcome
        : `${acceptedCommands.length} command(s)`;
      const stageBox = measureLeafNodeBox(
        stageNode.final ? DIMENSIONS.finalStage : DIMENSIONS.stage,
        stageSpec.title,
        stageSubtitle,
        stageSummary
      );

      nodes.push({
        id: toCompositionStageId(processGraph.processId, stageNode.stageId),
        kind: stageNode.final ? "final-stage" : "stage",
        label: stageSpec.title,
        subtitle: stageSubtitle,
        summary: stageSummary,
        parentId: processGroupId,
        ...stageBox,
        details: [
          detail(context, "stage.id", stageNode.stageId),
          detail(context, "stage.final", stageNode.final ? "yes" : "no"),
          ...(stageNode.aggregateObjectId && stageNode.aggregateStateId
            ? [
                detail(context, "aggregate.id", stageNode.aggregateObjectId),
                detail(context, "aggregate.state.id", stageNode.aggregateStateId)
              ]
            : []),
          detail(context, "behavior.accepted_commands", formatList(acceptedCommands)),
          detail(context, "behavior.observed_events", formatList(observedEvents)),
          ...(stageSpec.outcome ? [detail(context, "stage.outcome", stageSpec.outcome)] : [])
        ]
      });

      if (!stageNode.aggregateObjectId || !stageNode.aggregateStateId) {
        continue;
      }

      const objectId = stageNode.aggregateObjectId;
      const stateId = stageNode.aggregateStateId;
      const aggregateGroupId = toCompositionAggregateGroupId(objectId);
      const aggregateStateId = toCompositionAggregateStateId(objectId, stateId);

      if (!aggregateGroupIds.has(aggregateGroupId)) {
        const objectSpec = mustGetAggregateObjectSpec(context.objectById, objectId);
        const lifecycleRefs = [...context.stageRefsByAggregateStateKey.entries()]
          .filter(([key]) => key.startsWith(`${objectId}:`))
          .flatMap(([, refs]) => refs);
        const aggregateSummary = `${objectSpec.lifecycle.length} lifecycle state(s)`;
        const aggregateGroupBox = measureGroupNodeBox(
          DIMENSIONS.aggregateGroup,
          objectSpec.title,
          `aggregate ${objectId}`,
          aggregateSummary
        );

        nodes.push({
          id: aggregateGroupId,
          kind: "aggregate-group",
          label: objectSpec.title,
          subtitle: `aggregate ${objectId}`,
          summary: aggregateSummary,
          ...aggregateGroupBox,
          details: [
            detail(context, "aggregate.id", objectId),
            detail(context, "aggregate.lifecycle_field", objectSpec.lifecycleField),
            detail(context, "aggregate.lifecycle", formatList(objectSpec.lifecycle)),
            detail(
              context,
              "aggregate.referenced_by_stages",
              formatList(unique(lifecycleRefs))
            )
          ]
        });
        aggregateGroupIds.add(aggregateGroupId);
      }

      if (!aggregateStateNodeIds.has(aggregateStateId)) {
        const aggregateGraph = mustGet(
          context.aggregateGraphByObjectId,
          objectId,
          "aggregate graph"
        );
        const stateGraph = mustFind(
          aggregateGraph.states,
          (state) => state.stateId === stateId,
          `aggregate state ${objectId}.${stateId}`
        );
        const emittedEvents = mustGet(
          context.aggregateSpecByObjectId,
          objectId,
          "aggregate spec"
        ).states[stateId];
        const aggregateStateSummary = stateGraph.terminal
          ? "terminal"
          : `${stateGraph.outgoingCommands.length} transition(s)`;
        const aggregateStateBox = measureLeafNodeBox(
          DIMENSIONS.aggregateState,
          stateId,
          objectId,
          aggregateStateSummary
        );

        nodes.push({
          id: aggregateStateId,
          kind: "aggregate-state",
          label: stateId,
          subtitle: objectId,
          summary: aggregateStateSummary,
          parentId: aggregateGroupId,
          ...aggregateStateBox,
          details: [
            detail(context, "aggregate.id", objectId),
            detail(context, "aggregate.state.id", stateId),
            detail(
              context,
              "behavior.accepted_commands",
              formatList(stateGraph.outgoingCommands)
            ),
            detail(
              context,
              "aggregate.state.emitted_events",
              formatList(
                Object.values(emittedEvents.on ?? {}).map((transition) => transition.emit.type)
              )
            ),
            detail(
              context,
              "aggregate.state.bound_by_stages",
              formatList(
                mustGet(
                  context.stageRefsByAggregateStateKey,
                  toAggregateStateKey(objectId, stateId),
                  `stage refs for ${objectId}.${stateId}`
                )
              )
            )
          ]
        });
        aggregateStateNodeIds.add(aggregateStateId);
      }

      edges.push({
        id: `composition-binding:${processGraph.processId}:${stageNode.stageId}:${objectId}:${stateId}`,
        kind: "binding",
        source: toCompositionStageId(processGraph.processId, stageNode.stageId),
        target: aggregateStateId,
        label: "binds",
        details: [
          detail(context, "process.id", processGraph.processId),
          detail(context, "stage.id", stageNode.stageId),
          detail(context, "aggregate.id", objectId),
          detail(context, "aggregate.state.id", stateId)
        ]
      });
    }

    for (const advance of processGraph.advances) {
      edges.push({
        id: `composition-advance:${processGraph.processId}:${advance.sourceStage}:${advance.eventType}`,
        kind: "advance",
        source: toCompositionStageId(processGraph.processId, advance.sourceStage),
        target: toCompositionStageId(processGraph.processId, advance.targetStage),
        label: advance.eventType,
        details: [
          detail(context, "process.id", processGraph.processId),
          detail(context, "event.type", advance.eventType),
          detail(context, "relation.from", advance.sourceStage),
          detail(context, "relation.to", advance.targetStage)
        ]
      });
    }
  }

  return {
    id: "composition",
    kind: "composition",
    title: "Composition",
    description:
      "Shows process stages, aggregate reuse, and which aggregate state each non-final stage binds to.",
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
      kind: "aggregate-group",
      label: objectSpec.title,
      subtitle: aggregateGraph.objectId,
      summary: lifecycleSummary,
      ...lifecycleGroupBox,
      details: [
        detail(context, "aggregate.id", aggregateGraph.objectId),
        detail(context, "aggregate.initial_state", aggregateGraph.initialState),
        detail(context, "aggregate.lifecycle", formatList(objectSpec.lifecycle)),
        detail(
          context,
          "behavior.accepted_commands",
          formatList(
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
        kind: "aggregate-state",
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
            formatList(stateNode.outgoingCommands)
          ),
          detail(context, "aggregate.referenced_by_stages", formatList(refs))
        ]
      });
    }

    for (const transition of aggregateGraph.transitions) {
      const transitionSpec = aggregateSpec.states[transition.sourceState].on?.[transition.commandType];

      edges.push({
        id: `lifecycle-transition:${aggregateGraph.objectId}:${transition.sourceState}:${transition.commandType}`,
        kind: "transition",
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
            formatPayloadMapping(transitionSpec?.emit.payloadFrom ?? {})
          )
        ]
      });
    }
  }

  return {
    id: "lifecycle",
    kind: "lifecycle",
    title: "Lifecycle",
    description:
      "Shows aggregate lifecycle states and transitions, independent of process orchestration.",
    nodes,
    edges
  };
}

function buildTraceView(context: ViewerContext): ViewerViewSpec {
  const nodes: ViewerNodeSpec[] = [];
  const edges: ViewerEdgeSpec[] = [];
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();

  for (const processGraph of context.graph.processes) {
    const processSpec = mustGet(context.processSpecById, processGraph.processId, "process");
    const processGroupId = toTraceProcessGroupId(processGraph.processId);
    const traceGroupSummary = "stage -> command -> event -> next stage";
    const traceGroupBox = measureGroupNodeBox(
      DIMENSIONS.processGroup,
      processSpec.title,
      processGraph.processId,
      traceGroupSummary
    );

    nodes.push({
      id: processGroupId,
      kind: "process-group",
      label: processSpec.title,
      subtitle: processGraph.processId,
      summary: traceGroupSummary,
      ...traceGroupBox,
      details: [
        detail(context, "process.id", processGraph.processId),
        detail(context, "process.initial_stage", processGraph.initialStage),
        detail(context, "process.final_stages", formatList(processGraph.finalStageIds))
      ]
    });
    nodeIds.add(processGroupId);

    for (const stageNode of processGraph.stages) {
      const stageSpec = processSpec.stages[stageNode.stageId];
      const stageId = toTraceStageId(processGraph.processId, stageNode.stageId);
      const traceStageSummary = stageNode.final
        ? stageSpec.outcome
        : `${stageNode.acceptedCommands.length} command(s)`;
      const traceStageBox = measureLeafNodeBox(
        stageNode.final ? DIMENSIONS.finalStage : DIMENSIONS.stage,
        stageSpec.title,
        stageNode.stageId,
        traceStageSummary
      );

      if (!nodeIds.has(stageId)) {
        nodes.push({
          id: stageId,
          kind: stageNode.final ? "final-stage" : "stage",
          label: stageSpec.title,
          subtitle: stageNode.stageId,
          summary: traceStageSummary,
          parentId: processGroupId,
          ...traceStageBox,
          details: [
            detail(context, "stage.id", stageNode.stageId),
            ...(stageNode.aggregateObjectId && stageNode.aggregateStateId
              ? [
                  detail(context, "aggregate.id", stageNode.aggregateObjectId),
                  detail(context, "aggregate.state.id", stageNode.aggregateStateId)
                ]
              : []),
            detail(
              context,
              "behavior.accepted_commands",
              formatList(stageNode.acceptedCommands)
            ),
            detail(context, "behavior.observed_events", formatList(stageNode.observedEvents)),
            ...(stageSpec.outcome ? [detail(context, "stage.outcome", stageSpec.outcome)] : [])
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
        const commandNodeId = toTraceCommandId(processGraph.processId, stageNode.stageId, commandType);
        const eventNodeId = toTraceEventId(processGraph.processId, stageNode.stageId, transition.emit.type);
        const targetStageId = stageSpec.advancesOn?.[transition.emit.type];
        const commandSubtitle = binding
          ? `${binding.aggregate.objectId}.${binding.stateId} -> ${transition.target}`
          : undefined;
        const eventSummary = targetStageId ? `advances to ${targetStageId}` : "unhandled in process";
        const commandBox = measureLeafNodeBox(
          DIMENSIONS.command,
          commandType,
          commandSubtitle,
          commandSpec.description
        );
        const eventBox = measureLeafNodeBox(
          DIMENSIONS.event,
          transition.emit.type,
          eventSpec.source,
          eventSummary
        );

        if (!nodeIds.has(commandNodeId)) {
          nodes.push({
            id: commandNodeId,
            kind: "command",
            label: commandType,
            subtitle: commandSubtitle,
            summary: commandSpec.description,
            parentId: processGroupId,
            ...commandBox,
            details: [
              detail(context, "command.type", commandType),
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
            kind: "event",
            label: transition.emit.type,
            subtitle: eventSpec.source,
            summary: eventSummary,
            parentId: processGroupId,
            ...eventBox,
            details: [
              detail(context, "event.type", transition.emit.type),
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
              detail(context, "event.observed_by_stage", targetStageId ? "yes" : "no"),
              ...(targetStageId
                ? [detail(context, "event.advances_to", targetStageId)]
                : [])
            ]
          });
          nodeIds.add(eventNodeId);
        }

        pushEdge(
          edges,
          edgeIds,
          {
            id: `trace-accepts:${processGraph.processId}:${stageNode.stageId}:${commandType}`,
            kind: "accepts",
            source: stageId,
            target: commandNodeId,
            label: "accepts",
            details: [
              detail(context, "stage.id", stageNode.stageId),
              detail(context, "command.type", commandType)
            ]
          }
        );

        pushEdge(
          edges,
          edgeIds,
          {
            id: `trace-emits:${processGraph.processId}:${stageNode.stageId}:${commandType}`,
            kind: "emits",
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
              id: `trace-advance:${processGraph.processId}:${stageNode.stageId}:${transition.emit.type}`,
              kind: "advance",
              source: eventNodeId,
              target: toTraceStageId(processGraph.processId, targetStageId),
              label: "advances",
              details: [
                detail(context, "event.type", transition.emit.type),
                detail(context, "event.target_stage", targetStageId)
              ]
            }
          );
        }
      }
    }
  }

  return {
    id: "trace",
    kind: "trace",
    title: "Trace",
    description:
      "Shows how each stage accepts commands, which events those commands emit, and how events advance the process.",
    nodes,
    edges
  };
}

function buildDomainStructureView(context: ViewerContext): ViewerViewSpec {
  const nodes: ViewerNodeSpec[] = [];
  const ownedObjectIdsByAggregateId = collectDomainStructureOwnedObjectIds(
    context.spec.domain.objects,
    context.domainStructureEdges
  );
  const aggregateOwnerByObjectId = new Map<string, string>();

  for (const [aggregateId, objectIds] of ownedObjectIdsByAggregateId.entries()) {
    const objectSpec = mustGetAggregateObjectSpec(context.objectById, aggregateId);
    const groupedObjectIds = objectIds.filter((objectId) => objectId !== aggregateId);
    const summary = `${objectIds.length} object(s)`;
    const groupBox = measureGroupNodeBox(
      DIMENSIONS.aggregateGroup,
      objectSpec.title,
      `aggregate ${aggregateId}`,
      summary
    );

    nodes.push({
      id: toDomainStructureAggregateGroupId(aggregateId),
      kind: "aggregate-group",
      label: objectSpec.title,
      subtitle: `aggregate ${aggregateId}`,
      summary,
      ...groupBox,
      details: [
        detail(context, "aggregate.id", aggregateId),
        detail(context, "aggregate.lifecycle_field", objectSpec.lifecycleField),
        detail(context, "aggregate.lifecycle", formatList(objectSpec.lifecycle)),
        detail(context, "object.fields", formatDomainFields(objectSpec.fields, objectSpec)),
        detail(
          context,
          "object.relations",
          formatDomainRelations(objectSpec.relations ?? [])
        ),
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

  for (const object of context.spec.domain.objects) {
    if (isAggregateObjectSpec(object)) {
      const relationCount = object.relations?.length ?? 0;
      const summary = `${object.fields.length} field(s), ${relationCount} relation(s)`;
      const subtitle = `lifecycle: ${object.lifecycleField}`;
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
          detail(context, "aggregate.lifecycle_field", object.lifecycleField),
          detail(context, "aggregate.lifecycle", formatList(object.lifecycle))
        ]
      });

      continue;
    }

    if (isEnumObjectSpec(object)) {
      const enumBox = measureLeafNodeBox(
        DIMENSIONS.domainEnum,
        object.title,
        object.id,
        `${object.values.length} value(s)`
      );

      nodes.push({
        id: toDomainStructureObjectId(object.id),
        kind: "enum",
        label: object.title,
        subtitle: object.id,
        summary: `${object.values.length} value(s)`,
        ...(aggregateOwnerByObjectId.has(object.id)
          ? {
              parentId: toDomainStructureAggregateGroupId(
                mustGet(aggregateOwnerByObjectId, object.id, "aggregate owner")
              )
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
    title: "Domain Structure",
    description:
      "Shows domain objects grouped by aggregate boundaries where possible, with normalized association, composition, and reference edges.",
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
    const explicitFieldEdgeKeys = new Set<string>();

    for (const relation of object.relations ?? []) {
      const edge = buildExplicitDomainStructureEdgeModel(object, relation);

      edges.push(edge);

      if (edge.fieldId) {
        explicitFieldEdgeKeys.add(
          toDomainStructureFieldEdgeKey(edge.kind, edge.fieldId, edge.targetObjectId)
        );
      }
    }

    if (!isAggregateObjectSpec(object)) {
      continue;
    }

    for (const field of object.fields) {
      const kind = toDomainStructureFieldEdgeKind(field);

      if (!kind || !field.target) {
        continue;
      }

      const fieldEdgeKey = toDomainStructureFieldEdgeKey(kind, field.id, field.target);

      if (explicitFieldEdgeKeys.has(fieldEdgeKey)) {
        continue;
      }

      edges.push(buildFieldDomainStructureEdgeModel(object, field, kind));
    }
  }

  return edges;
}

function buildExplicitDomainStructureEdgeModel(
  sourceObject: ObjectSpec,
  relation: RelationSpec
): DomainStructureEdgeModel {
  const boundField = getDomainStructureRelationField(sourceObject, relation);

  return {
    id: toDomainStructureRelationEdgeId(sourceObject.id, relation.id),
    kind: relation.kind,
    sourceObjectId: sourceObject.id,
    targetObjectId: relation.target,
    label: toReadableDomainStructureLabel(relation.id),
    relationId: relation.id,
    ...(relation.field ? { fieldId: relation.field } : {}),
    ...(relation.cardinality
      ? { cardinality: relation.cardinality }
      : boundField
        ? { cardinality: toDomainStructureFieldCardinality(boundField) }
        : {}),
    ...(relation.description
      ? { description: relation.description }
      : boundField
        ? {
            description:
              resolveFieldDescription(boundField, sourceObject) ?? boundField.description
          }
        : {})
  };
}

function buildFieldDomainStructureEdgeModel(
  sourceObject: Extract<ObjectSpec, { role: "aggregate" }>,
  field: FieldSpec,
  kind: Extract<ViewerEdgeSpec["kind"], "association" | "reference">
): DomainStructureEdgeModel {
  const targetObjectId = field.target as string;
  const description = resolveFieldDescription(field, sourceObject);

  return {
    id: toDomainStructureFieldEdgeId(sourceObject.id, field.id, targetObjectId),
    kind,
    sourceObjectId: sourceObject.id,
    targetObjectId,
    label: toReadableDomainStructureLabel(field.id),
    fieldId: field.id,
    cardinality: toDomainStructureFieldCardinality(field),
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
  objects: readonly ObjectSpec[],
  edges: readonly DomainStructureEdgeModel[]
): ReadonlyMap<string, readonly string[]> {
  const aggregateIds = new Set(
    objects.filter(isAggregateObjectSpec).map((object) => object.id)
  );
  const ownerCandidatesByObjectId = new Map<string, string[]>();
  const groupMembersByAggregateId = new Map<string, string[]>(
    objects
      .filter(isAggregateObjectSpec)
      .map((object) => [object.id, [object.id]])
  );

  for (const edge of edges) {
    if (!aggregateIds.has(edge.sourceObjectId) || aggregateIds.has(edge.targetObjectId)) {
      continue;
    }

    ownerCandidatesByObjectId.set(
      edge.targetObjectId,
      unique([
        ...(ownerCandidatesByObjectId.get(edge.targetObjectId) ?? []),
        edge.sourceObjectId
      ])
    );
  }

  for (const object of objects) {
    if (isAggregateObjectSpec(object)) {
      continue;
    }

    const ownerCandidates = ownerCandidatesByObjectId.get(object.id) ?? [];

    if (ownerCandidates.length !== 1) {
      continue;
    }

    const aggregateId = ownerCandidates[0];
    groupMembersByAggregateId.set(aggregateId, [
      ...(groupMembersByAggregateId.get(aggregateId) ?? [aggregateId]),
      object.id
    ]);
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

function toDomainStructureFieldEdgeKind(
  field: FieldSpec
): Extract<ViewerEdgeSpec["kind"], "association" | "reference"> | undefined {
  switch (field.structure) {
    case "enum":
      return "association";
    case "reference":
      return "reference";
    default:
      return undefined;
  }
}

function getDomainStructureRelationField(
  sourceObject: ObjectSpec,
  relation: RelationSpec
): FieldSpec | undefined {
  if (!relation.field) {
    return undefined;
  }

  if (!isAggregateObjectSpec(sourceObject)) {
    throw new Error(
      `Object ${sourceObject.id} relation ${relation.id} cannot bind field ${relation.field}`
    );
  }

  const field = sourceObject.fields.find((candidate) => candidate.id === relation.field);

  if (!field) {
    throw new Error(
      `Object ${sourceObject.id} relation ${relation.id} field ${relation.field} must exist in fields`
    );
  }

  return field;
}

function toDomainStructureFieldCardinality(field: FieldSpec): string {
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

function toCompositionProcessGroupId(processId: string): string {
  return `composition:process:${processId}`;
}

function toCompositionStageId(processId: string, stageId: string): string {
  return `composition:process:${processId}:stage:${stageId}`;
}

function toCompositionAggregateGroupId(objectId: string): string {
  return `composition:aggregate:${objectId}`;
}

function toCompositionAggregateStateId(objectId: string, stateId: string): string {
  return `composition:aggregate:${objectId}:state:${stateId}`;
}

function toLifecycleAggregateGroupId(objectId: string): string {
  return `lifecycle:aggregate:${objectId}`;
}

function toLifecycleStateId(objectId: string, stateId: string): string {
  return `lifecycle:aggregate:${objectId}:state:${stateId}`;
}

function toTraceProcessGroupId(processId: string): string {
  return `trace:process:${processId}`;
}

function toTraceStageId(processId: string, stageId: string): string {
  return `trace:process:${processId}:stage:${stageId}`;
}

function toTraceCommandId(processId: string, stageId: string, commandType: string): string {
  return `trace:process:${processId}:stage:${stageId}:command:${commandType}`;
}

function toTraceEventId(processId: string, stageId: string, eventType: string): string {
  return `trace:process:${processId}:stage:${stageId}:event:${eventType}`;
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

function toAggregateStateKey(objectId: string, stateId: string): string {
  return `${objectId}:${stateId}`;
}

function detail(
  context: ViewerContext,
  semanticKey: string,
  value: string
): ViewerDetailItem {
  return {
    semanticKey,
    label: getViewerDetailSemantic(context.spec, semanticKey).label,
    value
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

function formatPayloadMapping(payloadFrom: Readonly<Record<string, string>>): string {
  const pairs = Object.entries(payloadFrom).map(
    ([fieldId, source]) => `${fieldId} <- ${source}`
  );

  return formatList(pairs);
}

function formatPayloadFields(
  fields: readonly {
    id: string;
    type: string;
    required: boolean;
    description?: string;
  }[],
  object?: ObjectSpec
): string {
  if (fields.length === 0) {
    return "none";
  }

  return fields
    .map((field) => {
      const requiredLabel = field.required ? "required" : "optional";
      const description = resolveFieldDescription(field, object) ?? "No description available.";

      return `${field.id} [${field.type}, ${requiredLabel}]: ${description}`;
    })
    .join("\n");
}

function formatDomainFields(
  fields: readonly FieldSpec[],
  object?: ObjectSpec
): string {
  if (fields.length === 0) {
    return "none";
  }

  return fields
    .map((field) => {
      const requiredLabel = field.required ? "required" : "optional";
      const structureLabel = field.structure
        ? `${field.structure}${field.target ? ` -> ${field.target}` : ""}`
        : "scalar";
      const description = resolveFieldDescription(field, object) ?? "No description available.";

      return `${field.id} [${field.type}, ${requiredLabel}, ${structureLabel}]: ${description}`;
    })
    .join("\n");
}

function formatDomainRelations(relations: readonly RelationSpec[]): string {
  if (relations.length === 0) {
    return "none";
  }

  return relations
    .map((relation) => {
      const viaField = relation.field ? ` via ${relation.field}` : "";
      const cardinality = relation.cardinality ? ` ${relation.cardinality}` : "";

      return `${relation.id} [${relation.kind}${cardinality}] -> ${relation.target}${viaField}`;
    })
    .join("\n");
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
): Extract<ObjectSpec, { role: "aggregate" }> {
  const object = mustGet(objectById, objectId, "object");

  if (!isAggregateObjectSpec(object)) {
    throw new Error(`Aggregate ${objectId} must bind to object role aggregate`);
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
