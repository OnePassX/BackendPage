import { createContext, useContext } from "react";
import type { FlowActions } from "./types";

export const FlowActionsContext = createContext<FlowActions | null>(null);

export function useFlowActions(): FlowActions {
  const ctx = useContext(FlowActionsContext);
  if (!ctx) throw new Error("useFlowActions must be used within ExhibitionFlow");
  return ctx;
}
