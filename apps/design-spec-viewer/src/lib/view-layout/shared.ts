import type {
  FlowEdge,
  FlowNode,
  FlowNodeKind,
  ViewerDetailItem,
  ViewerEdgeKind
} from "../../types";

export interface LayoutedView {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface LayoutNodeSpec {
  id: string;
  kind: FlowNodeKind;
  label: string;
  relationKind?: ViewerEdgeKind;
  subtitle?: string;
  summary?: string;
  parentId?: string;
  headerHeight?: number;
  width: number;
  height: number;
  details: readonly ViewerDetailItem[];
}

export interface LayoutEdgeSpec {
  id: string;
  kind: ViewerEdgeKind;
  source: string;
  target: string;
  label: string;
  details: readonly ViewerDetailItem[];
  isTerminalSegment: boolean;
}

export interface ProjectedViewGraph {
  nodes: readonly LayoutNodeSpec[];
  edges: readonly LayoutEdgeSpec[];
}

export const edgeColorByKind: Record<ViewerEdgeKind, string> = {
  advance: "#6f88b8",
  binding: "#7e766a",
  transition: "#6f9f79",
  accepts: "#c6a24b",
  emits: "#c67e42"
};

export function mustGet<Key, Value>(
  map: ReadonlyMap<Key, Value>,
  key: Key,
  label: string
): Value {
  const value = map.get(key);

  if (value === undefined) {
    throw new Error(`Unknown ${label} ${String(key)}`);
  }

  return value;
}
