import type { Edge, Node } from "@xyflow/react";

export type ViewerNodeKind =
  | "process-group"
  | "aggregate-group"
  | "stage"
  | "final-stage"
  | "aggregate-state"
  | "command"
  | "event";

export type FlowNodeKind = ViewerNodeKind | "relation";

export type ViewerEdgeKind =
  | "advance"
  | "binding"
  | "transition"
  | "accepts"
  | "emits";

export interface ViewerDetailItem {
  semanticKey: string;
  label: string;
  value: string;
}

export interface ViewerNodeSpec {
  id: string;
  kind: ViewerNodeKind;
  label: string;
  subtitle?: string;
  summary?: string;
  parentId?: string;
  headerHeight?: number;
  width: number;
  height: number;
  details: readonly ViewerDetailItem[];
}

export interface ViewerEdgeSpec {
  id: string;
  kind: ViewerEdgeKind;
  source: string;
  target: string;
  label: string;
  details: readonly ViewerDetailItem[];
}

export interface ViewerViewSpec {
  id: string;
  title: string;
  description: string;
  nodes: readonly ViewerNodeSpec[];
  edges: readonly ViewerEdgeSpec[];
}

export interface ViewerDetailHelpSpec {
  semantic: Readonly<Record<string, string>>;
}

export interface BusinessViewerSpec {
  specId: string;
  title: string;
  summary: string;
  detailHelp: ViewerDetailHelpSpec;
  views: readonly ViewerViewSpec[];
}

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
