import type { FlowNodeKind } from "@/types";

const NODE_KIND_LABELS: Readonly<Record<FlowNodeKind, string>> = {
  "process-group": "process",
  "aggregate-group": "aggregate",
  "type-group": "shared types",
  stage: "stage",
  "final-stage": "final stage",
  "aggregate-state": "aggregate state",
  command: "command",
  event: "event",
  entity: "entity",
  "value-object": "value object",
  enum: "enum",
  relation: "relation"
};

export function getNodeKindLabel(kind: FlowNodeKind): string {
  return NODE_KIND_LABELS[kind];
}
