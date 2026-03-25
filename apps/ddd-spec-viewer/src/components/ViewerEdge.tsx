import {
  BaseEdge,
  type EdgeProps
} from "@xyflow/react";
import type { FlowEdge } from "../types";

export function ViewerEdge({
  data,
  markerEnd,
  sourceX,
  sourceY,
  style,
  targetX,
  targetY
}: EdgeProps<FlowEdge>) {
  const pathPoints = data?.pathPoints ?? [];
  const edgePath =
    pathPoints.length >= 2
      ? `M ${pathPoints.map((point) => `${point.x},${point.y}`).join(" L ")}`
      : `M ${sourceX},${sourceY} L ${targetX},${targetY}`;

  return (
    <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
  );
}
