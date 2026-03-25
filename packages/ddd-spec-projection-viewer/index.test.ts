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

test("domain structure groups aggregate-owned nodes and humanizes structure labels", async () => {
  const spec = await loadBusinessSpec({
    entryPath: SPEC_ENTRY_PATH
  });
  const analysis = analyzeBusinessSpec(spec);
  const viewerSpec = buildBusinessViewerSpec(spec, analysis.graph);
  const domainStructureView = mustFind(viewerSpec.views, (view) => view.id === "domain-structure");
  const connectionNode = mustFind(
    domainStructureView.nodes,
    (node) => node.kind === "entity" && getDetailValue(node.details, "object.id") === "Connection"
  );
  const connectionStatusNode = mustFind(
    domainStructureView.nodes,
    (node) => node.kind === "enum" && getDetailValue(node.details, "object.id") === "ConnectionStatus"
  );
  const sourceConnectionEdge = mustFind(
    domainStructureView.edges,
    (edge) =>
      edge.kind === "reference" &&
      getDetailValue(edge.details, "relation.from") === "Card" &&
      getDetailValue(edge.details, "relation.to") === "Connection"
  );
  const cardStatusEdge = mustFind(
    domainStructureView.edges,
    (edge) =>
      edge.kind === "association" &&
      getDetailValue(edge.details, "relation.from") === "Card" &&
      getDetailValue(edge.details, "relation.to") === "CardStatus"
  );

  assert.equal(connectionNode.parentId, "domain-structure:aggregate:Connection");
  assert.equal(connectionStatusNode.parentId, "domain-structure:aggregate:Connection");
  assert.equal(sourceConnectionEdge.label, "source connection");
  assert.equal(sourceConnectionEdge.cardinality, "1");
  assert.equal(cardStatusEdge.label, "status");
});

function mustFind<Value>(
  values: readonly Value[],
  predicate: (value: Value) => boolean
): Value {
  const value = values.find(predicate);

  if (!value) {
    throw new Error("Expected value to exist");
  }

  return value;
}

function getDetailValue(
  details: readonly {
    semanticKey: string;
    value: string;
  }[],
  semanticKey: string
): string {
  const detail = details.find((candidate) => candidate.semanticKey === semanticKey);

  if (!detail) {
    throw new Error(`Expected detail ${semanticKey}`);
  }

  return detail.value;
}
