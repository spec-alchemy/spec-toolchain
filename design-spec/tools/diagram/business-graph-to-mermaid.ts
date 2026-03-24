import type {
  AggregateGraph,
  ProcessGraph
} from "../graph-analysis.js";

type DiagramOptions = {
  sourcePath?: string;
};

const INDENT = "  ";

export function aggregateGraphToMermaid(
  aggregate: AggregateGraph,
  options: DiagramOptions = {}
): string {
  const lines = ["stateDiagram-v2"];

  if (options.sourcePath) {
    lines.push(`%% Source: ${options.sourcePath}`);
  }

  lines.push(`${INDENT}[*] --> ${toAlias(aggregate.objectId, aggregate.initialState)}`);

  for (const state of aggregate.states) {
    lines.push(
      `${INDENT}state ${quoteLabel(state.stateId)} as ${toAlias(aggregate.objectId, state.stateId)}`
    );
  }

  for (const transition of aggregate.transitions) {
    lines.push(
      `${INDENT}${toAlias(aggregate.objectId, transition.sourceState)} --> ${toAlias(aggregate.objectId, transition.targetState)}: ${transition.commandType} / ${transition.eventType}`
    );
  }

  for (const state of aggregate.states) {
    if (state.terminal) {
      lines.push(`${INDENT}${toAlias(aggregate.objectId, state.stateId)} --> [*]`);
    }
  }

  return `${lines.join("\n")}\n`;
}

export function processGraphToMermaid(
  process: ProcessGraph,
  options: DiagramOptions = {}
): string {
  const lines = ["stateDiagram-v2"];

  if (options.sourcePath) {
    lines.push(`%% Source: ${options.sourcePath}`);
  }

  lines.push(`${INDENT}[*] --> ${toAlias(process.processId, process.initialStage)}`);

  for (const stage of process.stages) {
    lines.push(
      `${INDENT}state ${quoteLabel(formatProcessStageLabel(stage))} as ${toAlias(process.processId, stage.stageId)}`
    );
  }

  for (const stage of process.stages) {
    for (const commandType of stage.acceptedCommands) {
      lines.push(
        `${INDENT}${toAlias(process.processId, stage.stageId)} --> ${toAlias(process.processId, stage.stageId)}: ${commandType}`
      );
    }
  }

  for (const advance of process.advances) {
    lines.push(
      `${INDENT}${toAlias(process.processId, advance.sourceStage)} --> ${toAlias(process.processId, advance.targetStage)}: ${advance.eventType}`
    );
  }

  for (const stage of process.stages) {
    if (stage.final) {
      lines.push(`${INDENT}${toAlias(process.processId, stage.stageId)} --> [*]`);
    }
  }

  return `${lines.join("\n")}\n`;
}

export function processCompositionGraphToMermaid(
  process: ProcessGraph,
  options: DiagramOptions = {}
): string {
  const lines = ["flowchart TD"];

  if (options.sourcePath) {
    lines.push(`%% Source: ${options.sourcePath}`);
  }

  const processGroupId = toAlias(process.processId, "process");
  lines.push(`${INDENT}subgraph ${processGroupId}[${quoteLabel(process.processId)}]`);

  for (const stage of process.stages) {
    lines.push(
      `${INDENT}${INDENT}${toAlias(process.processId, stage.stageId)}[${quoteLabel(formatProcessStageLabel(stage))}]`
    );
  }

  for (const advance of process.advances) {
    lines.push(
      `${INDENT}${INDENT}${toAlias(process.processId, advance.sourceStage)} -->|${escapeEdgeLabel(advance.eventType)}| ${toAlias(process.processId, advance.targetStage)}`
    );
  }

  lines.push(`${INDENT}end`);

  const usedAggregateObjectIds = unique(
    process.stages
      .filter((stage) => stage.aggregateObjectId)
      .map((stage) => stage.aggregateObjectId as string)
  );

  for (const objectId of usedAggregateObjectIds) {
    const groupId = toAlias(process.processId, `aggregate_${objectId}`);
    lines.push(`${INDENT}subgraph ${groupId}[${quoteLabel(`aggregate: ${objectId}`)}]`);

    const boundStates = process.stages
      .filter((stage) => stage.aggregateObjectId === objectId && stage.aggregateStateId)
      .map((stage) => stage.aggregateStateId as string);

    for (const stateId of unique(boundStates)) {
      lines.push(
        `${INDENT}${INDENT}${toAlias(objectId, stateId)}[${quoteLabel(`${objectId}.${stateId}`)}]`
      );
    }

    lines.push(`${INDENT}end`);
  }

  for (const stage of process.stages) {
    if (!stage.aggregateObjectId || !stage.aggregateStateId) {
      continue;
    }

    lines.push(
      `${INDENT}${toAlias(process.processId, stage.stageId)} -. binds .-> ${toAlias(stage.aggregateObjectId, stage.aggregateStateId)}`
    );
  }

  return `${lines.join("\n")}\n`;
}

function quoteLabel(label: string): string {
  return JSON.stringify(label);
}

function formatProcessStageLabel(stage: ProcessGraph["stages"][number]): string {
  if (stage.aggregateObjectId && stage.aggregateStateId) {
    return `${stage.stageId} (${stage.aggregateObjectId}.${stage.aggregateStateId})`;
  }

  return stage.stageId;
}

function toAlias(scopeId: string, nodeId: string): string {
  const normalized = `${scopeId}_${nodeId}`.replace(/[^A-Za-z0-9_]/g, "_");
  const base = /^[A-Za-z_]/.test(normalized) ? normalized : `state_${normalized}`;
  const hash = createStableHash(`${scopeId}:${nodeId}`);

  return `${base}_${hash}`;
}

function createStableHash(value: string): string {
  let hash = 0;

  for (const char of value) {
    hash = Math.imul(31, hash) + char.charCodeAt(0);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}

function escapeEdgeLabel(label: string): string {
  return label.replace(/\|/g, "\\|");
}

function unique<Value>(values: readonly Value[]): Value[] {
  return [...new Set(values)];
}
