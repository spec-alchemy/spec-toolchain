import type {
  ViewerEdgeKind,
  ViewerNodeKind
} from "../types";

export const VIEWER_GRID_COLOR = "#d7ccb7";
export const VIEWER_RELATION_COLOR = "#9b8c72";
export const VIEWER_FALLBACK_NODE_COLOR = "#8d5c2f";

export const VIEWER_NODE_COLOR_BY_KIND = {
  context: "#d7bb74",
  actor: "#cf8d76",
  system: "#7d9fc4",
  scenario: "#d7bb74",
  "scenario-step": "#7d9fc4",
  message: "#6f88b8",
  aggregate: "#8aac91",
  "lifecycle-state": "#6f9f79",
  "shared-type-group": "#b89449",
  entity: "#8aac91",
  "value-object": "#b18f73",
  enum: "#b89449",
  policy: "#c6a24b"
} as const satisfies Record<ViewerNodeKind, string>;

export const VIEWER_EDGE_COLOR_BY_KIND = {
  collaboration: "#7e766a",
  ownership: "#9e8c63",
  sequence: "#6f88b8",
  "message-flow": "#c67e42",
  "state-transition": "#6f9f79",
  coordination: "#c6a24b",
  association: "#9e8c63",
  composition: "#6f9f79",
  reference: "#6f88b8"
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
