import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadBusinessSpec } from "../ddd-spec-core/index.js";
import { buildBusinessSpecTypescriptSource } from "./index.js";

const SPEC_ENTRY_PATH = fileURLToPath(
  new URL("../../design-spec/canonical/index.yaml", import.meta.url)
);
const GENERATED_SPEC_PATH = fileURLToPath(
  new URL("../../design-spec/generated/business-spec.generated.ts", import.meta.url)
);

test("typescript projection matches the checked-in generated module", async () => {
  const spec = await loadBusinessSpec({
    entryPath: SPEC_ENTRY_PATH
  });
  const actualSource = buildBusinessSpecTypescriptSource(spec);
  const expectedSource = await readFile(GENERATED_SPEC_PATH, "utf8");

  assert.strictEqual(actualSource, expectedSource);
});
