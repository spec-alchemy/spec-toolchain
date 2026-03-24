import { setup } from "xstate";
import {
  cardAggregate,
  cardAggregateAccepts,
  cardAggregateEmits
} from "../../../examples/connection-card-review/index.js";
import type { AggregateMachineSpec } from "../../types.js";
import { projectAggregateMachineStates, type CanonicalMessageEnvelope } from "./shared.js";

const cardMachineLogic = setup({
  types: {
    events: {} as CanonicalMessageEnvelope
  }
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5gF8A0IB2B7CdGgGMBDAJwnxAActYBLAF1qwwoA9EBGAJnQE9OuyIciA */
  id: "card",
  initial: cardAggregate.initial,
  states: projectAggregateMachineStates(cardAggregate)
});

export const cardMachine = {
  objectId: cardAggregate.objectId,
  logic: cardMachineLogic,
  accepts: cardAggregateAccepts,
  emits: cardAggregateEmits
} as const satisfies AggregateMachineSpec<
  string,
  typeof cardMachineLogic,
  string,
  string
>;
