import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DetailValueRenderer } from "../src/components/DetailValueRenderer";
import { InspectorPanel } from "../src/components/InspectorPanel";
import { AppHeader } from "../src/components/shell/AppHeader";
import { ViewNavigation } from "../src/components/shell/ViewNavigation";
import { ViewerEmptyState } from "../src/components/shell/ViewerEmptyState";
import { WorkspaceContextBar } from "../src/components/shell/WorkspaceContextBar";
import { TooltipProvider } from "../src/components/ui/tooltip";
import { loadViewerSpec } from "../src/lib/load-viewer-spec";
import { activateSelectableEdge } from "../src/lib/view-layout/edge-activation";
import { getViewerNavigationExperience } from "../src/lib/view-experience";
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
  viewerVersion: 1,
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
      id: "policy-saga",
      kind: "policy-saga",
      title: "Policy / Saga",
      tier: "secondary",
      order: 50
    })
  ]
};

test("viewer spec loader accepts version 1 payloads", async (t) => {
  const originalFetch = globalThis.fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        viewerVersion: 1,
        specId: "demo",
        title: "Demo Workspace",
        summary: "Demo summary",
        detailHelp: {
          semantic: {}
        },
        views: []
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  const result = await loadViewerSpec({
    locationUrl: new URL("https://example.com/viewer"),
    source: {
      url: new URL("https://example.com/generated/viewer-spec.json"),
      label: "generated/viewer-spec.json",
      isDefault: true
    }
  });

  assert.equal(result.spec.viewerVersion, 1);
});

test("viewer spec loader rejects unsupported viewer versions with the reset expectation", async (t) => {
  const originalFetch = globalThis.fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        viewerVersion: 3,
        specId: "legacy-demo",
        title: "Legacy Demo",
        summary: "Legacy summary",
        detailHelp: {
          semantic: {}
        },
        views: []
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  await assert.rejects(
    loadViewerSpec({
      locationUrl: new URL("https://example.com/viewer"),
      source: {
        url: new URL("https://example.com/generated/viewer-spec.json"),
        label: "generated/viewer-spec.json",
        isDefault: true
      }
    }),
    /Unsupported viewer spec version 3; expected 1/
  );
});

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

test("context map ownership and collaboration render as direct labeled edges", () => {
  const view: ViewerViewSpec = {
    id: "context-map",
    kind: "context-map",
    navigation: {
      tier: "primary",
      order: 10
    },
    title: "Context Map",
    description: "demo",
    nodes: [
      {
        id: "context-map:context:graph",
        kind: "context",
        label: "Knowledge Graph",
        width: 320,
        height: 180,
        details: []
      },
      {
        id: "context-map:actor:learner",
        kind: "actor",
        label: "Learner",
        width: 180,
        height: 100,
        details: []
      },
      {
        id: "context-map:aggregate:connection",
        kind: "aggregate",
        label: "Connection",
        width: 180,
        height: 100,
        details: []
      }
    ],
    edges: [
      {
        id: "context-map:collaboration:actor:learner:context:graph",
        kind: "collaboration",
        source: "context-map:actor:learner",
        target: "context-map:context:graph",
        label: "participates",
        details: RELATION_DETAILS
      },
      {
        id: "context-map:ownership:context:graph:aggregate:connection",
        kind: "ownership",
        source: "context-map:context:graph",
        target: "context-map:aggregate:connection",
        label: "owns",
        details: RELATION_DETAILS
      }
    ]
  };

  const projected = projectViewGraph(view);

  assert.equal(projected.nodes.filter((node) => node.kind === "relation").length, 0);
  assert.deepEqual(
    projected.edges.map((edge) => ({
      id: edge.id,
      renderLabel: edge.renderLabel,
      isTerminalSegment: edge.isTerminalSegment
    })),
    [
      {
        id: "context-map:collaboration:actor:learner:context:graph",
        renderLabel: true,
        isTerminalSegment: true
      },
      {
        id: "context-map:ownership:context:graph:aggregate:connection",
        renderLabel: true,
        isTerminalSegment: true
      }
    ]
  );
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

test("app header keeps global identity and controls lightweight", () => {
  const markup = renderToStaticMarkup(
    createElement(AppHeader, {
      currentLocale: "en",
      devSessionTone: null,
      viewerSpec: DEMO_VIEWER_SPEC,
      currentViewTitle: "Message Flow / Trace",
      onSelectLocale: () => {},
      onReload: () => {}
    })
  );

  assert.match(markup, /Domain Model Workspace/);
  assert.match(markup, /Demo Workspace/);
  assert.match(markup, /Message Flow \/ Trace/);
  assert.match(markup, /Workspace status/);
  assert.match(markup, /Ready/);
  assert.match(markup, /data-slot="workspace-status-dot"/);
  assert.match(markup, /English/);
  assert.match(markup, /data-slot="language-selector"/);
  assert.match(markup, /Reload Viewer/);
  assert.match(markup, /data-slot="toolbar-row"/);
  assert.match(markup, /data-slot="reload-button"/);
  assert.equal((markup.match(/data-slot="identity-separator"/g) ?? []).length, 2);
  assert.doesNotMatch(markup, /Current view:/);
  assert.doesNotMatch(markup, /Primary modeling flow/);
});

test("workspace context bar owns metadata and notices outside the app header", () => {
  const markup = renderToStaticMarkup(
    createElement(WorkspaceContextBar, {
      currentLocale: "en",
      devSessionMessage: "Watching the default workspace for fresh builds.",
      devSessionTone: "info",
      localeFallbackNotice:
        "Localized viewer artifact unavailable for zh-CN. Showing demo-source instead.",
      summary: "Demo summary",
      specSourceLabel: "demo-source",
      primaryModelingFlow:
        "Context Map -> Scenario Story -> Message Flow / Trace -> Lifecycle",
      isExpanded: true,
      onToggleExpanded: () => {}
    })
  );

  assert.match(markup, /Default entry/);
  assert.match(markup, /domain-model\/index\.yaml/);
  assert.match(
    markup,
    /Primary modeling flow/
  );
  assert.match(markup, /Context Map -&gt; Scenario Story -&gt; Message Flow \/ Trace -&gt; Lifecycle/);
  assert.match(markup, /Viewer artifact/);
  assert.match(markup, /demo-source/);
  assert.match(markup, /Watching the default workspace for fresh builds\./);
  assert.match(markup, /Localized viewer artifact unavailable for zh-CN/);
  assert.match(markup, /Workspace info/);
  assert.match(markup, /Demo summary/);
  assert.match(markup, /Hide details/);
});

test("view navigation owns map switching outside the app header", () => {
  const navigation = getViewerNavigationExperience(DEMO_VIEWER_SPEC, "zh-CN");
  const markup = renderToStaticMarkup(
    createElement(ViewNavigation, {
      currentLocale: "zh-CN",
      navigation,
      selectedView: navigation.primary[2],
      selectedViewId: "message-flow",
      onSelectView: () => {}
    })
  );

  assert.match(markup, /视图切换/);
  assert.match(markup, /当前视图回答：/);
  assert.match(markup, /哪些 command、event 和 query 在步骤、context 与系统之间传递工作？/);
  assert.match(markup, /data-slot="primary-map-tab"/);
  assert.equal((markup.match(/data-slot="primary-map-tab"/g) ?? []).length, 4);
  assert.match(markup, /更多视图/);
  assert.match(markup, /data-slot="secondary-view-selector"/);
});

test("viewer empty state explains the four primary maps", () => {
  const markup = renderToStaticMarkup(
    createElement(ViewerEmptyState, {
      title: "Preparing Domain Model Workspace",
      lines: ["Loading the domain model workspace from domain-model/index.yaml..."],
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

test("viewer empty state localizes system guide copy in zh-CN", () => {
  const markup = renderToStaticMarkup(
    createElement(ViewerEmptyState, {
      locale: "zh-CN",
      title: "正在准备领域模型工作区",
      lines: ["正在从 domain-model/index.yaml 加载领域模型工作区……"],
      primaryViewGuide: getViewerNavigationExperience(DEMO_VIEWER_SPEC, "zh-CN").primary,
      activeViewId: "context-map"
    })
  );

  assert.match(markup, /主视图/);
  assert.match(markup, /视图 1/);
  assert.match(markup, /Context Map/);
  assert.match(markup, /业务边界在哪里/);
});

test("inspector no-view state points back to the default domain model entry", () => {
  const markup = renderToStaticMarkup(
    createElement(
      TooltipProvider,
      { delayDuration: 0 },
      createElement(InspectorPanel, {
        view: null,
        selection: null,
        semanticDetailHelp: {}
      })
    )
  );

  assert.match(markup, /No View Loaded/);
  assert.match(markup, /domain-model\/index\.yaml/);
  assert.match(
    markup,
    /primary modeling flow: Context Map -&gt; Scenario Story -&gt; Message Flow \/ Trace -&gt; Lifecycle\./
  );
});

test("inspector no-view state localizes UI-owned copy in zh-CN", () => {
  const markup = renderToStaticMarkup(
    createElement(
      TooltipProvider,
      { delayDuration: 0 },
      createElement(InspectorPanel, {
        locale: "zh-CN",
        view: null,
        selection: null,
        semanticDetailHelp: {}
      })
    )
  );

  assert.match(markup, /状态/);
  assert.match(markup, /尚未加载视图/);
  assert.match(markup, /加载 domain-model\/index\.yaml 生成的 viewer 数据后，即可查看主建模路径：上下文地图 -&gt; 场景故事 -&gt; 消息流 \/ 追踪 -&gt; 生命周期。/);
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

test("inspector empty selection localizes UI-owned labels while preserving view business text", () => {
  const markup = renderToStaticMarkup(
    createElement(
      TooltipProvider,
      { delayDuration: 0 },
      createElement(InspectorPanel, {
        locale: "zh-CN",
        view: DEMO_VIEWER_SPEC.views[2] as ViewerViewSpec,
        selection: null,
        semanticDetailHelp: {}
      })
    )
  );

  assert.match(markup, /主视图/);
  assert.match(markup, /Message Flow \/ Trace/);
  assert.match(markup, /当前视图回答的问题/);
  assert.match(markup, /如何阅读/);
  assert.match(markup, /查看消息的来源、目标与场景关联/);
});

test("inspector empty detail fallback localizes system copy but keeps user-authored detail labels", () => {
  const selection = {
    type: "scenario-step",
    label: "Draft Order",
    details: []
  };

  const markup = renderToStaticMarkup(
    createElement(
      TooltipProvider,
      { delayDuration: 0 },
      createElement(InspectorPanel, {
        locale: "zh-CN",
        view: DEMO_VIEWER_SPEC.views[0] as ViewerViewSpec,
        selection,
        semanticDetailHelp: {}
      })
    )
  );

  assert.match(markup, /Draft Order/);
  assert.match(markup, /详情/);
  assert.match(markup, /当前没有可显示的详情。/);
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
