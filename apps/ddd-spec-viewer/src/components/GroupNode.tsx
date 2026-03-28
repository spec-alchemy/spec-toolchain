import { Handle, Position, type NodeProps } from "@xyflow/react";
import { getNodeKindLabel } from "@/lib/view-labels";
import type { CSSProperties } from "react";
import { GROUP_HEADER_HEIGHT } from "../lib/viewer-constants";
import type { FlowNode } from "../types";

type GroupCardStyle = CSSProperties & {
  "--group-header-height": string;
};

const hiddenHandleStyle = {
  width: 8,
  height: 8,
  opacity: 0,
  border: 0,
  background: "transparent",
  pointerEvents: "none"
} as const;

export function GroupNode({ data }: NodeProps<FlowNode>) {
  const groupCardStyle: GroupCardStyle = {
    "--group-header-height": `${data.headerHeight ?? GROUP_HEADER_HEIGHT}px`
  };

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        style={hiddenHandleStyle}
      />
      <div
        className={`group-card kind-${data.kind}`}
        data-component="group-node"
        data-kind={data.kind}
        style={groupCardStyle}
      >
        <div className="group-card__header">
          <span className="kind-pill">{getNodeKindLabel(data.kind)}</span>
          <h3 className="node-label">{data.label}</h3>
          {data.subtitle ? <div className="node-subtitle">{data.subtitle}</div> : null}
          {data.summary ? <div className="node-summary">{data.summary}</div> : null}
        </div>
        <div className="group-card__body" aria-hidden="true" />
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
