import type { ElkExtendedEdge, ElkNode } from "elkjs/lib/elk-api.js";
import {
  GROUP_CHILD_TOP_GAP,
  GROUP_HEADER_HEIGHT
} from "../viewer-constants";
import {
  mustGet,
  type LayoutNodeSpec,
  type ProjectedViewGraph
} from "./shared";

export function buildElkGraph(projectedGraph: ProjectedViewGraph): ElkNode {
  const childIdsByParentId = new Map<string, string[]>();
  const nodeById = new Map(projectedGraph.nodes.map((node) => [node.id, node] as const));

  for (const node of projectedGraph.nodes) {
    const parentId = node.parentId ?? "__root__";
    const siblings = childIdsByParentId.get(parentId) ?? [];

    childIdsByParentId.set(parentId, [...siblings, node.id]);
  }

  return {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.spacing.nodeNode": "48",
      "elk.layered.spacing.nodeNodeBetweenLayers": "80",
      "elk.spacing.edgeNode": "28",
      "org.eclipse.elk.edgeLabels.placement": "CENTER",
      "org.eclipse.elk.edgeLabels.inline": "false",
      "org.eclipse.elk.spacing.edgeLabel": "14",
      "org.eclipse.elk.layered.edgeLabels.sideSelection": "ALWAYS_UP",
      "org.eclipse.elk.layered.edgeLabels.centerLabelPlacementStrategy": "MEDIAN_LAYER"
    },
    children: buildElkChildren("__root__", childIdsByParentId, nodeById),
    edges: projectedGraph.edges.map(
      (edge): ElkExtendedEdge => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
        labels:
          edge.renderLabel && edge.labelWidth && edge.labelHeight
            ? [
                {
                  id: `${edge.id}:label`,
                  text: edge.label,
                  width: edge.labelWidth,
                  height: edge.labelHeight
                }
              ]
            : undefined
      })
    )
  };
}

function buildElkChildren(
  parentId: string,
  childIdsByParentId: ReadonlyMap<string, readonly string[]>,
  nodeById: ReadonlyMap<string, LayoutNodeSpec>
): ElkNode[] {
  return (childIdsByParentId.get(parentId) ?? []).map((nodeId) => {
    const node = mustGet(nodeById, nodeId, "viewer node");
    const children = buildElkChildren(nodeId, childIdsByParentId, nodeById);
    const groupHeaderHeight = node.headerHeight ?? GROUP_HEADER_HEIGHT;

    return {
      id: node.id,
      width: node.width,
      height: node.height,
      layoutOptions: children.length > 0
        ? {
            "elk.padding": `[top=${groupHeaderHeight + GROUP_CHILD_TOP_GAP},left=24,bottom=24,right=24]`,
            "elk.spacing.nodeNode": "28",
            "elk.layered.spacing.nodeNodeBetweenLayers": "52"
          }
        : undefined,
      children
    };
  });
}
