import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FlowNode } from "../types";

const hiddenHandleStyle = {
  width: 8,
  height: 8,
  opacity: 0,
  border: 0,
  background: "transparent",
  pointerEvents: "none"
} as const;

export function RelationNode({ data }: NodeProps<FlowNode>) {
  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        style={hiddenHandleStyle}
      />
      <div className={`relation-card relation-kind-${data.relationKind ?? "relation"}`}>
        <div className="relation-card__content">
          {data.relationKind ? (
            <span className="relation-card__kind">
              {data.relationKind.replace("-", " ")}
            </span>
          ) : null}
          <span className="relation-card__label">{data.label}</span>
          {data.summary ? (
            <span className="relation-card__summary">{data.summary}</span>
          ) : null}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        style={hiddenHandleStyle}
      />
    </>
  );
}
