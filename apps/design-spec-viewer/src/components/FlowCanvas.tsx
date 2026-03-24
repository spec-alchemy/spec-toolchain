import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type ReactFlowInstance
} from "@xyflow/react";
import { useEffect, useRef } from "react";
import { GroupNode } from "@/components/GroupNode";
import { ItemNode } from "@/components/ItemNode";
import { RelationNode } from "@/components/RelationNode";
import { ViewerEdge } from "@/components/ViewerEdge";
import {
  getMiniMapNodeColor,
  VIEWER_GRID_COLOR
} from "@/lib/viewer-colors";
import { selectionFromNodeData } from "@/lib/view-layout/selection";
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

  return (
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
          onSelectSelection(selectionFromNodeData(node.data));
        }}
        onEdgeClick={(_, edge) => {
          onSelectSelection({
            type: `${edge.data?.kind ?? "edge"} edge`,
            label: typeof edge.label === "string" ? edge.label : edge.id,
            summary: edge.data?.kind,
            details: edge.data?.details ?? []
          });
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
    </ReactFlowProvider>
  );
}
