import { businessSpec as generatedBusinessSpec } from "../generated/business-spec.generated.js";
import type {
  AggregateSpec,
  BusinessSpec,
  BusinessVocabularySpec,
  CommandSpec,
  EventSpec,
  ObjectSpec,
  ProcessSpec,
  ViewerDetailSemanticSpec
} from "../tools/spec.js";

export const businessSpec: BusinessSpec = generatedBusinessSpec;

export type {
  AggregateSpec,
  BusinessSpec,
  BusinessVocabularySpec,
  CommandSpec,
  EventSpec,
  ObjectSpec,
  ProcessSpec,
  ViewerDetailSemanticSpec
} from "../tools/spec.js";

export const viewerDetailVocabulary: BusinessVocabularySpec["viewerDetails"] =
  businessSpec.vocabulary.viewerDetails;
export const objects = businessSpec.domain.objects;
export const commands = businessSpec.domain.commands;
export const events = businessSpec.domain.events;
export const aggregates = businessSpec.domain.aggregates;
export const processes = businessSpec.domain.processes;

export const connectionObject = getObject("Connection");
export const cardObject = getObject("Card");

export const objectIds = {
  connection: connectionObject.id,
  card: cardObject.id
} as const;

export const connectionAggregate = getAggregateByObjectId(objectIds.connection);
export const cardAggregate = getAggregateByObjectId(objectIds.card);

export const connectionAggregateAccepts = collectAggregateAcceptedCommands(connectionAggregate);
export const connectionAggregateEmits = collectAggregateEmittedEvents(connectionAggregate);
export const cardAggregateAccepts = collectAggregateAcceptedCommands(cardAggregate);
export const cardAggregateEmits = collectAggregateEmittedEvents(cardAggregate);

export const connectionCardReviewProcess = getProcessById("connectionCardReviewProcess");

export function getObject(objectId: string): ObjectSpec {
  return mustFind(objects, (candidate) => candidate.id === objectId, `object ${objectId}`);
}

export function getCommandByType(commandType: string): CommandSpec {
  return mustFind(commands, (candidate) => candidate.type === commandType, `command ${commandType}`);
}

export function getEventByType(eventType: string): EventSpec {
  return mustFind(events, (candidate) => candidate.type === eventType, `event ${eventType}`);
}

export function getAggregateByObjectId(objectId: string): AggregateSpec {
  return mustFind(
    aggregates,
    (candidate) => candidate.objectId === objectId,
    `aggregate ${objectId}`
  );
}

export function getProcessById(processId: string): ProcessSpec {
  return mustFind(processes, (candidate) => candidate.id === processId, `process ${processId}`);
}

export function getViewerDetailSemantic(semanticKey: string): ViewerDetailSemanticSpec {
  return mustGetDetailSemantic(semanticKey);
}

export function collectAggregateAcceptedCommands(aggregate: AggregateSpec): readonly string[] {
  return unique(
    Object.values(aggregate.states).flatMap((state) => {
      return Object.keys(state.on ?? {});
    })
  );
}

export function collectAggregateEmittedEvents(aggregate: AggregateSpec): readonly string[] {
  return unique(
    Object.values(aggregate.states).flatMap((state) => {
      return Object.values(state.on ?? {}).map((transition) => transition.emit.type);
    })
  );
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

function mustGetDetailSemantic(semanticKey: string): ViewerDetailSemanticSpec {
  const semantic = viewerDetailVocabulary[semanticKey];

  if (!semantic) {
    throw new Error(`Unknown viewer detail semantic ${semanticKey}`);
  }

  return semantic;
}
