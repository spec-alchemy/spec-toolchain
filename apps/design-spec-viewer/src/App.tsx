import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type ReactFlowInstance
} from "@xyflow/react";
import {
  useDeferredValue,
  useEffect,
  useRef,
  useState
} from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GroupNode } from "@/components/GroupNode";
import { InspectorPanel } from "@/components/InspectorPanel";
import { ItemNode } from "@/components/ItemNode";
import { Legend } from "@/components/Legend";
import { RelationNode } from "@/components/RelationNode";
import { ViewerEdge } from "@/components/ViewerEdge";
import { ViewerEmptyState } from "@/components/shell/ViewerEmptyState";
import { ViewerHeader } from "@/components/shell/ViewerHeader";
import { layoutViewerView, selectionFromNodeData, type LayoutedView } from "@/lib/layout";
import { loadViewerSpec } from "@/lib/load-viewer-spec";
import type {
  BusinessViewerSpec,
  FlowEdge,
  FlowNode,
  InspectorSelection,
  ViewerViewSpec
} from "@/types";

const nodeTypes = {
  groupNode: GroupNode,
  itemNode: ItemNode,
  relationNode: RelationNode
} as const;

const edgeTypes = {
  viewerEdge: ViewerEdge
} as const;

const EMPTY_SEMANTIC_DETAIL_HELP: Readonly<Record<string, string>> = {};

export default function App() {
  const [viewerSpec, setViewerSpec] = useState<BusinessViewerSpec | null>(null);
  const [selectedViewId, setSelectedViewId] = useState("");
  const deferredViewId = useDeferredValue(selectedViewId);
  const [layoutedView, setLayoutedView] = useState<LayoutedView | null>(null);
  const [selection, setSelection] = useState<InspectorSelection | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Loading viewer spec...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const reactFlowRef = useRef<ReactFlowInstance<FlowNode, FlowEdge> | null>(
    null
  );

  useEffect(() => {
    void refreshViewerSpec();
  }, []);

  useEffect(() => {
    if (!viewerSpec) {
      return;
    }

    const currentView = viewerSpec.views.find((view) => view.id === deferredViewId) ?? viewerSpec.views[0];

    if (!currentView) {
      return;
    }

    let cancelled = false;
    setLayoutedView(null);
    setSelection(null);
    setLoadingMessage(`Laying out ${currentView.title}...`);

    void layoutViewerView(currentView)
      .then((nextLayout) => {
        if (cancelled) {
          return;
        }

        setLayoutedView(nextLayout);
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setErrorMessage(toErrorMessage(error));
      });

    return () => {
      cancelled = true;
    };
  }, [viewerSpec, deferredViewId]);

  useEffect(() => {
    if (!layoutedView || !reactFlowRef.current) {
      return;
    }

    requestAnimationFrame(() => {
      reactFlowRef.current?.fitView({ padding: 0.18, duration: 350 });
      setLoadingMessage("");
    });
  }, [layoutedView]);

  const currentView = viewerSpec?.views.find((view) => view.id === deferredViewId) ?? viewerSpec?.views[0] ?? null;

  async function refreshViewerSpec(): Promise<void> {
    try {
      setLoadingMessage("Loading viewer spec...");
      const nextSpec = await loadViewerSpec();

      setViewerSpec(nextSpec);
      setSelectedViewId((current) =>
        nextSpec.views.some((view) => view.id === current)
          ? current
          : (nextSpec.views[0]?.id ?? "")
      );
      setErrorMessage(null);
    } catch (error: unknown) {
      setErrorMessage(toErrorMessage(error));
    }
  }

  return (
    <TooltipProvider delayDuration={120}>
      <div className="grid h-full grid-cols-[minmax(0,1fr)_320px] grid-rows-[auto_minmax(0,1fr)] gap-3 p-3 max-[1080px]:grid-cols-1 max-[1080px]:grid-rows-[auto_minmax(420px,1fr)_auto]">
        <ViewerHeader
          viewerSpec={viewerSpec}
          selectedViewId={selectedViewId}
          onSelectView={setSelectedViewId}
          onReload={() => {
            void refreshViewerSpec();
          }}
        />

        <Card className="min-h-0 overflow-hidden">
          {errorMessage ? (
            <ViewerEmptyState
              title="Viewer Load Failed"
              lines={[
                errorMessage,
                "Run `npm run build:design-spec` in the repository root to regenerate `viewer-spec.json`."
              ]}
            />
          ) : !layoutedView ? (
            <ViewerEmptyState title="Preparing Viewer" lines={[loadingMessage]} />
          ) : (
            <ReactFlowProvider>
              <ReactFlow<FlowNode, FlowEdge>
                nodes={layoutedView.nodes}
                edges={layoutedView.edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={true}
                fitView={true}
                minZoom={0.2}
                maxZoom={1.6}
                onInit={(instance) => {
                  reactFlowRef.current = instance;
                }}
                onNodeClick={(_, node) => {
                  setSelection(selectionFromNodeData(node.data));
                }}
                onEdgeClick={(_, edge) => {
                  setSelection({
                    type: `${edge.data?.kind ?? "edge"} edge`,
                    label: typeof edge.label === "string" ? edge.label : edge.id,
                    summary: edge.data?.kind,
                    details: edge.data?.details ?? []
                  });
                }}
                onPaneClick={() => {
                  setSelection(null);
                }}
              >
                <Background gap={20} size={1} color="#d7ccb7" />
                <MiniMap
                  pannable={true}
                  zoomable={true}
                  nodeColor={(node) => {
                    switch (node.data.kind) {
                      case "process-group":
                        return "#d7bb74";
                      case "aggregate-group":
                        return "#8aac91";
                      case "relation":
                        switch (node.data.relationKind) {
                          case "advance":
                            return "#6f88b8";
                          case "binding":
                            return "#7e766a";
                          case "transition":
                            return "#6f9f79";
                          case "accepts":
                            return "#c6a24b";
                          case "emits":
                            return "#c67e42";
                          default:
                            return "#8d5c2f";
                        }
                      case "stage":
                        return "#7d9fc4";
                      case "final-stage":
                        return "#cf8d76";
                      case "aggregate-state":
                        return "#6f9f79";
                      case "command":
                        return "#c6a24b";
                      case "event":
                        return "#6f88b8";
                      default:
                        return "#8d5c2f";
                    }
                  }}
                />
                <Controls />
              </ReactFlow>
            </ReactFlowProvider>
          )}
        </Card>

        <Card className="min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <aside className="space-y-4 p-4">
              <InspectorPanel
                view={currentView as ViewerViewSpec | null}
                selection={selection}
                semanticDetailHelp={
                  viewerSpec?.detailHelp.semantic ?? EMPTY_SEMANTIC_DETAIL_HELP
                }
              />
              <Legend />
            </aside>
          </ScrollArea>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}
