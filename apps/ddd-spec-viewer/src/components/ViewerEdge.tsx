import {
  BaseEdge,
  EdgeLabelRenderer,
  useStoreApi,
  type EdgeProps
} from "@xyflow/react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useFlowCanvasContext } from "@/components/flow-canvas-context";
import { activateSelectableEdge } from "../lib/view-layout/edge-activation";
import type { FlowEdge, FlowNode } from "../types";

export function ViewerEdge({
  id,
  data,
  markerEnd,
  selectable = true,
  selected = false,
  sourceX,
  sourceY,
  style,
  targetX,
  targetY
}: EdgeProps<FlowEdge>) {
  const store = useStoreApi<FlowNode, FlowEdge>();
  const { activateEdgeSelection } = useFlowCanvasContext();
  const pathPoints = data?.pathPoints ?? [];
  const edgePath =
    pathPoints.length >= 2
      ? `M ${pathPoints.map((point) => `${point.x},${point.y}`).join(" L ")}`
      : `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
  const labelText = data?.label;
  const labelLayout = data?.showInlineLabel && labelText ? data.labelLayout : undefined;

  function stopLabelPointer(event: ReactMouseEvent<HTMLDivElement>): void {
    event.stopPropagation();
  }

  function handleLabelClick(event: ReactMouseEvent<HTMLDivElement>): void {
    event.preventDefault();
    event.stopPropagation();

    const state = store.getState();

    activateSelectableEdge({
      id,
      selected,
      selectable,
      multiSelectionActive: state.multiSelectionActive,
      edge: state.edgeLookup.get(id),
      actions: {
        addSelectedEdges: state.addSelectedEdges,
        setNodesSelectionActive: (active) => {
          store.setState({ nodesSelectionActive: active });
        },
        unselectNodesAndEdges: state.unselectNodesAndEdges
      }
    });

    activateEdgeSelection({
      id,
      data
    });
  }

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {data?.showInlineLabel && labelText && labelLayout ? (
        <EdgeLabelRenderer>
          <div
            className={`viewer-edge-label nopan relation-kind-${data.kind}`}
            onPointerDown={stopLabelPointer}
            onClick={handleLabelClick}
            data-component="viewer-edge-label"
            data-relation-kind={data.kind}
            style={{
              width: `${labelLayout.width}px`,
              minHeight: `${labelLayout.height}px`,
              transform: `translate(${labelLayout.x}px, ${labelLayout.y}px)`
            }}
          >
            <span className="viewer-edge-label__text">{labelText}</span>
            {data.summary ? (
              <span className="viewer-edge-label__summary">{data.summary}</span>
            ) : null}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
