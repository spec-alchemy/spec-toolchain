import assert from "node:assert/strict";
import test from "node:test";
import { projectViewGraph } from "../src/lib/view-layout/project-view-graph";
import {
  selectionFromEdgeData,
  selectionFromNodeData
} from "../src/lib/view-layout/selection";
import type { ViewerDetailItem, ViewerViewSpec } from "../src/types";

const RELATION_DETAILS: readonly ViewerDetailItem[] = [
  { semanticKey: "relation.kind", label: "Relation Type", value: "composition" },
  { semanticKey: "relation.label", label: "Relation", value: "card content" },
  { semanticKey: "relation.from", label: "From", value: "Connection" },
  { semanticKey: "relation.to", label: "To", value: "CardContent" }
];

test("relation node reuses edge details without injecting duplicate kind metadata", () => {
  const view: ViewerViewSpec = {
    id: "domain-structure",
    kind: "domain-structure",
    title: "Domain Structure",
    description: "demo",
    nodes: [
      {
        id: "domain-structure:object:Connection",
        kind: "entity",
        label: "Connection",
        width: 200,
        height: 100,
        details: []
      },
      {
        id: "domain-structure:object:CardContent",
        kind: "value-object",
        label: "Card Content",
        width: 200,
        height: 100,
        details: []
      }
    ],
    edges: [
      {
        id: "domain-structure:Connection:field:cardContent",
        kind: "composition",
        source: "domain-structure:object:Connection",
        target: "domain-structure:object:CardContent",
        label: "card content",
        details: RELATION_DETAILS
      }
    ]
  };

  const relationNode = projectViewGraph(view).nodes.find((node) => node.kind === "relation");

  assert.ok(relationNode);
  assert.deepEqual(relationNode.details, RELATION_DETAILS);
});

test("relation selections hide redundant label and kind details", () => {
  const relationSelection = selectionFromNodeData({
    kind: "relation",
    relationKind: "composition",
    label: "card content",
    details: RELATION_DETAILS
  });
  const edgeSelection = selectionFromEdgeData({
    kind: "composition",
    label: "card content",
    details: RELATION_DETAILS
  });

  assert.deepEqual(
    relationSelection.details.map((item) => item.semanticKey),
    ["relation.from", "relation.to"]
  );
  assert.deepEqual(
    edgeSelection.details.map((item) => item.semanticKey),
    ["relation.from", "relation.to"]
  );
});
