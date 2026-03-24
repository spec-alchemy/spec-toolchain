import { loadBusinessSpec as loadBusinessSpecFromCore } from "../../packages/ddd-spec-core/spec.js";
import type { BusinessSpec } from "../../packages/ddd-spec-core/spec.js";
import { loadDesignSpecConfig } from "./config.js";

export type {
  AggregateSpec,
  AggregateStateSpec,
  AggregateTransitionSpec,
  BusinessSpec,
  BusinessVocabularySpec,
  CanonicalIndexSpec,
  CommandSpec,
  EventSpec,
  FieldSpec,
  LoadBusinessSpecOptions,
  ObjectSpec,
  PayloadSpec,
  ProcessSpec,
  ProcessStageSpec,
  ProcessUsesSpec,
  ViewerDetailSemanticSpec
} from "../../packages/ddd-spec-core/spec.js";

export async function loadBusinessSpec(): Promise<BusinessSpec> {
  const config = await loadDesignSpecConfig();

  return loadBusinessSpecFromCore({ entryPath: config.spec.entryPath });
}
