import { setup } from "xstate";
import {
  connectionAggregate,
  connectionAggregateAccepts,
  connectionAggregateEmits
} from "../../canonical/index.js";
import type { AggregateMachineSpec } from "../../types.js";
import { projectAggregateMachineStates, type CanonicalMessageEnvelope } from "./shared.js";

const connectionMachineLogic = setup({
  types: {
    events: {} as CanonicalMessageEnvelope
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
  string,
  typeof connectionMachineLogic,
  string,
  string
>;
