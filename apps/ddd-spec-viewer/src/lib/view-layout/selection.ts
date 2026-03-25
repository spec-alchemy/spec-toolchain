import type {
  FlowNodeData,
  ViewerDetailItem
} from "../../types";

export function selectionFromNodeData(data: FlowNodeData): {
  type: string;
  label: string;
  summary?: string;
  details: readonly ViewerDetailItem[];
} {
  const type =
    data.kind === "relation"
      ? `${data.relationKind ?? "relation"} relation`
      : data.kind;

  return {
    type,
    label: data.label,
    summary: data.subtitle
      ? data.subtitle + (data.summary ? ` | ${data.summary}` : "")
      : data.summary,
    details: data.details
  };
}
