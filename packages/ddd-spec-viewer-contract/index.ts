export type ViewerNodeKind =
  | "process-group"
  | "aggregate-group"
  | "stage"
  | "final-stage"
  | "aggregate-state"
  | "command"
  | "event";

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
