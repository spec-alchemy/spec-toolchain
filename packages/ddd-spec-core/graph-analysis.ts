import type {
  AggregateSpec,
  BusinessSpec,
  CommandSpec,
  EventSpec,
  ObjectSpec,
  ProcessSpec
} from "./spec.js";
import {
  hasDescription,
  hasFieldExplanation
} from "./field-explanation.js";
import { isAggregateObjectSpec } from "./spec.js";

export type AnalysisSeverity = "error" | "warning";

export const BUSINESS_SPEC_ANALYSIS_VERSION = 1 as const;

export const ANALYSIS_CODES = [
  "unreachable-aggregate-state",
  "unreachable-process-stage",
  "dead-end-process-stage",
  "process-stage-cannot-reach-final",
  "initial-stage-cannot-reach-final",
  "orphan-command-definition",
  "unaccepted-process-command",
  "orphan-event-definition",
  "unobserved-emitted-event",
  "orphan-aggregate-transition",
  "missing-object-field-explanation",
  "missing-command-payload-field-explanation",
  "missing-event-payload-field-explanation"
] as const;

export type AnalysisCode = (typeof ANALYSIS_CODES)[number];

export interface AnalysisDiagnostic {
  severity: AnalysisSeverity;
  code: AnalysisCode;
  path: string;
  message: string;
}

export interface AggregateStateNode {
  stateId: string;
  reachable: boolean;
  terminal: boolean;
  outgoingCommands: readonly string[];
}

export interface AggregateTransitionEdge {
  sourceState: string;
  commandType: string;
  targetState: string;
  eventType: string;
  reachableFromInitial: boolean;
}

export interface AggregateGraph {
  objectId: string;
  initialState: string;
  states: readonly AggregateStateNode[];
  transitions: readonly AggregateTransitionEdge[];
  reachableStateIds: readonly string[];
  unreachableStateIds: readonly string[];
}

export interface ProcessStageNode {
  stageId: string;
  reachableFromInitial: boolean;
  canReachFinal: boolean;
  final: boolean;
  aggregateObjectId?: string;
  aggregateStateId?: string;
  acceptedCommands: readonly string[];
  observedEvents: readonly string[];
}

export interface ProcessAdvanceEdge {
  sourceStage: string;
  eventType: string;
  targetStage: string;
  reachableFromInitial: boolean;
}

export interface ProcessGraph {
  processId: string;
  initialStage: string;
  stages: readonly ProcessStageNode[];
  advances: readonly ProcessAdvanceEdge[];
  finalStageIds: readonly string[];
  reachableStageIds: readonly string[];
  unreachableStageIds: readonly string[];
  deadEndStageIds: readonly string[];
  nonFinalStageIdsWithoutPathToFinal: readonly string[];
  canReachAnyFinalFromInitial: boolean;
}

export interface GraphUsageSummary {
  aggregateHandledCommands: readonly string[];
  processAcceptedCommands: readonly string[];
  aggregateEmittedEvents: readonly string[];
  processObservedEvents: readonly string[];
}

/**
 * Business graph IR derived from canonical spec.
 *
 * It intentionally keeps only business topology:
 * aggregate lifecycle states, process stages, and the transitions between them.
 * No runtime or viewer-specific details are included here.
 */
export interface BusinessGraph {
  aggregates: readonly AggregateGraph[];
  processes: readonly ProcessGraph[];
  usage: GraphUsageSummary;
}

export interface BusinessSpecAnalysis {
  analysisVersion: typeof BUSINESS_SPEC_ANALYSIS_VERSION;
  specId: string;
  graph: BusinessGraph;
  diagnostics: readonly AnalysisDiagnostic[];
  summary: {
    errorCount: number;
    warningCount: number;
  };
}

/**
 * Projects canonical business truth into a graph-friendly IR.
 *
 * This is the seam between "source of truth" and "analysis".
 */
export function buildBusinessGraph(spec: BusinessSpec): BusinessGraph {
  const aggregateMap = new Map(
    spec.domain.aggregates.map((aggregate) => [aggregate.objectId, aggregate] as const)
  );
  const aggregates = spec.domain.aggregates.map((aggregate) => buildAggregateGraph(aggregate));
  const processes = spec.domain.processes.map((process) => buildProcessGraph(process, aggregateMap));

  return {
    aggregates,
    processes,
    usage: {
      aggregateHandledCommands: toSortedUniqueValues(
        aggregates.flatMap((aggregate) =>
          aggregate.transitions.map((transition) => transition.commandType)
        )
      ),
      processAcceptedCommands: toSortedUniqueValues(
        processes.flatMap((process) =>
          process.stages.flatMap((stage) => stage.acceptedCommands)
        )
      ),
      aggregateEmittedEvents: toSortedUniqueValues(
        aggregates.flatMap((aggregate) =>
          aggregate.transitions.map((transition) => transition.eventType)
        )
      ),
      processObservedEvents: toSortedUniqueValues(
        processes.flatMap((process) => process.stages.flatMap((stage) => stage.observedEvents))
      )
    }
  };
}

/**
 * Runs graph-based diagnostics on top of canonical business truth.
 *
 * Diagnostics are intentionally framed as external analysis results rather than
 * additional canonical fields, so canonical can stay as pure fact declaration.
 */
export function analyzeBusinessSpec(spec: BusinessSpec): BusinessSpecAnalysis {
  const graph = buildBusinessGraph(spec);
  const diagnostics: AnalysisDiagnostic[] = [];

  for (const aggregate of graph.aggregates) {
    for (const state of aggregate.states) {
      if (!state.reachable) {
        diagnostics.push({
          severity: "error",
          code: "unreachable-aggregate-state",
          path: aggregateStatePath(aggregate.objectId, state.stateId),
          message: `Aggregate ${aggregate.objectId} state ${state.stateId} is unreachable from initial state ${aggregate.initialState}`
        });
      }
    }

    for (const transition of aggregate.transitions) {
      if (!transition.reachableFromInitial) {
        diagnostics.push({
          severity: "warning",
          code: "orphan-aggregate-transition",
          path: aggregateTransitionPath(
            aggregate.objectId,
            transition.sourceState,
            transition.commandType
          ),
          message: `Aggregate ${aggregate.objectId} transition ${transition.sourceState} --${transition.commandType}--> ${transition.targetState} is unreachable because its source state cannot be reached from ${aggregate.initialState}`
        });
      }
    }
  }

  for (const process of graph.processes) {
    for (const stage of process.stages) {
      if (!stage.reachableFromInitial) {
        diagnostics.push({
          severity: "error",
          code: "unreachable-process-stage",
          path: processStagePath(process.processId, stage.stageId),
          message: `Process ${process.processId} stage ${stage.stageId} is unreachable from initial stage ${process.initialStage}`
        });
      }

      if (stage.reachableFromInitial && !stage.final && stage.observedEvents.length === 0) {
        diagnostics.push({
          severity: "error",
          code: "dead-end-process-stage",
          path: processStagePath(process.processId, stage.stageId),
          message: `Process ${process.processId} stage ${stage.stageId} is reachable, non-final, and has no outgoing advancesOn events`
        });
      }

      // This complements dead-end detection by catching stages that still branch,
      // but can only flow into loops or branches that never converge to a final stage.
      if (
        stage.reachableFromInitial &&
        !stage.final &&
        stage.observedEvents.length > 0 &&
        !stage.canReachFinal
      ) {
        diagnostics.push({
          severity: "error",
          code: "process-stage-cannot-reach-final",
          path: processStagePath(process.processId, stage.stageId),
          message: `Process ${process.processId} stage ${stage.stageId} is reachable and non-final, but no path from it can reach any final stage`
        });
      }
    }

    if (!process.canReachAnyFinalFromInitial) {
      diagnostics.push({
        severity: "error",
        code: "initial-stage-cannot-reach-final",
        path: processPath(process.processId),
        message: `Process ${process.processId} cannot reach any final stage from initial stage ${process.initialStage}`
      });
    }
  }

  diagnostics.push(
    ...analyzeCommandUsage(spec.domain.commands, graph.usage),
    ...analyzeEventUsage(spec.domain.events, graph.usage),
    ...analyzeFieldExplanations(spec)
  );

  const errorCount = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;
  const warningCount = diagnostics.length - errorCount;

  return {
    analysisVersion: BUSINESS_SPEC_ANALYSIS_VERSION,
    specId: spec.id,
    graph,
    diagnostics,
    summary: {
      errorCount,
      warningCount
    }
  };
}

function buildAggregateGraph(aggregate: AggregateSpec): AggregateGraph {
  const stateIds = Object.keys(aggregate.states);
  const adjacency = new Map<string, string[]>();
  const transitions: AggregateTransitionEdge[] = [];

  for (const stateId of stateIds) {
    const state = aggregate.states[stateId];
    const outgoingTransitions = Object.entries(state.on ?? {});

    adjacency.set(
      stateId,
      outgoingTransitions.map(([, transition]) => transition.target)
    );

    for (const [commandType, transition] of outgoingTransitions) {
      transitions.push({
        sourceState: stateId,
        commandType,
        targetState: transition.target,
        eventType: transition.emit.type,
        reachableFromInitial: false
      });
    }
  }

  const reachableStateIds = collectReachableNodeIds([aggregate.initial], adjacency);
  const reachableStateSet = new Set(reachableStateIds);

  for (const transition of transitions) {
    transition.reachableFromInitial = reachableStateSet.has(transition.sourceState);
  }

  const states: AggregateStateNode[] = stateIds.map((stateId) => {
    const outgoingCommands = Object.keys(aggregate.states[stateId].on ?? {});

    return {
      stateId,
      reachable: reachableStateSet.has(stateId),
      terminal: outgoingCommands.length === 0,
      outgoingCommands
    };
  });

  return {
    objectId: aggregate.objectId,
    initialState: aggregate.initial,
    states,
    transitions,
    reachableStateIds,
    unreachableStateIds: stateIds.filter((stateId) => !reachableStateSet.has(stateId))
  };
}

function buildProcessGraph(
  process: ProcessSpec,
  aggregateMap: ReadonlyMap<string, AggregateSpec>
): ProcessGraph {
  const stageIds = Object.keys(process.stages);
  const adjacency = new Map<string, string[]>();
  const reverseAdjacency = new Map<string, string[]>();
  const advances: ProcessAdvanceEdge[] = [];

  for (const stageId of stageIds) {
    adjacency.set(stageId, []);
    reverseAdjacency.set(stageId, []);
  }

  for (const stageId of stageIds) {
    const stage = process.stages[stageId];
    const outgoingAdvances = Object.entries(stage.advancesOn ?? {});

    adjacency.set(
      stageId,
      outgoingAdvances.map(([, targetStage]) => targetStage)
    );

    for (const [eventType, targetStage] of outgoingAdvances) {
      reverseAdjacency.get(targetStage)?.push(stageId);
      advances.push({
        sourceStage: stageId,
        eventType,
        targetStage,
        reachableFromInitial: false
      });
    }
  }

  const reachableStageIds = collectReachableNodeIds([process.initialStage], adjacency);
  const reachableStageSet = new Set(reachableStageIds);
  const finalStageIds = stageIds.filter((stageId) => Boolean(process.stages[stageId].final));
  const stagesThatCanReachFinal = collectReachableNodeIds(finalStageIds, reverseAdjacency);
  const stagesThatCanReachFinalSet = new Set(stagesThatCanReachFinal);

  for (const advance of advances) {
    advance.reachableFromInitial = reachableStageSet.has(advance.sourceStage);
  }

  const stages: ProcessStageNode[] = stageIds.map((stageId) => {
    const stage = process.stages[stageId];
    const binding = resolveProcessStageBinding(process, stageId, aggregateMap);
    const acceptedCommands = binding ? Object.keys(binding.state.on ?? {}) : [];

    return {
      stageId,
      reachableFromInitial: reachableStageSet.has(stageId),
      canReachFinal: stagesThatCanReachFinalSet.has(stageId),
      final: Boolean(stage.final),
      aggregateObjectId: binding?.aggregate.objectId,
      aggregateStateId: binding?.stateId,
      acceptedCommands,
      observedEvents: Object.keys(stage.advancesOn ?? {})
    };
  });

  return {
    processId: process.id,
    initialStage: process.initialStage,
    stages,
    advances,
    finalStageIds,
    reachableStageIds,
    unreachableStageIds: stageIds.filter((stageId) => !reachableStageSet.has(stageId)),
    deadEndStageIds: stages
      .filter(
        (stage) => stage.reachableFromInitial && !stage.final && stage.observedEvents.length === 0
      )
      .map((stage) => stage.stageId),
    nonFinalStageIdsWithoutPathToFinal: stages
      .filter(
        (stage) =>
          stage.reachableFromInitial &&
          !stage.final &&
          stage.observedEvents.length > 0 &&
          !stage.canReachFinal
      )
      .map((stage) => stage.stageId),
    canReachAnyFinalFromInitial: stagesThatCanReachFinalSet.has(process.initialStage)
  };
}

function resolveProcessStageBinding(
  process: ProcessSpec,
  stageId: string,
  aggregateMap: ReadonlyMap<string, AggregateSpec>
):
  | {
      aggregate: AggregateSpec;
      stateId: string;
      state: AggregateSpec["states"][string];
    }
  | undefined {
  const stage = process.stages[stageId];

  if (stage.final || !stage.aggregate || !stage.state) {
    return undefined;
  }

  const objectId = process.uses.aggregates[stage.aggregate];

  if (!objectId) {
    throw new Error(
      `Process ${process.id} stage ${stageId} references unknown aggregate alias ${stage.aggregate}`
    );
  }

  const aggregate = aggregateMap.get(objectId);

  if (!aggregate) {
    throw new Error(`Process ${process.id} references unknown aggregate ${objectId}`);
  }

  const boundState = aggregate.states[stage.state];

  if (!boundState) {
    throw new Error(
      `Process ${process.id} stage ${stageId} references unknown state ${objectId}.${stage.state}`
    );
  }

  return {
    aggregate,
    stateId: stage.state,
    state: boundState
  };
}

function analyzeCommandUsage(
  commands: readonly CommandSpec[],
  usage: GraphUsageSummary
): AnalysisDiagnostic[] {
  const handledCommands = new Set(usage.aggregateHandledCommands);
  const acceptedCommands = new Set(usage.processAcceptedCommands);

  return commands.flatMap((command) => {
    const diagnostics: AnalysisDiagnostic[] = [];

    if (!handledCommands.has(command.type)) {
      diagnostics.push({
        severity: "warning",
        code: "orphan-command-definition",
        path: commandPath(command.type),
        message: `Command ${command.type} targets ${command.target} but is not handled by any aggregate transition`
      });
    }

    if (handledCommands.has(command.type) && !acceptedCommands.has(command.type)) {
      diagnostics.push({
        severity: "warning",
        code: "unaccepted-process-command",
        path: commandPath(command.type),
        message: `Command ${command.type} is implemented by an aggregate but is not accepted by any process stage`
      });
    }

    return diagnostics;
  });
}

function analyzeEventUsage(
  events: readonly EventSpec[],
  usage: GraphUsageSummary
): AnalysisDiagnostic[] {
  const emittedEvents = new Set(usage.aggregateEmittedEvents);
  const observedEvents = new Set(usage.processObservedEvents);

  return events.flatMap((event) => {
    const diagnostics: AnalysisDiagnostic[] = [];

    if (!emittedEvents.has(event.type)) {
      diagnostics.push({
        severity: "warning",
        code: "orphan-event-definition",
        path: eventPath(event.type),
        message: `Event ${event.type} sourced from ${event.source} is not emitted by any aggregate transition`
      });
    }

    if (emittedEvents.has(event.type) && !observedEvents.has(event.type)) {
      diagnostics.push({
        severity: "warning",
        code: "unobserved-emitted-event",
        path: eventPath(event.type),
        message: `Event ${event.type} is emitted by an aggregate but is not observed by any process stage`
      });
    }

    return diagnostics;
  });
}

function analyzeFieldExplanations(spec: BusinessSpec): AnalysisDiagnostic[] {
  const objectById = new Map(
    spec.domain.objects.map((object) => [object.id, object] as const)
  );

  return [
    ...analyzeObjectFieldExplanations(spec.domain.objects),
    ...analyzeCommandPayloadFieldExplanations(spec.domain.commands, objectById),
    ...analyzeEventPayloadFieldExplanations(spec.domain.events, objectById)
  ];
}

function analyzeObjectFieldExplanations(
  objects: readonly ObjectSpec[]
): AnalysisDiagnostic[] {
  return objects.flatMap((object) =>
    isAggregateObjectSpec(object)
      ? object.fields.flatMap((field) => {
          if (hasDescription(field.description)) {
            return [];
          }

          return [
            {
              severity: "warning" as const,
              code: "missing-object-field-explanation" as const,
              path: objectFieldPath(object.id, field.id),
              message: `Object ${object.id} field ${field.id} is missing a semantic description`
            }
          ];
        })
      : []
  );
}

function analyzeCommandPayloadFieldExplanations(
  commands: readonly CommandSpec[],
  objectById: ReadonlyMap<string, ObjectSpec>
): AnalysisDiagnostic[] {
  return commands.flatMap((command) => {
    const targetObject = objectById.get(command.target);

    return command.payload.fields.flatMap((field) => {
      if (hasFieldExplanation(field, targetObject)) {
        return [];
      }

      const inheritedHint = targetObject
        ? ` and cannot inherit one from target object ${command.target}.${field.id}`
        : "";

      return [
        {
          severity: "warning" as const,
          code: "missing-command-payload-field-explanation" as const,
          path: commandFieldPath(command.type, field.id),
          message: `Command ${command.type} payload field ${field.id} has no semantic description${inheritedHint}`
        }
      ];
    });
  });
}

function analyzeEventPayloadFieldExplanations(
  events: readonly EventSpec[],
  objectById: ReadonlyMap<string, ObjectSpec>
): AnalysisDiagnostic[] {
  return events.flatMap((event) => {
    const sourceObject = objectById.get(event.source);

    return event.payload.fields.flatMap((field) => {
      if (hasFieldExplanation(field, sourceObject)) {
        return [];
      }

      const inheritedHint = sourceObject
        ? ` and cannot inherit one from source object ${event.source}.${field.id}`
        : "";

      return [
        {
          severity: "warning" as const,
          code: "missing-event-payload-field-explanation" as const,
          path: eventFieldPath(event.type, field.id),
          message: `Event ${event.type} payload field ${field.id} has no semantic description${inheritedHint}`
        }
      ];
    });
  });
}

/**
 * Generic graph reachability over a small, declarative adjacency map.
 *
 * The graph is intentionally string-keyed so the same traversal can be reused
 * for aggregate lifecycle states and process stages.
 */
function collectReachableNodeIds(
  startNodeIds: readonly string[],
  adjacency: ReadonlyMap<string, readonly string[]>
): string[] {
  const visited = new Set<string>();
  const queue = [...startNodeIds];

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

function toSortedUniqueValues(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function aggregateStatePath(objectId: string, stateId: string): string {
  return `domain.aggregates[${objectId}].states.${stateId}`;
}

function aggregateTransitionPath(objectId: string, stateId: string, commandType: string): string {
  return `domain.aggregates[${objectId}].states.${stateId}.on.${commandType}`;
}

function processPath(processId: string): string {
  return `domain.processes[${processId}]`;
}

function processStagePath(processId: string, stageId: string): string {
  return `domain.processes[${processId}].stages.${stageId}`;
}

function commandPath(commandType: string): string {
  return `domain.commands[${commandType}]`;
}

function eventPath(eventType: string): string {
  return `domain.events[${eventType}]`;
}

function objectFieldPath(objectId: string, fieldId: string): string {
  return `domain.objects[${objectId}].fields.${fieldId}`;
}

function commandFieldPath(commandType: string, fieldId: string): string {
  return `domain.commands[${commandType}].payload.fields.${fieldId}`;
}

function eventFieldPath(eventType: string, fieldId: string): string {
  return `domain.events[${eventType}].payload.fields.${fieldId}`;
}
