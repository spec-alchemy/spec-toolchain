import { enqueueActions, setup } from "xstate";
import type { SystemSpec } from "../../types.js";
import {
  connectionCardReviewProcess,
  commands,
  type CardCommand,
  type ConnectionCardReviewCommand,
  type ConnectionCardReviewDomainEvent,
  type ConnectionCardReviewStage,
  type ConnectionCommand,
} from "../../domain/index.js";
import { cardMachine } from "../machines/card.machine.js";
import { connectionMachine } from "../machines/connection.machine.js";

const actorIds = {
  connection: "connection",
  card: "card"
} as const;

type ConnectionCardReviewSystemEvent =
  | ConnectionCardReviewCommand
  | ConnectionCardReviewDomainEvent;

const connectionCardReviewSystemSetup = setup({
  actors: {
    connection: connectionMachine.logic,
    card: cardMachine.logic
  },
  types: {
    events: {} as ConnectionCardReviewSystemEvent
  },
  actions: {
    // system 不决定命令语义，只根据 command.target 把命令转发给对应聚合 actor。
    forwardCommandToTargetActor: enqueueActions(({ event, enqueue }) => {
      const command = event as ConnectionCardReviewCommand;
      const actorId = getActorIdByCommandType(command.type);

      switch (actorId) {
        case actorIds.connection:
          enqueue.sendTo(actorIds.connection, command as ConnectionCommand);
          return;
        case actorIds.card:
          enqueue.sendTo(actorIds.card, command as CardCommand);
          return;
      }
    })
  }
});

type ConnectionCardReviewSystemStateConfig =
  Parameters<typeof connectionCardReviewSystemSetup.createStateConfig>[0];

// 这里把 process 真相编译成 XState states：
// accepts -> 当前阶段允许的 command
// advancesOn -> 观察到 event 后推进到的下一个阶段
const connectionCardReviewSystemStates = Object.fromEntries(
  Object.entries(connectionCardReviewProcess.stages).map(([stageId, stage]) => {
    if ("final" in stage && stage.final) {
      return [stageId, { type: "final" }];
    }

    const accepts = "accepts" in stage ? stage.accepts : undefined;
    const advancesOn = "advancesOn" in stage ? stage.advancesOn : undefined;
    const on = Object.fromEntries([
      ...(accepts ?? []).map((commandType: ConnectionCardReviewCommand["type"]) => {
        return [commandType, { actions: "forwardCommandToTargetActor" }];
      }),
      ...Object.entries(advancesOn ?? {}).map(([eventType, target]) => {
        return [eventType, { target }];
      })
    ]);

    // 当前阶段会启动哪些 actor，也从阶段允许的命令集合派生，而不是手写第二份规则。
    const invoke = getStageInvokes(accepts);

    return [
      stageId,
      {
        ...(invoke.length > 0 ? { invoke } : {}),
        on
      }
    ];
  })
) as Record<ConnectionCardReviewStage, ConnectionCardReviewSystemStateConfig>;

const connectionCardReviewSystemAccepts = collectAcceptedCommands();
const connectionCardReviewSystemObserves = collectObservedEvents();

const connectionCardReviewSystemLogic = connectionCardReviewSystemSetup.createMachine({
  id: "connectionCardReviewSystem",
  initial: connectionCardReviewProcess.initialStage,
  states: connectionCardReviewSystemStates
});

export const connectionCardReviewSystem = {
  id: "connectionCardReviewSystem",
  logic: connectionCardReviewSystemLogic,
  accepts: connectionCardReviewSystemAccepts,
  observes: connectionCardReviewSystemObserves
} as const satisfies SystemSpec<
  "connectionCardReviewSystem",
  typeof connectionCardReviewSystemLogic,
  ConnectionCardReviewCommand["type"],
  ConnectionCardReviewDomainEvent["type"]
>;

function collectAcceptedCommands(): readonly ConnectionCardReviewCommand["type"][] {
  return unique(
    Object.values(connectionCardReviewProcess.stages).flatMap((stage) => {
      return "accepts" in stage ? (stage.accepts ?? []) : [];
    })
  );
}

function collectObservedEvents(): readonly ConnectionCardReviewDomainEvent["type"][] {
  return unique(
    Object.values(connectionCardReviewProcess.stages).flatMap((stage) => {
      const advancesOn = "advancesOn" in stage ? stage.advancesOn : undefined;

      return Object.keys(advancesOn ?? {}) as ConnectionCardReviewDomainEvent["type"][];
    })
  );
}

function getStageInvokes(
  acceptedCommands: readonly ConnectionCardReviewCommand["type"][] | undefined
): Array<{
  id: (typeof actorIds)[keyof typeof actorIds];
  src: (typeof actorIds)[keyof typeof actorIds];
}> {
  return unique((acceptedCommands ?? []).map(getActorIdByCommandType)).map((actorId) => ({
    id: actorId,
    src: actorId
  }));
}

function getActorIdByCommandType(
  commandType: ConnectionCardReviewCommand["type"]
): (typeof actorIds)[keyof typeof actorIds] {
  // actor 路由来自 command.target；system 不额外维护一张手写路由表。
  const command = commands.find((candidate) => candidate.type === commandType);

  if (!command) {
    throw new Error(`Unknown command type: ${commandType}`);
  }

  switch (command.target) {
    case connectionMachine.objectId:
      return actorIds.connection;
    case cardMachine.objectId:
      return actorIds.card;
  }

  throw new Error("No actor mapping for command target");
}

function unique<Value>(values: readonly Value[]): Value[] {
  return [...new Set(values)];
}
