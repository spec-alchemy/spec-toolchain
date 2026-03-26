import type {
  FlowNodeData,
  ViewerDetailItem
} from "../../types";

const REDUNDANT_RELATION_DETAIL_KEYS = new Set(["relation.label", "relation.kind"]);

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
    details: filterInspectorDetails(type, data.details)
  };
}

export function selectionFromEdgeData(input: {
  kind?: string;
  label: string;
  details: readonly ViewerDetailItem[];
}): {
  type: string;
  label: string;
  summary?: string;
  details: readonly ViewerDetailItem[];
} {
  const type = input.kind ? `${input.kind} edge` : "edge";

  return {
    type,
    label: input.label,
    details: filterInspectorDetails(type, input.details)
  };
}

function filterInspectorDetails(
  selectionType: string,
  details: readonly ViewerDetailItem[]
): readonly ViewerDetailItem[] {
  if (!isRelationSelection(selectionType)) {
    return details;
  }

  return details.filter((item) => !REDUNDANT_RELATION_DETAIL_KEYS.has(item.semanticKey));
}

function isRelationSelection(selectionType: string): boolean {
  return selectionType.endsWith(" relation") || selectionType.endsWith(" edge");
}
