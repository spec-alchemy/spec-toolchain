import elkWorkerUrl from "elkjs/lib/elk-worker.min.js?url";
import type { ELK } from "elkjs/lib/elk-api.js";
import type { ViewerViewSpec } from "../types";
import { buildElkGraph } from "./view-layout/build-elk-graph";
import { mapLayoutedGraphToFlow } from "./view-layout/map-layout-to-flow";
import { projectViewGraph } from "./view-layout/project-view-graph";
import type { LayoutedView } from "./view-layout/shared";

let elkPromise: Promise<ELK> | null = null;

export type { LayoutedView } from "./view-layout/shared";
export { selectionFromNodeData } from "./view-layout/selection";

export async function layoutViewerView(view: ViewerViewSpec): Promise<LayoutedView> {
  const elk = await getElk();
  const projectedGraph = projectViewGraph(view);
  const layoutedGraph = await elk.layout(buildElkGraph(projectedGraph));

  return mapLayoutedGraphToFlow(projectedGraph, layoutedGraph);
}

async function getElk(): Promise<ELK> {
  if (elkPromise) {
    return elkPromise;
  }

  const nextElkPromise = import("elkjs/lib/elk-api.js")
    .then(({ default: ELK }) => new ELK({ workerUrl: elkWorkerUrl }))
    .catch((error: unknown) => {
      elkPromise = null;
      throw error;
    });

  elkPromise = nextElkPromise;

  return nextElkPromise;
}
