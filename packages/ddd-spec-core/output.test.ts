import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { analyzeVnextBusinessSpec } from "./index.js";
import {
  VNEXT_CROSS_CONTEXT_ANALYSIS_GOLDEN_PATH,
  VNEXT_CROSS_CONTEXT_BUNDLE_GOLDEN_PATH,
  loadVnextCrossContextFixture
} from "./test-fixtures.js";

test("vNext cross-context bundle output matches the checked-in artifact", async () => {
  const spec = await loadVnextCrossContextFixture();
  const actualBundleSource = `${JSON.stringify(spec, null, 2)}\n`;
  const expectedBundleSource = await readFile(VNEXT_CROSS_CONTEXT_BUNDLE_GOLDEN_PATH, "utf8");

  assert.strictEqual(actualBundleSource, expectedBundleSource);
});

test("vNext cross-context analysis output matches the checked-in artifact", async () => {
  const spec = await loadVnextCrossContextFixture();
  const analysis = analyzeVnextBusinessSpec(spec);
  const actualAnalysisSource = `${JSON.stringify(analysis, null, 2)}\n`;
  const expectedAnalysisSource = await readFile(
    VNEXT_CROSS_CONTEXT_ANALYSIS_GOLDEN_PATH,
    "utf8"
  );

  assert.strictEqual(actualAnalysisSource, expectedAnalysisSource);
});
