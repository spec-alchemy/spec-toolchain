import type { Edge, Node } from "@xyflow/react";
import type {
  ViewerDetailItem,
  ViewerEdgeKind,
  ViewerNodeKind
} from "../../../packages/ddd-spec-viewer-contract/index.js";

export type {
  BusinessViewerSpec,
  ViewerDetailHelpSpec,
  ViewerDetailItem,
  ViewerEdgeKind,
  ViewerEdgeSpec,
  ViewerNodeKind,
  ViewerNodeSpec,
  ViewerViewSpec
} from "../../../packages/ddd-spec-viewer-contract/index.js";

export type FlowNodeKind = ViewerNodeKind | "relation";

export interface FlowNodeData extends Record<string, unknown> {
  kind: FlowNodeKind;
  label: string;
  relationKind?: ViewerEdgeKind;
  subtitle?: string;
  summary?: string;
  headerHeight?: number;
  details: readonly ViewerDetailItem[];
}

export interface FlowPathPoint {
  x: number;
  y: number;
}

export interface FlowEdgeData extends Record<string, unknown> {
  kind: ViewerEdgeKind;
  pathPoints: readonly FlowPathPoint[];
  details: readonly ViewerDetailItem[];
}

export type FlowNode = Node<FlowNodeData>;
export type FlowEdge = Edge<FlowEdgeData>;

export interface InspectorSelection {
  type: string;
  label: string;
  summary?: string;
  details: readonly ViewerDetailItem[];
}
