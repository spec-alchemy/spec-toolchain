import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { analyzeBusinessSpec } from "./index.js";
import {
  CROSS_CONTEXT_ANALYSIS_GOLDEN_PATH,
  CROSS_CONTEXT_BUNDLE_GOLDEN_PATH,
  loadCrossContextFixture
} from "./test-fixtures.js";

test("cross-context example bundle output matches the checked-in artifact", async () => {
  const spec = await loadCrossContextFixture();
  const actualBundleSource = `${JSON.stringify(spec, null, 2)}\n`;
  const expectedBundleSource = await readFile(CROSS_CONTEXT_BUNDLE_GOLDEN_PATH, "utf8");

  assert.strictEqual(actualBundleSource, expectedBundleSource);
});

test("cross-context example analysis output matches the checked-in artifact", async () => {
  const spec = await loadCrossContextFixture();
  const analysis = analyzeBusinessSpec(spec);
  const actualAnalysisSource = `${JSON.stringify(analysis, null, 2)}\n`;
  const expectedAnalysisSource = await readFile(
    CROSS_CONTEXT_ANALYSIS_GOLDEN_PATH,
    "utf8"
  );

  assert.strictEqual(actualAnalysisSource, expectedAnalysisSource);
});
