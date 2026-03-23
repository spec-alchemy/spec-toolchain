import type { AggregateBehaviorSpec } from "../../types.js";
import type { CardCommand } from "../commands.js";
import type { CardDomainEvent } from "../events.js";
import { cardLifecycle, objectIds } from "../objects.js";
import {
  collectAggregateAcceptedCommands,
  collectAggregateEmittedEvents
} from "./shared.js";

// 这里是 Card 聚合的业务真相，不是运行时 machine 配置。
export const cardAggregate = {
  objectId: objectIds.card,
  initial: cardLifecycle[0],
  states: {
    suggested: {
      on: {
        // command -> target lifecycle -> emitted event
        acceptSuggestedCard: {
          target: "accepted",
          emit: {
            type: "CardAccepted",
            payload: (command) => ({
              cardId: command.cardId
            })
          }
        },
        archiveCard: {
          target: "archived",
          emit: {
            type: "CardArchived",
            payload: (command) => ({
              cardId: command.cardId,
              reason: command.reason
            })
          }
        }
      }
    },
    accepted: {},
    archived: {}
  }
} as const satisfies AggregateBehaviorSpec<
  typeof objectIds.card,
  (typeof cardLifecycle)[number],
  CardCommand,
  CardDomainEvent
>;

export const cardAggregateAccepts =
  collectAggregateAcceptedCommands(cardAggregate) as readonly CardCommand["type"][];

export const cardAggregateEmits =
  collectAggregateEmittedEvents(cardAggregate) as readonly CardDomainEvent["type"][];
