import { fileURLToPath } from "node:url";
import { loadBusinessSpec as loadBusinessSpecFromCore } from "../../packages/ddd-spec-core/spec.js";
import type { BusinessSpec } from "../../packages/ddd-spec-core/spec.js";

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

const canonicalIndexPath = fileURLToPath(new URL("../canonical/index.yaml", import.meta.url));

export async function loadBusinessSpec(): Promise<BusinessSpec> {
  return loadBusinessSpecFromCore({ entryPath: canonicalIndexPath });
}
