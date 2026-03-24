import type {
  ViewerEdgeKind,
  ViewerNodeKind
} from "../types";

export const VIEWER_GRID_COLOR = "#d7ccb7";
export const VIEWER_RELATION_COLOR = "#9b8c72";
export const VIEWER_FALLBACK_NODE_COLOR = "#8d5c2f";

export const VIEWER_NODE_COLOR_BY_KIND = {
  "process-group": "#d7bb74",
  "aggregate-group": "#8aac91",
  stage: "#7d9fc4",
  "final-stage": "#cf8d76",
  "aggregate-state": "#6f9f79",
  command: "#c6a24b",
  event: "#6f88b8"
} as const satisfies Record<ViewerNodeKind, string>;

export const VIEWER_EDGE_COLOR_BY_KIND = {
  advance: "#6f88b8",
  binding: "#7e766a",
  transition: "#6f9f79",
  accepts: "#c6a24b",
  emits: "#c67e42"
} as const satisfies Record<ViewerEdgeKind, string>;

export function getMiniMapNodeColor(
  data: Record<string, unknown>
): string {
  if (data.kind === "relation") {
    return isViewerEdgeKind(data.relationKind)
      ? VIEWER_EDGE_COLOR_BY_KIND[data.relationKind]
      : VIEWER_RELATION_COLOR;
  }

  return isViewerNodeKind(data.kind)
    ? VIEWER_NODE_COLOR_BY_KIND[data.kind]
    : VIEWER_FALLBACK_NODE_COLOR;
}

function isViewerEdgeKind(value: unknown): value is ViewerEdgeKind {
  return typeof value === "string" && value in VIEWER_EDGE_COLOR_BY_KIND;
}

function isViewerNodeKind(value: unknown): value is ViewerNodeKind {
  return typeof value === "string" && value in VIEWER_NODE_COLOR_BY_KIND;
}
