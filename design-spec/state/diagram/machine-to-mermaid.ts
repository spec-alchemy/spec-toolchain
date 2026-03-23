import { toDirectedGraph } from "xstate/graph";

type MachineLike = Parameters<typeof toDirectedGraph>[0];
type GraphNode = ReturnType<typeof toDirectedGraph>;
type MermaidOptions = {
  sourcePath?: string;
};

const INDENT = "  ";

export function machineToMermaid(machine: MachineLike, options: MermaidOptions = {}): string {
  const graph = toDirectedGraph(machine);
  const lines = ["stateDiagram-v2"];

  if (options.sourcePath) {
    lines.push(`%% Source: ${options.sourcePath}`);
  }

  renderScope(graph, lines, 0);

  if (graph.edges.length > 0) {
    lines.push(`%% Omitted ${graph.edges.length} root-level transition(s) from machine "${graph.id}"`);
  }

  return `${lines.join("\n")}\n`;
}

function renderScope(scope: GraphNode, lines: string[], depth: number): void {
  const indent = INDENT.repeat(depth);
  const initialTargetAlias = getInitialTargetAlias(scope);

  if (initialTargetAlias) {
    lines.push(`${indent}[*] --> ${initialTargetAlias}`);
  }

  for (const child of scope.children) {
    renderStateDeclaration(child, lines, depth);
  }

  for (const child of scope.children) {
    for (const edge of child.edges) {
      lines.push(renderTransition(edge.source.id, edge.target.id, edge.label.text, depth));
    }
  }

  for (const child of scope.children) {
    if (child.stateNode.type === "final") {
      lines.push(`${indent}${toAlias(child.id)} --> [*]`);
    }
  }
}

function renderStateDeclaration(node: GraphNode, lines: string[], depth: number): void {
  const indent = INDENT.repeat(depth);
  const alias = toAlias(node.id);
  const label = quoteLabel(getStateLabel(node));

  if (node.children.length === 0) {
    lines.push(`${indent}state ${label} as ${alias}`);
    return;
  }

  lines.push(`${indent}state ${label} as ${alias} {`);
  renderScope(node, lines, depth + 1);
  lines.push(`${indent}}`);
}

function renderTransition(
  sourceId: string,
  targetId: string,
  labelText: string,
  depth: number
): string {
  const indent = INDENT.repeat(depth);
  const label = normalizeTransitionLabel(labelText);

  return `${indent}${toAlias(sourceId)} --> ${toAlias(targetId)}${label ? `: ${label}` : ""}`;
}

function getInitialTargetAlias(scope: GraphNode): string | null {
  const initialTarget = scope.stateNode.initial?.target[0];

  if (!initialTarget) {
    return null;
  }

  const immediateChild = scope.children.find((child) => {
    return initialTarget.id === child.id || initialTarget.id.startsWith(`${child.id}.`);
  });

  return toAlias(immediateChild?.id ?? initialTarget.id);
}

function getStateLabel(node: GraphNode): string {
  return node.stateNode.path.at(-1) ?? node.id;
}

function quoteLabel(label: string): string {
  return JSON.stringify(label);
}

function normalizeTransitionLabel(label: string): string {
  return label.replace(/\s+/g, " ").trim();
}

function toAlias(id: string): string {
  const normalized = id.replace(/[^A-Za-z0-9_]/g, "_");
  const base = /^[A-Za-z_]/.test(normalized) ? normalized : `state_${normalized}`;
  const hash = createStableHash(id);

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
