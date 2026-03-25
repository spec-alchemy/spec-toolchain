import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  analyzeBusinessSpec
} from "./index.js";
import {
  ANALYSIS_GOLDEN_PATH,
  BUNDLE_GOLDEN_PATH,
  loadConnectionCardReviewFixture
} from "./test-fixtures.js";

test("bundle output matches the checked-in golden snapshot", async () => {
  const spec = await loadConnectionCardReviewFixture();
  const actualBundleSource = `${JSON.stringify(spec, null, 2)}\n`;
  const expectedBundleSource = await readFile(BUNDLE_GOLDEN_PATH, "utf8");

  assert.strictEqual(actualBundleSource, expectedBundleSource);
});

test("analysis output matches the checked-in golden snapshot", async () => {
  const spec = await loadConnectionCardReviewFixture();
  const analysis = analyzeBusinessSpec(spec);
  const actualAnalysisSource = `${JSON.stringify(analysis, null, 2)}\n`;
  const expectedAnalysisSource = await readFile(ANALYSIS_GOLDEN_PATH, "utf8");

  assert.strictEqual(actualAnalysisSource, expectedAnalysisSource);
});
