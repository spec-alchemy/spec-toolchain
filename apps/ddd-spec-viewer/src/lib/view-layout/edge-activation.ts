import type { FlowEdge, FlowNode } from "../../types";

interface EdgeActivationActions {
  addSelectedEdges: (edgeIds: string[]) => void;
  setNodesSelectionActive: (active: boolean) => void;
  unselectNodesAndEdges: (params?: {
    nodes?: FlowNode[];
    edges?: FlowEdge[];
  }) => void;
}

export function activateSelectableEdge(params: {
  id: string;
  selected: boolean;
  selectable: boolean;
  multiSelectionActive: boolean;
  edge: FlowEdge | undefined;
  actions: EdgeActivationActions;
}): void {
  const {
    actions,
    edge,
    id,
    multiSelectionActive,
    selectable,
    selected
  } = params;

  if (!selectable) {
    return;
  }

  actions.setNodesSelectionActive(false);

  if (selected && multiSelectionActive && edge) {
    actions.unselectNodesAndEdges({
      nodes: [],
      edges: [edge]
    });

    return;
  }

  actions.addSelectedEdges([id]);
}
