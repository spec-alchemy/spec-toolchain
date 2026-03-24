import type { NodeProps } from "@xyflow/react";
import type { CSSProperties } from "react";
import { GROUP_HEADER_HEIGHT } from "../lib/viewer-constants";
import type { FlowNode } from "../types";

type GroupCardStyle = CSSProperties & {
  "--group-header-height": string;
};

export function GroupNode({ data }: NodeProps<FlowNode>) {
  const groupCardStyle: GroupCardStyle = {
    "--group-header-height": `${data.headerHeight ?? GROUP_HEADER_HEIGHT}px`
  };

  return (
    <div className={`group-card kind-${data.kind}`} style={groupCardStyle}>
      <div className="group-card__header">
        <span className="kind-pill">{data.kind.replace("-", " ")}</span>
        <h3 className="node-label">{data.label}</h3>
        {data.subtitle ? <div className="node-subtitle">{data.subtitle}</div> : null}
        {data.summary ? <div className="node-summary">{data.summary}</div> : null}
      </div>
      <div className="group-card__body" aria-hidden="true" />
    </div>
  );
}
