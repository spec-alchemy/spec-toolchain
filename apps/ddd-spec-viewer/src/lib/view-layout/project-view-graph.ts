import {
  EDGE_LABEL_CHARS_PER_LINE,
  EDGE_LABEL_MAX_WIDTH,
  EDGE_LABEL_MIN_WIDTH,
  RELATION_NODE_CHARS_PER_LINE,
  RELATION_NODE_MAX_WIDTH,
  RELATION_NODE_MIN_WIDTH
} from "../viewer-constants";
import type {
  ViewerViewKind,
  ViewerEdgeSpec,
  ViewerViewSpec
} from "../../types";
import {
  mustGet,
  type LayoutEdgeSpec,
  type LayoutNodeSpec,
  type ProjectedViewGraph
} from "./shared";

export function projectViewGraph(view: ViewerViewSpec): ProjectedViewGraph {
  const baseNodes: LayoutNodeSpec[] = view.nodes.map((node) => ({
    ...node,
    kind: node.kind
  }));
  const viewKind = getViewerViewKind(view);

  if (viewKind === "domain-structure") {
    return {
      nodes: baseNodes,
      edges: view.edges.map((edge) => createDirectEdge(view, edge))
    };
  }

  const baseNodeMap = new Map(baseNodes.map((node) => [node.id, node] as const));
  const relationNodes: LayoutNodeSpec[] = [];
  const relationEdges: LayoutEdgeSpec[] = [];

  for (const edge of view.edges) {
    const sourceNode = mustGet(baseNodeMap, edge.source, "viewer node");
    const targetNode = mustGet(baseNodeMap, edge.target, "viewer node");
    const presentation = createRelationPresentation(view, edge);
    const relationNode = createRelationNode(view, edge, sourceNode, targetNode);

    relationNodes.push(relationNode);
    relationEdges.push(
      createRelationEdgeSegment(
        edge,
        edge.source,
        relationNode.id,
        presentation.summary,
        false
      ),
      createRelationEdgeSegment(
        edge,
        relationNode.id,
        edge.target,
        presentation.summary,
        true
      )
    );
  }

  return {
    nodes: [...baseNodes, ...relationNodes],
    edges: relationEdges
  };
}

function createRelationNode(
  view: ViewerViewSpec,
  edge: ViewerEdgeSpec,
  sourceNode: LayoutNodeSpec,
  targetNode: LayoutNodeSpec
): LayoutNodeSpec {
  const presentation = createRelationPresentation(view, edge);
  const parentId =
    sourceNode.parentId && sourceNode.parentId === targetNode.parentId
      ? sourceNode.parentId
      : undefined;
  const size = measureRelationNode(presentation.label, presentation.summary);

  return {
    id: `relation:${edge.id}`,
    kind: "relation",
    relationKind: edge.kind,
    label: presentation.label,
    summary: presentation.summary,
    parentId,
    width: size.width,
    height: size.height,
    details: edge.details
  };
}

function createRelationEdgeSegment(
  edge: ViewerEdgeSpec,
  source: string,
  target: string,
  summary: string | undefined,
  isTerminalSegment: boolean
): LayoutEdgeSpec {
  return {
    id: `${edge.id}:${isTerminalSegment ? "target" : "source"}`,
    kind: edge.kind,
    source,
    target,
    label: edge.label,
    summary,
    details: edge.details,
    isTerminalSegment
  };
}

function createDirectEdge(
  view: ViewerViewSpec,
  edge: ViewerEdgeSpec
): LayoutEdgeSpec {
  const presentation = createRelationPresentation(view, edge);
  const size = measureEdgeLabel(presentation.label, presentation.summary);

  return {
    id: edge.id,
    kind: edge.kind,
    source: edge.source,
    target: edge.target,
    label: presentation.label,
    labelWidth: size.width,
    labelHeight: size.height,
    summary: presentation.summary,
    renderLabel: true,
    details: edge.details,
    isTerminalSegment: true
  };
}

function measureRelationNode(
  label: string,
  summary?: string
): { width: number; height: number } {
  const lineTexts = summary ? [label, summary] : [label];
  const lines = lineTexts.reduce(
    (count, lineText) =>
      count + Math.max(1, Math.ceil(lineText.length / RELATION_NODE_CHARS_PER_LINE)),
    0
  );
  const longestLine = lineTexts.reduce(
    (maxLength, lineText) =>
      Math.max(maxLength, Math.min(lineText.length, RELATION_NODE_CHARS_PER_LINE)),
    0
  );
  const width = clamp(longestLine * 7 + 30, RELATION_NODE_MIN_WIDTH, RELATION_NODE_MAX_WIDTH);
  const height = 30 + lines * 14;

  return { width, height };
}

function measureEdgeLabel(
  label: string,
  summary?: string
): { width: number; height: number } {
  const lineTexts = summary ? [label, summary] : [label];
  const lines = lineTexts.reduce(
    (count, lineText) =>
      count + Math.max(1, Math.ceil(lineText.length / EDGE_LABEL_CHARS_PER_LINE)),
    0
  );
  const longestLine = lineTexts.reduce(
    (maxLength, lineText) =>
      Math.max(maxLength, Math.min(lineText.length, EDGE_LABEL_CHARS_PER_LINE)),
    0
  );
  const width = clamp(longestLine * 6 + 24, EDGE_LABEL_MIN_WIDTH, EDGE_LABEL_MAX_WIDTH);
  const height = 24 + lines * 12;

  return { width, height };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createRelationPresentation(
  view: ViewerViewSpec,
  edge: ViewerEdgeSpec
): { label: string; summary?: string } {
  const viewKind = getViewerViewKind(view);

  switch (edge.kind) {
    case "binding":
    case "accepts":
    case "emits":
      return { label: edge.label };
    case "transition": {
      const [commandLabel, eventLabel] = edge.label.split(" / ");

      return {
        label: commandLabel ?? edge.label,
        summary: eventLabel
      };
    }
    case "advance":
      return {
        label: viewKind === "trace" ? edge.label : shortenEventLabel(edge.label)
      };
    case "association":
    case "composition":
    case "reference":
      return {
        label: edge.label,
        summary: edge.cardinality ?? edge.description
      };
  }
}

function getViewerViewKind(view: ViewerViewSpec): ViewerViewKind | ViewerViewSpec["id"] {
  return view.kind ?? view.id;
}

function shortenEventLabel(label: string): string {
  const words = label.match(/[A-Z][a-z0-9]*/g);

  if (!words || words.length <= 1) {
    return label;
  }

  return words.slice(1).join(" ");
}
