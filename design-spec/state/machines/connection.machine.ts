import { setup } from "xstate";
import type { AggregateMachineSpec } from "../../types.js";
import {
  connectionAggregate,
  connectionAggregateAccepts,
  connectionAggregateEmits,
  type ConnectionCommand,
} from "../../domain/index.js";
import { projectAggregateMachineStates } from "./shared.js";

const connectionMachineLogic = setup({
  types: {
    events: {} as ConnectionCommand
  }
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5gF8A0IB2B7CdGgGMsMMwCAXAS2PxAActZKqakQAPRARgCZ0BPbj2QjkQA */
  id: "connection",
  initial: connectionAggregate.initial,
  states: projectAggregateMachineStates(connectionAggregate)
});

export const connectionMachine = {
  objectId: connectionAggregate.objectId,
  logic: connectionMachineLogic,
  accepts: connectionAggregateAccepts,
  emits: connectionAggregateEmits
} as const satisfies AggregateMachineSpec<
  typeof connectionAggregate.objectId,
  typeof connectionMachineLogic,
  ConnectionCommand["type"],
  "ConnectionConfirmed" | "ConnectionArchived"
>;
