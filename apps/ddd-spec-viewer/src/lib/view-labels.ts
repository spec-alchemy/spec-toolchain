import type { FlowNodeKind } from "@/types";

const NODE_KIND_LABELS: Readonly<Record<FlowNodeKind, string>> = {
  context: "context",
  actor: "actor",
  system: "system",
  scenario: "scenario",
  "scenario-step": "scenario step",
  message: "message",
  aggregate: "aggregate",
  "lifecycle-state": "lifecycle state",
  "shared-type-group": "shared types",
  entity: "entity",
  "value-object": "value object",
  enum: "enum",
  policy: "policy",
  relation: "relation"
};

export function getNodeKindLabel(kind: FlowNodeKind): string {
  return NODE_KIND_LABELS[kind];
}
