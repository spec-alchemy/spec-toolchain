import {
  MarkerType
} from "@xyflow/react";
import type { ElkEdgeSection, ElkExtendedEdge, ElkNode } from "elkjs/lib/elk-api.js";
import type {
  FlowEdge,
  FlowNode,
  FlowPathPoint
} from "../../types";
import {
  edgeColorByKind,
  mustGet,
  type LayoutNodeSpec,
  type LayoutedView,
  type ProjectedViewGraph
} from "./shared";

export function mapLayoutedGraphToFlow(
  projectedGraph: ProjectedViewGraph,
  layoutedGraph: ElkNode
): LayoutedView {
  const nodeMap = new Map(projectedGraph.nodes.map((node) => [node.id, node] as const));
  const layoutedNodes = collectFlowNodes(layoutedGraph, nodeMap);
  const containerOffsetById = collectContainerOffsetById(layoutedGraph);
  const layoutedEdgeById = new Map((layoutedGraph.edges ?? []).map((edge) => [edge.id, edge] as const));

  return {
    nodes: layoutedNodes,
    edges: projectedGraph.edges.map((edge) => {
      const layoutedEdge = mustGet(layoutedEdgeById, edge.id, "viewer edge");

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        type: "viewerEdge",
        animated: edge.kind === "binding",
        selectable: true,
        markerEnd:
          edge.kind === "binding" || !edge.isTerminalSegment
            ? undefined
            : {
                type: MarkerType.ArrowClosed,
                color: edgeColorByKind[edge.kind]
              },
        style: {
          stroke: edgeColorByKind[edge.kind],
          strokeDasharray: edge.kind === "binding" ? "6 5" : undefined,
          strokeWidth: edge.kind === "binding" ? 1.6 : 2.2
        },
        data: {
          kind: edge.kind,
          pathPoints: collectEdgePathPoints(layoutedEdge, containerOffsetById),
          details: edge.details
        }
      } satisfies FlowEdge;
    })
  };
}

/**
 * ELK returns child coordinates relative to the parent container.
 *
 * React Flow uses the same local coordinate model for nodes with `parentId`,
 * so we preserve the local coordinates instead of flattening them.
 */
function collectFlowNodes(
  rootNode: ElkNode,
  nodeMap: ReadonlyMap<string, LayoutNodeSpec>
): FlowNode[] {
  const result: FlowNode[] = [];

  walkLayoutedChildren(rootNode, undefined, nodeMap, result);

  return result;
}

function walkLayoutedChildren(
  parentNode: ElkNode,
  parentId: string | undefined,
  nodeMap: ReadonlyMap<string, LayoutNodeSpec>,
  result: FlowNode[]
): void {
  for (const child of parentNode.children ?? []) {
    const source = mustGet(nodeMap, child.id, "viewer node");

    result.push({
      id: source.id,
      type:
        source.kind === "relation"
          ? "relationNode"
          : source.kind.endsWith("group")
            ? "groupNode"
            : "itemNode",
      position: {
        x: child.x ?? 0,
        y: child.y ?? 0
      },
      parentId,
      extent: parentId ? "parent" : undefined,
      draggable: false,
      selectable: true,
      style: {
        width: child.width ?? source.width,
        height: child.height ?? source.height,
        border: "none",
        background: "transparent",
        padding: 0
      },
      data: {
        kind: source.kind,
        label: source.label,
        relationKind: source.relationKind,
        subtitle: source.subtitle,
        summary: source.summary,
        headerHeight: source.headerHeight,
        details: source.details
      }
    });

    walkLayoutedChildren(child, source.id, nodeMap, result);
  }
}

function collectContainerOffsetById(rootNode: ElkNode): ReadonlyMap<string, FlowPathPoint> {
  const result = new Map<string, FlowPathPoint>([["root", { x: 0, y: 0 }]]);

  walkContainerOffsets(rootNode, { x: 0, y: 0 }, result);

  return result;
}

function walkContainerOffsets(
  parentNode: ElkNode,
  parentOffset: FlowPathPoint,
  result: Map<string, FlowPathPoint>
): void {
  for (const child of parentNode.children ?? []) {
    const childOffset = {
      x: parentOffset.x + (child.x ?? 0),
      y: parentOffset.y + (child.y ?? 0)
    };

    result.set(child.id, childOffset);
    walkContainerOffsets(child, childOffset, result);
  }
}

/**
 * ELK expresses edge sections in the coordinate space of the edge container.
 * React Flow edges render on the root canvas, so section points must be
 * translated into root-absolute coordinates before building the SVG path.
 */
function collectEdgePathPoints(
  edge: ElkExtendedEdge,
  containerOffsetById: ReadonlyMap<string, FlowPathPoint>
): readonly FlowPathPoint[] {
  const containerOffset =
    edge.container && edge.container !== "root"
      ? mustGet(containerOffsetById, edge.container, "edge container")
      : { x: 0, y: 0 };
  const points: FlowPathPoint[] = [];

  for (const section of edge.sections ?? []) {
    appendEdgePathPoint(points, translatePathPoint(section.startPoint, containerOffset));

    for (const bendPoint of section.bendPoints ?? []) {
      appendEdgePathPoint(points, translatePathPoint(bendPoint, containerOffset));
    }

    appendEdgePathPoint(points, translatePathPoint(section.endPoint, containerOffset));
  }

  return points;
}

function translatePathPoint(
  point: ElkEdgeSection["startPoint"],
  containerOffset: FlowPathPoint
): FlowPathPoint {
  return {
    x: point.x + containerOffset.x,
    y: point.y + containerOffset.y
  };
}

function appendEdgePathPoint(
  points: FlowPathPoint[],
  nextPoint: FlowPathPoint
): void {
  const lastPoint = points.at(-1);

  if (lastPoint && lastPoint.x === nextPoint.x && lastPoint.y === nextPoint.y) {
    return;
  }

  points.push(nextPoint);
}
