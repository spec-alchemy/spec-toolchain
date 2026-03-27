export const BUSINESS_VIEWER_SPEC_VERSION = 1 as const;

export type ViewerViewKind =
  | "context-map"
  | "scenario-story"
  | "message-flow"
  | "lifecycle"
  | "domain-structure"
  | "policy-saga";

export type ViewerViewTier = "primary" | "secondary";

export interface ViewerViewNavigationSpec {
  tier: ViewerViewTier;
  order: number;
  default?: boolean;
}

export type ViewerNodeKind =
  | "context"
  | "actor"
  | "system"
  | "scenario"
  | "scenario-step"
  | "message"
  | "aggregate"
  | "lifecycle-state"
  | "shared-type-group"
  | "entity"
  | "value-object"
  | "enum"
  | "policy";

export type ViewerEdgeKind =
  | "collaboration"
  | "ownership"
  | "sequence"
  | "message-flow"
  | "state-transition"
  | "coordination"
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
  kind: ViewerViewKind;
  navigation: ViewerViewNavigationSpec;
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
