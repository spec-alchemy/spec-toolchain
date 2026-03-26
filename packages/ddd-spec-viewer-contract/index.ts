export const BUSINESS_VIEWER_SPEC_VERSION = 2 as const;

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

export interface ViewerTextDetailValue {
  kind: "text";
  text: string;
}

export interface ViewerSectionDetailValue {
  kind: "section";
  title?: string;
  children: readonly ViewerDetailValue[];
}

export interface ViewerListDetailValue {
  kind: "list";
  items: readonly ViewerDetailValue[];
}

export interface ViewerRecordDetailEntry {
  label: string;
  value: ViewerDetailValue;
}

export interface ViewerRecordDetailValue {
  kind: "record";
  entries: readonly ViewerRecordDetailEntry[];
}

export interface ViewerFieldRelationDetailValue {
  kind: "reference" | "composition" | "enum";
  target: string;
  cardinality?: string;
}

export interface ViewerFieldDetailValue {
  kind: "field";
  name: string;
  fieldType: string;
  required: boolean;
  description?: string;
  relation?: ViewerFieldRelationDetailValue;
}

export type ViewerDetailValue =
  | ViewerTextDetailValue
  | ViewerSectionDetailValue
  | ViewerListDetailValue
  | ViewerRecordDetailValue
  | ViewerFieldDetailValue;

export interface ViewerDetailItem {
  semanticKey: string;
  label: string;
  value: ViewerDetailValue;
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
