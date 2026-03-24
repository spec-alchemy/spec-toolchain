import { businessSpec as generatedBusinessSpec } from "../../design-spec/generated/business-spec.generated.js";
import { createBusinessSpecAccessors } from "../../packages/ddd-spec-core/compiled-spec.js";
import type { BusinessSpec } from "../../packages/ddd-spec-core/spec.js";

export const businessSpec: BusinessSpec = generatedBusinessSpec;
const accessors = createBusinessSpecAccessors(businessSpec);

export {
  accessors as businessSpecAccessors
};

export type {
  AggregateSpec,
  BusinessSpec,
  BusinessVocabularySpec,
  CommandSpec,
  EventSpec,
  ObjectSpec,
  ProcessSpec,
  ViewerDetailSemanticSpec
} from "../../packages/ddd-spec-core/spec.js";

export const viewerDetailVocabulary = accessors.viewerDetailVocabulary;
export const objects = accessors.objects;
export const commands = accessors.commands;
export const events = accessors.events;
export const aggregates = accessors.aggregates;
export const processes = accessors.processes;
export const getObject = accessors.getObject;
export const getCommandByType = accessors.getCommandByType;
export const getEventByType = accessors.getEventByType;
export const getAggregateByObjectId = accessors.getAggregateByObjectId;
export const getProcessById = accessors.getProcessById;
export const getViewerDetailSemantic = accessors.getViewerDetailSemantic;
export const collectAggregateAcceptedCommands = accessors.collectAggregateAcceptedCommands;
export const collectAggregateEmittedEvents = accessors.collectAggregateEmittedEvents;

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
