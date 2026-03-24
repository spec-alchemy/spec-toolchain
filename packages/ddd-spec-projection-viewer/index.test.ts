import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  analyzeBusinessSpec,
  loadBusinessSpec
} from "../ddd-spec-core/index.js";
import { buildBusinessViewerSpec } from "./index.js";

const SPEC_ENTRY_PATH = fileURLToPath(
  new URL("../../design-spec/canonical/index.yaml", import.meta.url)
);
const VIEWER_SPEC_PATH = fileURLToPath(
  new URL("../../design-spec/artifacts/business-viewer/viewer-spec.json", import.meta.url)
);

test("viewer projection matches the checked-in viewer artifact", async () => {
  const spec = await loadBusinessSpec({
    entryPath: SPEC_ENTRY_PATH
  });
  const analysis = analyzeBusinessSpec(spec);
  const actualViewerSpec = buildBusinessViewerSpec(spec, analysis.graph);
  const expectedViewerSpec = JSON.parse(await readFile(VIEWER_SPEC_PATH, "utf8"));

  assert.deepStrictEqual(actualViewerSpec, expectedViewerSpec);
});
