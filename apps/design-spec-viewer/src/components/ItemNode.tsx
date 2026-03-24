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

export function ItemNode({ data }: NodeProps<FlowNode>) {
  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        style={hiddenHandleStyle}
      />
      <div className={`node-card kind-${data.kind}`}>
        <div className="node-card__body">
          <span className="kind-pill">{data.kind.replace("-", " ")}</span>
          <h3 className="node-label">{data.label}</h3>
          {data.subtitle ? <div className="node-subtitle">{data.subtitle}</div> : null}
          {data.summary ? <div className="node-summary">{data.summary}</div> : null}
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
