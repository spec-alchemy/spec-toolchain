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
  new URL("../../test/fixtures/connection-card-review/canonical/index.yaml", import.meta.url)
);
const VIEWER_SPEC_GOLDEN_PATH = fileURLToPath(
  new URL("./goldens/connection-card-review.viewer-spec.json", import.meta.url)
);

test("viewer projection matches the checked-in golden snapshot", async () => {
  const spec = await loadBusinessSpec({
    entryPath: SPEC_ENTRY_PATH
  });
  const analysis = analyzeBusinessSpec(spec);
  const actualViewerSpec = buildBusinessViewerSpec(spec, analysis.graph);
  const expectedViewerSpec = JSON.parse(
    await readFile(VIEWER_SPEC_GOLDEN_PATH, "utf8")
  );

  assert.deepStrictEqual(actualViewerSpec, expectedViewerSpec);
});
