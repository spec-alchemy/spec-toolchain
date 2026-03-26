import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type ReactFlowInstance
} from "@xyflow/react";
import { useCallback, useEffect, useRef } from "react";
import { GroupNode } from "@/components/GroupNode";
import { ItemNode } from "@/components/ItemNode";
import { Legend } from "@/components/Legend";
import { RelationNode } from "@/components/RelationNode";
import { ViewerEdge } from "@/components/ViewerEdge";
import { FlowCanvasContextProvider } from "@/components/flow-canvas-context";
import {
  getMiniMapNodeColor,
  VIEWER_GRID_COLOR
} from "@/lib/viewer-colors";
import {
  selectionFromEdgeData,
  selectionFromNodeData
} from "@/lib/view-layout/selection";
import type { LayoutedView } from "@/lib/layout";
import type {
  FlowEdge,
  FlowNode,
  InspectorSelection
} from "@/types";

interface FlowCanvasProps {
  layoutedView: LayoutedView;
  onSelectSelection: (selection: InspectorSelection | null) => void;
}

const nodeTypes = {
  groupNode: GroupNode,
  itemNode: ItemNode,
  relationNode: RelationNode
} as const;

const edgeTypes = {
  viewerEdge: ViewerEdge
} as const;

export function FlowCanvas({
  layoutedView,
  onSelectSelection
}: FlowCanvasProps) {
  const reactFlowRef = useRef<ReactFlowInstance<FlowNode, FlowEdge> | null>(
    null
  );

  useEffect(() => {
    if (!reactFlowRef.current) {
      return;
    }

    requestAnimationFrame(() => {
      reactFlowRef.current?.fitView({ padding: 0.18, duration: 350 });
    });
  }, [layoutedView]);

  const handleEdgeActivate = useCallback((edge: Pick<FlowEdge, "id" | "data">) => {
    onSelectSelection(
      selectionFromEdgeData({
        kind: edge.data?.kind,
        label: edge.data?.label ?? edge.id,
        details: edge.data?.details ?? []
      })
    );
  }, [onSelectSelection]);

  return (
    <ReactFlowProvider>
      <FlowCanvasContextProvider
        value={{
          activateEdgeSelection: handleEdgeActivate
        }}
      >
        <div className="flex h-full min-h-0 flex-col" data-component="flow-canvas">
          <div className="relative min-h-0 flex-1" data-slot="canvas-stage">
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
                onSelectSelection(selectionFromNodeData(node.data));
              }}
              onEdgeClick={(_, edge) => {
                handleEdgeActivate(edge);
              }}
              onPaneClick={() => {
                onSelectSelection(null);
              }}
            >
              <Background gap={20} size={1} color={VIEWER_GRID_COLOR} />
              <MiniMap
                pannable={true}
                zoomable={true}
                nodeColor={(node) => getMiniMapNodeColor(node.data)}
              />
              <Controls />
            </ReactFlow>
            <div
              className="pointer-events-none absolute right-3 top-3 z-10 hidden md:block"
              data-slot="legend-overlay"
            >
              <Legend
                className="pointer-events-auto max-h-[calc(100vh-14rem)] overflow-auto"
                variant="overlay"
              />
            </div>
          </div>
          <div
            className="border-t border-border/70 bg-card/60 p-3 md:hidden"
            data-slot="legend-panel"
          >
            <Legend variant="stacked" />
          </div>
        </div>
      </FlowCanvasContextProvider>
    </ReactFlowProvider>
  );
}
