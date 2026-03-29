import { fileURLToPath } from "node:url";
import {
  loadBusinessSpec,
  type BusinessSpec
} from "./index.js";

export const DOMAIN_MODEL_SCHEMA_PATH = fileURLToPath(
  new URL("./schema/domain-model/index.schema.json", import.meta.url)
);

export const TEST_FIXTURES_ROOT_PATH = fileURLToPath(
  new URL("./test-fixtures/", import.meta.url)
);

export const MINIMAL_FIXTURE_ENTRY_PATH = fileURLToPath(
  new URL("./test-fixtures/minimal/domain-model/index.yaml", import.meta.url)
);

export const CROSS_CONTEXT_FIXTURE_ENTRY_PATH = fileURLToPath(
  new URL("./test-fixtures/cross-context/domain-model/index.yaml", import.meta.url)
);

export const CROSS_CONTEXT_BUNDLE_GOLDEN_PATH = fileURLToPath(
  new URL("./test-fixtures/cross-context/artifacts/business-spec.json", import.meta.url)
);

export const CROSS_CONTEXT_ANALYSIS_GOLDEN_PATH = fileURLToPath(
  new URL(
    "./test-fixtures/cross-context/artifacts/business-spec.analysis.json",
    import.meta.url
  )
);

export const CROSS_CONTEXT_VIEWER_GOLDEN_PATH = fileURLToPath(
  new URL(
    "./test-fixtures/cross-context/artifacts/business-viewer/viewer-spec.json",
    import.meta.url
  )
);

export const CROSS_CONTEXT_VIEWER_EN_GOLDEN_PATH = fileURLToPath(
  new URL(
    "./test-fixtures/cross-context/artifacts/business-viewer/viewer-spec.en.json",
    import.meta.url
  )
);

export const CROSS_CONTEXT_VIEWER_ZH_CN_GOLDEN_PATH = fileURLToPath(
  new URL(
    "./test-fixtures/cross-context/artifacts/business-viewer/viewer-spec.zh-CN.json",
    import.meta.url
  )
);

export async function loadMinimalFixture(): Promise<BusinessSpec> {
  return loadBusinessSpec({
    entryPath: MINIMAL_FIXTURE_ENTRY_PATH
  });
}

export async function loadCrossContextFixture(): Promise<BusinessSpec> {
  return loadBusinessSpec({
    entryPath: CROSS_CONTEXT_FIXTURE_ENTRY_PATH
  });
}

export function cloneBusinessSpec(spec: BusinessSpec): BusinessSpec {
  return structuredClone(spec);
}
