import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DetailValueRenderer } from "../src/components/DetailValueRenderer";
import { InspectorPanel } from "../src/components/InspectorPanel";
import { ViewerEmptyState } from "../src/components/shell/ViewerEmptyState";
import { ViewerHeader } from "../src/components/shell/ViewerHeader";
import { TooltipProvider } from "../src/components/ui/tooltip";
import { activateSelectableEdge } from "../src/lib/view-layout/edge-activation";
import { buildElkGraph } from "../src/lib/view-layout/build-elk-graph";
import { getViewerNavigationExperience } from "../src/lib/view-experience";
import { mapLayoutedGraphToFlow } from "../src/lib/view-layout/map-layout-to-flow";
import { projectViewGraph } from "../src/lib/view-layout/project-view-graph";
import {
  selectionFromEdgeData,
  selectionFromNodeData
} from "../src/lib/view-layout/selection";
import type {
  BusinessViewerSpec,
  FlowEdge,
  ViewerDetailItem,
  ViewerDetailValue,
  ViewerViewSpec
} from "../src/types";

function textDetailValue(text: string): ViewerDetailValue {
  return {
    kind: "text",
    text
  };
}

const RELATION_DETAILS: readonly ViewerDetailItem[] = [
  { semanticKey: "relation.kind", label: "Relation Type", value: textDetailValue("sequence") },
  { semanticKey: "relation.label", label: "Relation", value: textDetailValue("next") },
  { semanticKey: "relation.from", label: "From", value: textDetailValue("Draft") },
  { semanticKey: "relation.to", label: "To", value: textDetailValue("Approved") }
];

const DEMO_VIEWER_SPEC: BusinessViewerSpec = {
  viewerVersion: 3,
  specId: "demo",
  title: "Demo Workspace",
  summary: "Demo summary",
  detailHelp: {
    semantic: {}
  },
  views: [
    createDemoView({
      id: "context-map",
      kind: "context-map",
      title: "Context Map",
      tier: "primary",
      order: 10,
      isDefault: true
    }),
    createDemoView({
      id: "scenario-story",
      kind: "scenario-story",
      title: "Scenario Story",
      tier: "primary",
      order: 20
    }),
    createDemoView({
      id: "message-flow",
      kind: "message-flow",
      title: "Message Flow / Trace",
      tier: "primary",
      order: 30
    }),
    createDemoView({
      id: "lifecycle",
      kind: "lifecycle",
      title: "Lifecycle",
      tier: "primary",
      order: 40
    }),
    createDemoView({
      id: "domain-structure",
      kind: "domain-structure",
      title: "Domain Structure",
      tier: "secondary",
      order: 50
    })
  ]
};

test("relation node reuses edge details without injecting duplicate kind metadata", () => {
  const view: ViewerViewSpec = {
    id: "scenario-story",
    kind: "scenario-story",
    navigation: {
      tier: "primary",
      order: 20
    },
    title: "Scenario Story",
    description: "demo",
    nodes: [
      {
        id: "scenario-story:scenario:approval:step:draft",
        kind: "scenario-step",
        label: "Draft",
        width: 200,
        height: 100,
        details: []
      },
      {
        id: "scenario-story:scenario:approval:step:approved",
        kind: "scenario-step",
        label: "Approved",
        width: 200,
        height: 100,
        details: []
      }
    ],
    edges: [
      {
        id: "scenario-story:approval:sequence:draft:approved",
        kind: "sequence",
        source: "scenario-story:scenario:approval:step:draft",
        target: "scenario-story:scenario:approval:step:approved",
        label: "ApprovalGranted",
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
    navigation: {
      tier: "secondary",
      order: 50
    },
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
    navigation: {
      tier: "secondary",
      order: 50
    },
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
    relationKind: "sequence",
    label: "next",
    details: RELATION_DETAILS
  });
  const edgeSelection = selectionFromEdgeData({
    kind: "sequence",
    label: "next",
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

test("lifecycle edge selections keep aggregate ownership and trigger details", () => {
  const edgeSelection = selectionFromEdgeData({
    kind: "state-transition",
    label: "ledger-status-fetched",
    details: [
      { semanticKey: "relation.kind", label: "Relation Type", value: textDetailValue("state-transition") },
      { semanticKey: "aggregate.id", label: "Aggregate", value: textDetailValue("order") },
      { semanticKey: "aggregate.context", label: "Context", value: textDetailValue("orders") },
      { semanticKey: "relation.from", label: "From", value: textDetailValue("submitted") },
      { semanticKey: "relation.to", label: "To", value: textDetailValue("confirmed") },
      {
        semanticKey: "transition.trigger_message",
        label: "Trigger message",
        value: textDetailValue("ledger-status-fetched")
      }
    ]
  });

  assert.deepEqual(
    edgeSelection.details.map((item) => item.semanticKey),
    [
      "aggregate.id",
      "aggregate.context",
      "relation.from",
      "relation.to",
      "transition.trigger_message"
    ]
  );
});

test("context-map collaboration selections keep relationship direction and integration details", () => {
  const edgeSelection = selectionFromEdgeData({
    kind: "collaboration",
    label: "depends-on",
    details: [
      { semanticKey: "context.id", label: "Context", value: textDetailValue("orders") },
      { semanticKey: "relation.from", label: "From", value: textDetailValue("orders") },
      { semanticKey: "relation.to", label: "To", value: textDetailValue("context:payments") },
      {
        semanticKey: "context.relationships",
        label: "Relationships",
        value: {
          kind: "record",
          entries: [
            { label: "Relationship", value: textDetailValue("requests-payment-authorization") },
            { label: "Kind", value: textDetailValue("depends-on") },
            { label: "Direction", value: textDetailValue("downstream") },
            { label: "Integration", value: textDetailValue("customer-supplier") },
            { label: "Target", value: textDetailValue("context:payments") }
          ]
        }
      }
    ]
  });

  assert.deepEqual(
    edgeSelection.details.map((item) => item.semanticKey),
    ["context.id", "relation.from", "relation.to", "context.relationships"]
  );
  assert.equal(edgeSelection.details[3]?.value.kind, "record");
});

test("detail renderer recursively renders structured field sections", () => {
  const markup = renderToStaticMarkup(
    createElement(DetailValueRenderer, {
      value: {
        kind: "section",
        title: "Fields",
        children: [
          {
            kind: "list",
            items: [
              {
                kind: "field",
                name: "connectionId",
                fieldType: "uuid",
                required: true,
                relation: {
                  kind: "reference",
                  target: "Connection",
                  cardinality: "1"
                },
                description: "Source connection id."
              },
              {
                kind: "record",
                entries: [
                  {
                    label: "Relation",
                    value: textDetailValue("content")
                  }
                ]
              }
            ]
          }
        ]
      }
    })
  );

  assert.match(markup, /Fields/);
  assert.match(markup, /connectionId/);
  assert.match(markup, /uuid · required · references Connection \(1\)/);
  assert.match(markup, /Source connection id\./);
  assert.match(markup, /Relation/);
  assert.match(markup, /content/);
});

test("viewer header surfaces the primary modeling path and map questions", () => {
  const markup = renderToStaticMarkup(
    createElement(ViewerHeader, {
      devSessionMessage: null,
      devSessionTone: null,
      viewerSpec: DEMO_VIEWER_SPEC,
      specSourceLabel: "demo-source",
      selectedViewId: "message-flow",
      onSelectView: () => {},
      onReload: () => {}
    })
  );

  assert.match(
    markup,
    /Default path: Context Map -&gt; Scenario Story -&gt; Message Flow \/ Trace -&gt; Lifecycle/
  );
  assert.match(markup, /Where are the business boundaries, and who collaborates across them\?/);
  assert.match(markup, /How does the business story move from trigger to outcome\?/);
  assert.match(
    markup,
    /Which commands, events, and queries move work between steps, contexts, and systems\?/
  );
  assert.match(markup, /How does a core aggregate change state over time\?/);
  assert.equal((markup.match(/data-slot="primary-map"/g) ?? []).length, 4);
});

test("viewer empty state explains the four primary maps", () => {
  const markup = renderToStaticMarkup(
    createElement(ViewerEmptyState, {
      title: "Preparing Viewer",
      lines: ["Loading modeling workspace..."],
      primaryViewGuide: getViewerNavigationExperience(DEMO_VIEWER_SPEC).primary,
      activeViewId: "context-map"
    })
  );

  assert.match(markup, /Primary Maps/);
  assert.equal((markup.match(/data-slot="view-tour-item"/g) ?? []).length, 4);
  assert.match(markup, /Context Map/);
  assert.match(markup, /Scenario Story/);
  assert.match(markup, /Message Flow \/ Trace/);
  assert.match(markup, /Lifecycle/);
});

test("inspector empty selection explains what the current map answers and how to read it", () => {
  const markup = renderToStaticMarkup(
    createElement(
      TooltipProvider,
      { delayDuration: 0 },
      createElement(InspectorPanel, {
        view: DEMO_VIEWER_SPEC.views[2] as ViewerViewSpec,
        selection: null,
        semanticDetailHelp: {}
      })
    )
  );

  assert.match(markup, /Question This Map Answers/);
  assert.match(
    markup,
    /Which commands, events, and queries move work between steps, contexts, and systems\?/
  );
  assert.match(
    markup,
    /Inspect a message to see its source, target, and scenario links, then follow message-flow edges to understand where contracts cross context boundaries\./
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

function createDemoView({
  id,
  kind,
  title,
  tier,
  order,
  isDefault = false
}: {
  id: string;
  kind: ViewerViewSpec["kind"];
  title: string;
  tier: ViewerViewSpec["navigation"]["tier"];
  order: number;
  isDefault?: boolean;
}): ViewerViewSpec {
  return {
    id,
    kind,
    navigation: {
      tier,
      order,
      ...(isDefault ? { default: true } : {})
    },
    title,
    description: `${title} description`,
    nodes: [],
    edges: []
  };
}
