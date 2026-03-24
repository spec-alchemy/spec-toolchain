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
