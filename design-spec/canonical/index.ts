import { businessSpec as generatedBusinessSpec } from "../generated/business-spec.generated.js";
import { createBusinessSpecAccessors } from "../../packages/ddd-spec-core/compiled-spec.js";
import type {
  AggregateSpec,
  BusinessSpec,
  BusinessVocabularySpec,
  CommandSpec,
  EventSpec,
  ObjectSpec,
  ProcessSpec,
  ViewerDetailSemanticSpec
} from "../../packages/ddd-spec-core/spec.js";

export const businessSpec: BusinessSpec = generatedBusinessSpec;
const accessors = createBusinessSpecAccessors(businessSpec);

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

export const viewerDetailVocabulary: BusinessVocabularySpec["viewerDetails"] =
  accessors.viewerDetailVocabulary;
export const objects: readonly ObjectSpec[] = accessors.objects;
export const commands: readonly CommandSpec[] = accessors.commands;
export const events: readonly EventSpec[] = accessors.events;
export const aggregates: readonly AggregateSpec[] = accessors.aggregates;
export const processes: readonly ProcessSpec[] = accessors.processes;
export const getObject = accessors.getObject;
export const getCommandByType = accessors.getCommandByType;
export const getEventByType = accessors.getEventByType;
export const getAggregateByObjectId = accessors.getAggregateByObjectId;
export const getProcessById = accessors.getProcessById;
export const getViewerDetailSemantic = accessors.getViewerDetailSemantic;
export const collectAggregateAcceptedCommands = accessors.collectAggregateAcceptedCommands;
export const collectAggregateEmittedEvents = accessors.collectAggregateEmittedEvents;
