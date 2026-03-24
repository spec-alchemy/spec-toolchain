import type {
  AggregateSpec,
  BusinessSpec,
  BusinessVocabularySpec,
  CommandSpec,
  EventSpec,
  ObjectSpec,
  ProcessSpec,
  ViewerDetailSemanticSpec
} from "./spec.js";

export interface BusinessSpecAccessors {
  readonly viewerDetailVocabulary: BusinessVocabularySpec["viewerDetails"];
  readonly objects: readonly ObjectSpec[];
  readonly commands: readonly CommandSpec[];
  readonly events: readonly EventSpec[];
  readonly aggregates: readonly AggregateSpec[];
  readonly processes: readonly ProcessSpec[];
  getObject: (objectId: string) => ObjectSpec;
  getCommandByType: (commandType: string) => CommandSpec;
  getEventByType: (eventType: string) => EventSpec;
  getAggregateByObjectId: (objectId: string) => AggregateSpec;
  getProcessById: (processId: string) => ProcessSpec;
  getViewerDetailSemantic: (semanticKey: string) => ViewerDetailSemanticSpec;
  collectAggregateAcceptedCommands: (aggregate: AggregateSpec) => readonly string[];
  collectAggregateEmittedEvents: (aggregate: AggregateSpec) => readonly string[];
}

export function createBusinessSpecAccessors(spec: BusinessSpec): BusinessSpecAccessors {
  const viewerDetailVocabulary = spec.vocabulary.viewerDetails;
  const objects = spec.domain.objects;
  const commands = spec.domain.commands;
  const events = spec.domain.events;
  const aggregates = spec.domain.aggregates;
  const processes = spec.domain.processes;

  return {
    viewerDetailVocabulary,
    objects,
    commands,
    events,
    aggregates,
    processes,
    getObject(objectId: string): ObjectSpec {
      return mustFind(objects, (candidate) => candidate.id === objectId, `object ${objectId}`);
    },
    getCommandByType(commandType: string): CommandSpec {
      return mustFind(
        commands,
        (candidate) => candidate.type === commandType,
        `command ${commandType}`
      );
    },
    getEventByType(eventType: string): EventSpec {
      return mustFind(events, (candidate) => candidate.type === eventType, `event ${eventType}`);
    },
    getAggregateByObjectId(objectId: string): AggregateSpec {
      return mustFind(
        aggregates,
        (candidate) => candidate.objectId === objectId,
        `aggregate ${objectId}`
      );
    },
    getProcessById(processId: string): ProcessSpec {
      return mustFind(processes, (candidate) => candidate.id === processId, `process ${processId}`);
    },
    getViewerDetailSemantic(semanticKey: string): ViewerDetailSemanticSpec {
      const semantic = viewerDetailVocabulary[semanticKey];

      if (!semantic) {
        throw new Error(`Unknown viewer detail semantic ${semanticKey}`);
      }

      return semantic;
    },
    collectAggregateAcceptedCommands(aggregate: AggregateSpec): readonly string[] {
      return unique(
        Object.values(aggregate.states).flatMap((state) => Object.keys(state.on ?? {}))
      );
    },
    collectAggregateEmittedEvents(aggregate: AggregateSpec): readonly string[] {
      return unique(
        Object.values(aggregate.states).flatMap((state) =>
          Object.values(state.on ?? {}).map((transition) => transition.emit.type)
        )
      );
    }
  };
}

function mustFind<Value>(
  values: readonly Value[],
  predicate: (value: Value) => boolean,
  label: string
): Value {
  const value = values.find(predicate);

  if (!value) {
    throw new Error(`Unknown ${label}`);
  }

  return value;
}

function unique<Value>(values: readonly Value[]): readonly Value[] {
  return [...new Set(values)];
}
