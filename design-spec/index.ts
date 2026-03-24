export {
  aggregates,
  businessSpec,
  collectAggregateAcceptedCommands,
  collectAggregateEmittedEvents,
  commands,
  events,
  getAggregateByObjectId,
  getCommandByType,
  getEventByType,
  getObject,
  getProcessById,
  getViewerDetailSemantic,
  objects,
  processes,
  viewerDetailVocabulary
} from "../ddd-spec/canonical/index.js";

export type {
  AggregateSpec,
  BusinessSpec,
  BusinessVocabularySpec,
  CommandSpec,
  EventSpec,
  ObjectSpec,
  ProcessSpec,
  ViewerDetailSemanticSpec
} from "../ddd-spec/canonical/index.js";
