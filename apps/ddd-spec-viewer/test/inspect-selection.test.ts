import assert from "node:assert/strict";
import test from "node:test";
import { activateSelectableEdge } from "../src/lib/view-layout/edge-activation";
import { buildElkGraph } from "../src/lib/view-layout/build-elk-graph";
import { mapLayoutedGraphToFlow } from "../src/lib/view-layout/map-layout-to-flow";
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
    id: "composition",
    kind: "composition",
    title: "Composition",
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

test("domain structure projects direct labeled edges without relation nodes", () => {
  const view: ViewerViewSpec = {
    id: "domain-structure",
    kind: "domain-structure",
    title: "Domain Structure",
    description: "demo",
    nodes: [
      {
        id: "domain-structure:object:Card",
        kind: "entity",
        label: "Card",
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
        id: "domain-structure:Card:field:content:target:CardContent",
        kind: "composition",
        source: "domain-structure:object:Card",
        target: "domain-structure:object:CardContent",
        label: "content",
        cardinality: "1",
        details: RELATION_DETAILS
      }
    ]
  };

  const projected = projectViewGraph(view);

  assert.equal(projected.nodes.some((node) => node.kind === "relation"), false);
  assert.equal(projected.edges.length, 1);
  assert.equal(projected.edges[0]?.renderLabel, true);
  assert.equal(projected.edges[0]?.summary, "1");
});

test("domain structure direct edges use ELK label boxes instead of midpoint heuristics", () => {
  const view: ViewerViewSpec = {
    id: "domain-structure",
    kind: "domain-structure",
    title: "Domain Structure",
    description: "demo",
    nodes: [
      {
        id: "domain-structure:object:Card",
        kind: "entity",
        label: "Card",
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
        id: "domain-structure:Card:field:content:target:CardContent",
        kind: "composition",
        source: "domain-structure:object:Card",
        target: "domain-structure:object:CardContent",
        label: "content",
        cardinality: "1",
        details: RELATION_DETAILS
      }
    ]
  };
  const projected = projectViewGraph(view);
  const elkGraph = buildElkGraph(projected);
  const elkEdge = elkGraph.edges?.[0];

  assert.ok(elkEdge?.labels?.[0]);
  assert.equal(elkEdge.labels[0]?.text, "content");
  assert.equal(typeof elkEdge.labels[0]?.width, "number");
  assert.equal(typeof elkEdge.labels[0]?.height, "number");

  const layoutedGraph = {
    ...elkGraph,
    children: (elkGraph.children ?? []).map((child, index) => ({
      ...child,
      x: index * 260,
      y: 0
    })),
    edges: elkGraph.edges?.map((edge) => ({
      ...edge,
      container: "root",
      labels: edge.labels?.map((label) => ({
        ...label,
        x: 140,
        y: 56
      })),
      sections: [
        {
          id: `${edge.id}_s0`,
          startPoint: { x: 200, y: 50 },
          endPoint: { x: 260, y: 50 },
          incomingShape: edge.sources[0],
          outgoingShape: edge.targets[0]
        }
      ]
    }))
  };
  const flow = mapLayoutedGraphToFlow(projected, layoutedGraph);

  assert.deepEqual(flow.edges[0]?.data.labelLayout, {
    x: 140,
    y: 56,
    width: elkEdge.labels[0]?.width ?? 0,
    height: elkEdge.labels[0]?.height ?? 0
  });
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

test("edge label activation mirrors single-select edge clicks", () => {
  const calls: string[] = [];

  activateSelectableEdge({
    id: "edge-1",
    selected: false,
    selectable: true,
    multiSelectionActive: false,
    edge: undefined,
    actions: {
      addSelectedEdges: (edgeIds) => {
        calls.push(`select:${edgeIds.join(",")}`);
      },
      setNodesSelectionActive: (active) => {
        calls.push(`nodesSelection:${String(active)}`);
      },
      unselectNodesAndEdges: () => {
        calls.push("unselect");
      }
    }
  });

  assert.deepEqual(calls, ["nodesSelection:false", "select:edge-1"]);
});

test("edge label activation mirrors multi-select toggle-off clicks", () => {
  const calls: string[] = [];
  const edge = {
    id: "edge-1"
  } as FlowEdge;

  activateSelectableEdge({
    id: "edge-1",
    selected: true,
    selectable: true,
    multiSelectionActive: true,
    edge,
    actions: {
      addSelectedEdges: (edgeIds) => {
        calls.push(`select:${edgeIds.join(",")}`);
      },
      setNodesSelectionActive: (active) => {
        calls.push(`nodesSelection:${String(active)}`);
      },
      unselectNodesAndEdges: (params) => {
        calls.push(`unselect:${params.edges.map((candidate) => candidate.id).join(",")}`);
      }
    }
  });

  assert.deepEqual(calls, ["nodesSelection:false", "unselect:edge-1"]);
});
