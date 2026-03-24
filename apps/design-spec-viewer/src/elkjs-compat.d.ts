declare module "elkjs/lib/elk-api.js" {
  export interface LayoutOptions {
    [key: string]: string;
  }

  export interface ElkGraphElement {
    id?: string;
    layoutOptions?: LayoutOptions;
  }

  export interface ElkPoint {
    x: number;
    y: number;
  }

  export interface ElkShape extends ElkGraphElement {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }

  export interface ElkNode extends ElkShape {
    id: string;
    children?: ElkNode[];
    edges?: ElkExtendedEdge[];
  }

  export interface ElkEdge extends ElkGraphElement {
    id: string;
    container?: string;
    junctionPoints?: ElkPoint[];
    sources: string[];
    targets: string[];
  }

  export interface ElkEdgeSection extends ElkGraphElement {
    startPoint: ElkPoint;
    endPoint: ElkPoint;
    bendPoints?: ElkPoint[];
    incomingShape?: string;
    outgoingShape?: string;
  }

  export interface ElkExtendedEdge extends ElkEdge {
    sections?: ElkEdgeSection[];
  }

  export interface ElkLayoutArguments {
    layoutOptions?: LayoutOptions;
    logging?: boolean;
    measureExecutionTime?: boolean;
  }

  export interface ELK {
    layout<T extends ElkNode>(
      graph: T,
      args?: ElkLayoutArguments
    ): Promise<Omit<T, "children"> & { children?: (T["children"][number] & ElkNode)[] }>;
  }
}

declare module "elkjs/lib/elk.bundled.js" {
  import type { ELK, LayoutOptions } from "elkjs/lib/elk-api.js";

  export interface ELKConstructorArguments {
    defaultLayoutOptions?: LayoutOptions;
    algorithms?: string[];
    workerUrl?: string;
  }

  const ElkConstructor: {
    new (args?: ELKConstructorArguments): ELK;
  };

  export default ElkConstructor;
}
