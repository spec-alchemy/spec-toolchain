import { sendParent } from "xstate";

type RuntimeTransition = {
  target: string;
  emit: {
    type: string;
    payload: (command: Record<string, unknown>) => Record<string, unknown>;
  };
};

type RuntimeState = {
  on?: Record<string, RuntimeTransition>;
};

export function projectAggregateMachineStates<
  LifecycleState extends string,
  Command extends { type: string },
  DomainEvent extends { type: string }
>(
  aggregate: {
    states: Record<
      LifecycleState,
      {
        on?: Partial<
          Record<
            Command["type"],
            {
              target: LifecycleState;
              emit: {
                type: DomainEvent["type"];
                // 这里故意擦除 payload 参数的精确类型，只把它当作投影层的运行时回调消费。
                // command/event 的精确对应关系已经在 domain/aggregates 中定义，不再在这里重复编码。
                payload: (command: any) => Record<string, unknown>;
              };
            }
          >
        >;
      }
    >;
  }
): Record<LifecycleState, object> {
  return Object.fromEntries(
    Object.entries(aggregate.states).map(([stateId, state]) => {
      const runtimeState = state as RuntimeState;
      // 把 domain 中的 command -> target -> emit 规则翻译成 XState 可执行的 on 配置。
      const on = runtimeState.on
        ? Object.fromEntries(
            Object.entries(runtimeState.on).map(([commandType, transition]) => {
              return [
                commandType,
                {
                  target: transition.target,
                  actions: sendParent(({ event }) => ({
                    type: transition.emit.type,
                    ...transition.emit.payload(event)
                  }))
                }
              ];
            })
          )
        : undefined;

      return [stateId, on ? { on } : {}];
    })
  ) as Record<LifecycleState, object>;
}
