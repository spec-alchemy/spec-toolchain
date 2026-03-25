import { fileURLToPath } from "node:url";
import { loadBusinessSpec, type BusinessSpec } from "./index.js";

export const CONNECTION_CARD_REVIEW_FIXTURE_ENTRY_PATH = fileURLToPath(
  new URL("../../test/fixtures/connection-card-review/canonical/index.yaml", import.meta.url)
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

export async function loadConnectionCardReviewFixture(): Promise<BusinessSpec> {
  return loadBusinessSpec({
    entryPath: CONNECTION_CARD_REVIEW_FIXTURE_ENTRY_PATH
  });
}

export function cloneBusinessSpec(spec: BusinessSpec): BusinessSpec {
  return structuredClone(spec);
}
