import type { AggregateBehaviorSpec } from "../../types.js";
import type { ConnectionCommand } from "../commands.js";
import type { ConnectionDomainEvent } from "../events.js";
import { connectionLifecycle, objectIds } from "../objects.js";
import {
  collectAggregateAcceptedCommands,
  collectAggregateEmittedEvents
} from "./shared.js";

// 这里是 Connection 聚合的业务真相，不是运行时 machine 配置。
export const connectionAggregate = {
  objectId: objectIds.connection,
  initial: connectionLifecycle[0],
  states: {
    suggested: {
      on: {
        // command -> target lifecycle -> emitted event
        confirmConnection: {
          target: "confirmed",
          emit: {
            type: "ConnectionConfirmed",
            payload: (command) => ({
              connectionId: command.connectionId
            })
          }
        },
        archiveConnection: {
          target: "archived",
          emit: {
            type: "ConnectionArchived",
            payload: (command) => ({
              connectionId: command.connectionId,
              reason: command.reason
            })
          }
        }
      }
    },
    confirmed: {},
    archived: {}
  }
} as const satisfies AggregateBehaviorSpec<
  typeof objectIds.connection,
  (typeof connectionLifecycle)[number],
  ConnectionCommand,
  ConnectionDomainEvent
>;

export const connectionAggregateAccepts =
  collectAggregateAcceptedCommands(connectionAggregate) as readonly ConnectionCommand["type"][];

export const connectionAggregateEmits =
  collectAggregateEmittedEvents(connectionAggregate) as readonly ConnectionDomainEvent["type"][];
