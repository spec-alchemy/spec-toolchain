import { createContext, useContext, type ReactNode } from "react";
import type { FlowEdge } from "@/types";

interface FlowCanvasContextValue {
  activateEdgeSelection: (edge: Pick<FlowEdge, "id" | "data">) => void;
}

const FlowCanvasContext = createContext<FlowCanvasContextValue | null>(null);

export function FlowCanvasContextProvider({
  children,
  value
}: {
  children: ReactNode;
  value: FlowCanvasContextValue;
}) {
  return (
    <FlowCanvasContext.Provider value={value}>
      {children}
    </FlowCanvasContext.Provider>
  );
}

export function useFlowCanvasContext(): FlowCanvasContextValue {
  const value = useContext(FlowCanvasContext);

  if (!value) {
    throw new Error("FlowCanvas context is not available");
  }

  return value;
}
