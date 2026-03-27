import { fileURLToPath } from "node:url";
import {
  loadVnextBusinessSpec,
  type VnextBusinessSpec
} from "./index.js";

export const DOMAIN_MODEL_SCHEMA_PATH = fileURLToPath(
  new URL("./schema/domain-model/index.schema.json", import.meta.url)
);

export const VNEXT_MINIMAL_FIXTURE_ENTRY_PATH = fileURLToPath(
  new URL("../../examples/minimal/domain-model/index.yaml", import.meta.url)
);

export const VNEXT_CROSS_CONTEXT_FIXTURE_ENTRY_PATH = fileURLToPath(
  new URL("../../examples/cross-context/domain-model/index.yaml", import.meta.url)
);

export const VNEXT_CROSS_CONTEXT_BUNDLE_GOLDEN_PATH = fileURLToPath(
  new URL("../../examples/cross-context/artifacts/business-spec.json", import.meta.url)
);

export const VNEXT_CROSS_CONTEXT_ANALYSIS_GOLDEN_PATH = fileURLToPath(
  new URL("../../examples/cross-context/artifacts/business-spec.analysis.json", import.meta.url)
);

export const VNEXT_CROSS_CONTEXT_VIEWER_GOLDEN_PATH = fileURLToPath(
  new URL("../../examples/cross-context/artifacts/business-viewer/viewer-spec.json", import.meta.url)
);

export async function loadVnextMinimalFixture(): Promise<VnextBusinessSpec> {
  return loadVnextBusinessSpec({
    entryPath: VNEXT_MINIMAL_FIXTURE_ENTRY_PATH
  });
}

export async function loadVnextCrossContextFixture(): Promise<VnextBusinessSpec> {
  return loadVnextBusinessSpec({
    entryPath: VNEXT_CROSS_CONTEXT_FIXTURE_ENTRY_PATH
  });
}

export function cloneVnextBusinessSpec(spec: VnextBusinessSpec): VnextBusinessSpec {
  return structuredClone(spec);
}
