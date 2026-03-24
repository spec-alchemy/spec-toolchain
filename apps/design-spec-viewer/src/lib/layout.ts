import ELK from "elkjs/lib/elk.bundled.js";
import type { ViewerViewSpec } from "../types";
import { buildElkGraph } from "./view-layout/build-elk-graph";
import { mapLayoutedGraphToFlow } from "./view-layout/map-layout-to-flow";
import { projectViewGraph } from "./view-layout/project-view-graph";
import type { LayoutedView } from "./view-layout/shared";

const elk = new ELK();

export type { LayoutedView } from "./view-layout/shared";
export { selectionFromNodeData } from "./view-layout/selection";

export async function layoutViewerView(view: ViewerViewSpec): Promise<LayoutedView> {
  const projectedGraph = projectViewGraph(view);
  const layoutedGraph = await elk.layout(buildElkGraph(projectedGraph));

  return mapLayoutedGraphToFlow(projectedGraph, layoutedGraph);
}
