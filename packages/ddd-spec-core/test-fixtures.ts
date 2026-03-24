import { fileURLToPath } from "node:url";
import { loadBusinessSpec, type BusinessSpec } from "./index.js";

export const CANONICAL_SPEC_ENTRY_PATH = fileURLToPath(
  new URL("../../ddd-spec/canonical/index.yaml", import.meta.url)
);

export const CORE_SCHEMA_PATH = fileURLToPath(
  new URL("./schema/business-spec.schema.json", import.meta.url)
);

export const BUNDLE_GOLDEN_PATH = fileURLToPath(
  new URL("./goldens/connection-card-review.business-spec.json", import.meta.url)
);

export const ANALYSIS_GOLDEN_PATH = fileURLToPath(
  new URL("./goldens/connection-card-review.business-spec.analysis.json", import.meta.url)
);

export async function loadCanonicalFixture(): Promise<BusinessSpec> {
  return loadBusinessSpec({
    entryPath: CANONICAL_SPEC_ENTRY_PATH
  });
}

export function cloneBusinessSpec(spec: BusinessSpec): BusinessSpec {
  return structuredClone(spec);
}
