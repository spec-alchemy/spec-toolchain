import { enqueueActions, setup } from "xstate";
import {
  commands,
  connectionCardReviewProcess,
  getAggregateByObjectId
} from "../../canonical/index.js";
import type { SystemSpec } from "../../types.js";
import { cardMachine } from "../machines/card.machine.js";
import { connectionMachine } from "../machines/connection.machine.js";
import type { CanonicalMessageEnvelope } from "../machines/shared.js";

const actorIds = {
  connection: "connection",
  card: "card"
} as const;

type ConnectionCardReviewSystemEvent =
  | CanonicalMessageEnvelope;

type ConnectionCardReviewStage =
  (typeof connectionCardReviewProcess.stages)[keyof typeof connectionCardReviewProcess.stages];

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
      const command = event as CanonicalMessageEnvelope;
      const actorId = getActorIdByCommandType(command.type);

      switch (actorId) {
        case actorIds.connection:
          enqueue.sendTo(actorIds.connection, command);
          return;
        case actorIds.card:
          enqueue.sendTo(actorIds.card, command);
          return;
      }
    })
  }
});

type ConnectionCardReviewSystemStateConfig =
  Parameters<typeof connectionCardReviewSystemSetup.createStateConfig>[0];

// 这里把 process 真相编译成 XState states：
// non-final stage 绑定到某个 aggregate.state
// 当前阶段允许的 command 直接从该 aggregate.state 的 outgoing transitions 派生
// advancesOn 仍然表达 process 自己的阶段推进
const connectionCardReviewSystemStates = Object.fromEntries(
  Object.entries(connectionCardReviewProcess.stages).map(([stageId, stage]) => {
    if ("final" in stage && stage.final) {
      return [stageId, { type: "final" }];
    }

    const accepts = getStageAcceptedCommands(stageId, stage);
    const advancesOn = "advancesOn" in stage ? stage.advancesOn : undefined;
    const on = Object.fromEntries([
      ...accepts.map((commandType) => {
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
) as Record<string, ConnectionCardReviewSystemStateConfig>;

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
  string,
  string
>;

function collectAcceptedCommands(): readonly string[] {
  return unique(
    Object.entries(connectionCardReviewProcess.stages).flatMap(([stageId, stage]) => {
      return getStageAcceptedCommands(stageId, stage);
    })
  );
}

function collectObservedEvents(): readonly string[] {
  return unique(
    Object.values(connectionCardReviewProcess.stages).flatMap((stage) => {
      return Object.keys(stage.advancesOn ?? {});
    })
  );
}

function getStageInvokes(
  acceptedCommands: readonly string[]
): Array<{
  id: (typeof actorIds)[keyof typeof actorIds];
  src: (typeof actorIds)[keyof typeof actorIds];
}> {
  return unique(acceptedCommands.map(getActorIdByCommandType)).map((actorId) => ({
    id: actorId,
    src: actorId
  }));
}

function getStageAcceptedCommands(
  stageId: string,
  stage: ConnectionCardReviewStage
): readonly string[] {
  const binding = getStageBinding(stageId, stage);

  if (!binding) {
    return [];
  }

  return Object.keys(binding.aggregate.states[binding.stateId].on ?? {});
}

function getStageBinding(
  stageId: string,
  stage: ConnectionCardReviewStage
):
  | {
      aggregate: ReturnType<typeof getAggregateByObjectId>;
      stateId: string;
    }
  | undefined {
  if ("final" in stage && stage.final) {
    return undefined;
  }

  const aggregateAlias = "aggregate" in stage ? stage.aggregate : undefined;
  const stateId = "state" in stage ? stage.state : undefined;

  if (!aggregateAlias || !stateId) {
    throw new Error(`Process stage ${stageId} is missing aggregate/state binding`);
  }

  const objectId = connectionCardReviewProcess.uses.aggregates[aggregateAlias];

  if (!objectId) {
    throw new Error(`Unknown aggregate alias in process stage ${stageId}: ${aggregateAlias}`);
  }

  const aggregate = getAggregateByObjectId(objectId);

  if (!aggregate.states[stateId]) {
    throw new Error(`Unknown aggregate state in process stage ${stageId}: ${objectId}.${stateId}`);
  }

  return {
    aggregate,
    stateId
  };
}

function getActorIdByCommandType(commandType: string): (typeof actorIds)[keyof typeof actorIds] {
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
