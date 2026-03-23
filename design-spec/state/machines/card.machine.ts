import { setup } from "xstate";
import type { AggregateMachineSpec } from "../../types.js";
import {
  cardAggregate,
  cardAggregateAccepts,
  cardAggregateEmits,
  type CardCommand,
} from "../../domain/index.js";
import { projectAggregateMachineStates } from "./shared.js";

const cardMachineLogic = setup({
  types: {
    events: {} as CardCommand
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
  typeof cardAggregate.objectId,
  typeof cardMachineLogic,
  CardCommand["type"],
  "CardAccepted" | "CardArchived"
>;
