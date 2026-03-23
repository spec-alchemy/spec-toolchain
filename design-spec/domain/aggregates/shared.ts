/**
 * 从聚合行为真相中提取“这个聚合能接受哪些 command type”。
 *
 * @remarks
 * 这个函数只生成摘要视图，便于对外暴露 `accepts` 元数据；
 * 真正的主真相仍然是 `aggregate.states[*].on` 中定义的行为规则。
 */
export function collectAggregateAcceptedCommands<
  LifecycleState extends string,
  CommandType extends string
>(
  aggregate: {
    states: Record<
      LifecycleState,
      {
        on?: Partial<Record<CommandType, unknown>>;
      }
    >;
  }
): readonly CommandType[] {
  // accepts 是聚合真相的摘要视图，不是新的主真相；真正规则仍在 aggregate.states 中。
  const states = Object.values(aggregate.states) as Array<{
    on?: Partial<Record<CommandType, unknown>>;
  }>;

  return unique(
    states.flatMap((state) => {
      return Object.keys(state.on ?? {}) as CommandType[];
    })
  );
}

/**
 * 从聚合行为真相中提取“这个聚合可能发出哪些 domain event type”。
 *
 * @remarks
 * 这个函数同样只生成摘要视图，便于对外暴露 `emits` 元数据；
 * 真正的主真相仍然是每条 transition 上定义的 `emit` 规则。
 */
export function collectAggregateEmittedEvents<
  LifecycleState extends string,
  CommandType extends string,
  EventType extends string
>(
  aggregate: {
    states: Record<
      LifecycleState,
      {
        on?: Partial<Record<CommandType, { emit: { type: EventType } }>>;
      }
    >;
  }
): readonly EventType[] {
  // emits 同样从聚合真相派生，避免再维护第二份命令/事件摘要。
  const states = Object.values(aggregate.states) as Array<{
    on?: Partial<Record<CommandType, { emit: { type: EventType } }>>;
  }>;

  return unique(
    states.flatMap((state) => {
      const transitions = Object.values(state.on ?? {}) as Array<{
        emit: {
          type: EventType;
        };
      }>;

      return transitions.map((transition) => transition.emit.type);
    })
  );
}

function unique<Value>(values: readonly Value[]): readonly Value[] {
  return [...new Set(values)];
}
