export interface FieldSpec {
  id: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface DomainObjectSpec<
  ObjectId extends string = string,
  LifecycleState extends string = string
> {
  id: ObjectId;
  title: string;
  lifecycleField: string;
  lifecycle: readonly LifecycleState[];
  fields: readonly FieldSpec[];
}

export interface CommandSpec<
  CommandType extends string = string,
  Target extends string = string
> {
  type: CommandType;
  target: Target;
  description: string;
}

export interface DomainEventSpec<
  EventType extends string = string,
  Source extends string = string
> {
  type: EventType;
  source: Source;
  description: string;
}

// 流程阶段规则只表达业务语义，不包含任何 XState 运行时细节。
export interface ProcessStageSpec<
  StageId extends string = string,
  CommandType extends string = string,
  EventType extends string = string,
  Outcome extends string = string
> {
  title: string;
  accepts?: readonly CommandType[];
  advancesOn?: Partial<Record<EventType, StageId>>;
  final?: boolean;
  outcome?: Outcome;
}

export interface ProcessSpec<
  ProcessId extends string = string,
  StageId extends string = string,
  CommandType extends string = string,
  EventType extends string = string,
  Outcome extends string = string
> {
  id: ProcessId;
  title: string;
  initialStage: StageId;
  stages: Record<StageId, ProcessStageSpec<StageId, CommandType, EventType, Outcome>>;
}

type TypedMessage = {
  type: string;
};

// 根据 emit.type 反推出该事件真正允许的 payload 形状，避免 payload 和事件类型脱节。
type AggregateEmitSpec<
  Command,
  DomainEvent extends TypedMessage
> = {
  [EventType in DomainEvent["type"]]: {
    type: EventType;
    payload: (command: Command) => Omit<Extract<DomainEvent, { type: EventType }>, "type">;
  }
}[DomainEvent["type"]];

export interface AggregateTransitionSpec<
  LifecycleState extends string = string,
  Command = unknown,
  DomainEvent extends TypedMessage = TypedMessage
> {
  target: LifecycleState;
  emit: AggregateEmitSpec<Command, DomainEvent>;
}

export interface AggregateStateSpec<
  LifecycleState extends string = string,
  Command extends TypedMessage = TypedMessage,
  DomainEvent extends TypedMessage = TypedMessage
> {
  on?: Partial<{
    [CommandType in Command["type"]]: AggregateTransitionSpec<
      LifecycleState,
      Extract<Command, { type: CommandType }>,
      DomainEvent
    >;
  }>;
}

export interface AggregateBehaviorSpec<
  ObjectId extends string = string,
  LifecycleState extends string = string,
  Command extends TypedMessage = TypedMessage,
  DomainEvent extends TypedMessage = TypedMessage
> {
  objectId: ObjectId;
  initial: LifecycleState;
  // 聚合内部第一真相：某个生命周期状态下，收到哪些命令，会进入哪里并发出什么事件。
  states: Record<LifecycleState, AggregateStateSpec<LifecycleState, Command, DomainEvent>>;
}

export interface AggregateMachineSpec<
  ObjectId extends string = string,
  Logic = unknown,
  CommandType extends string = string,
  EventType extends string = string
> {
  objectId: ObjectId;
  logic: Logic;
  accepts: readonly CommandType[];
  emits: readonly EventType[];
}

export interface SystemSpec<
  SystemId extends string = string,
  Logic = unknown,
  CommandType extends string = string,
  EventType extends string = string
> {
  id: SystemId;
  logic: Logic;
  accepts: readonly CommandType[];
  observes: readonly EventType[];
}

export interface DesignSpec<
  SpecObject extends DomainObjectSpec = DomainObjectSpec,
  SpecCommand extends CommandSpec = CommandSpec,
  SpecEvent extends DomainEventSpec = DomainEventSpec,
  // 顶层设计资产容器需要同时装下多个聚合，所以这里保持宽容，不再强求统一函数签名。
  SpecAggregate extends AggregateBehaviorSpec<any, any, any, any> = AggregateBehaviorSpec<
    any,
    any,
    any,
    any
  >,
  SpecProcess extends ProcessSpec = ProcessSpec,
  SpecMachine extends AggregateMachineSpec = AggregateMachineSpec,
  SpecSystem extends SystemSpec = SystemSpec
> {
  title: string;
  summary: string;
  domain: {
    objects: readonly SpecObject[];
    commands: readonly SpecCommand[];
    events: readonly SpecEvent[];
    aggregates: readonly SpecAggregate[];
    processes: readonly SpecProcess[];
  };
  state: {
    machines: readonly SpecMachine[];
    system: SpecSystem;
  };
}
