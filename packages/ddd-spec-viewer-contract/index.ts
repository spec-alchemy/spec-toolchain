export const BUSINESS_VIEWER_SPEC_VERSION = 1 as const;

export type ViewerViewKind =
  | "composition"
  | "lifecycle"
  | "trace"
  | "domain-structure"
  | "context-map";

export type ViewerNodeKind =
  | "process-group"
  | "aggregate-group"
  | "type-group"
  | "stage"
  | "final-stage"
  | "aggregate-state"
  | "command"
  | "event"
  | "entity"
  | "value-object"
  | "enum";

export type ViewerEdgeKind =
  | "advance"
  | "binding"
  | "transition"
  | "accepts"
  | "emits"
  | "association"
  | "composition"
  | "reference";

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
  cardinality?: string;
  description?: string;
  details: readonly ViewerDetailItem[];
}

export interface ViewerViewSpec {
  id: string;
  kind?: ViewerViewKind;
  title: string;
  description: string;
  nodes: readonly ViewerNodeSpec[];
  edges: readonly ViewerEdgeSpec[];
}

export interface ViewerDetailHelpSpec {
  semantic: Readonly<Record<string, string>>;
}

export interface BusinessViewerSpec {
  viewerVersion: typeof BUSINESS_VIEWER_SPEC_VERSION;
  specId: string;
  title: string;
  summary: string;
  detailHelp: ViewerDetailHelpSpec;
  views: readonly ViewerViewSpec[];
}
