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
  const sharedTypesGroup = mustFind(
    domainStructureView.nodes,
    (node) => node.kind === "type-group" && node.label === "Shared Types"
  );
  const cardContentNode = mustFind(
    domainStructureView.nodes,
    (node) =>
      node.kind === "value-object" && getDetailValue(node.details, "object.id") === "CardContent"
  );
  const cardNode = mustFind(
    domainStructureView.nodes,
    (node) => node.kind === "entity" && getDetailValue(node.details, "object.id") === "Card"
  );
  const cardWordingNode = mustFind(
    domainStructureView.nodes,
    (node) =>
      node.kind === "value-object" && getDetailValue(node.details, "object.id") === "CardWording"
  );
  const sourceConnectionEdge = mustFind(
    domainStructureView.edges,
    (edge) =>
      edge.kind === "reference" &&
      getDetailValue(edge.details, "relation.from") === "Card" &&
      getDetailValue(edge.details, "relation.field") === "connectionId" &&
      getDetailValue(edge.details, "relation.to") === "Connection"
  );
  const cardContentEdge = mustFind(
    domainStructureView.edges,
    (edge) =>
      edge.kind === "composition" &&
      getDetailValue(edge.details, "relation.from") === "Card" &&
      getDetailValue(edge.details, "relation.field") === "content" &&
      getDetailValue(edge.details, "relation.to") === "CardContent"
  );
  const cardStatusEdge = mustFind(
    domainStructureView.edges,
    (edge) =>
      edge.kind === "association" &&
      getDetailValue(edge.details, "relation.from") === "Card" &&
      getDetailValue(edge.details, "relation.to") === "CardStatus"
  );

  assert.equal(connectionNode.parentId, "domain-structure:aggregate:Connection");
  assert.equal(connectionNode.label, "Connection");
  assert.equal(getDetailValue(connectionNode.details, "object.role"), "entity");
  assert.equal(connectionNode.summary, "5 field(s), 1 relation(s)");
  assert.equal(sharedTypesGroup.summary, "2 enum(s), 2 consumer(s)");
  assert.equal(connectionStatusNode.parentId, "domain-structure:group:shared-types");
  assert.equal(connectionStatusNode.subtitle, "lifecycle type for Connection");
  assert.equal(connectionStatusNode.summary, "3 value(s), 1 consumer(s)");
  assert.equal(getDetailValue(connectionStatusNode.details, "object.role"), "enum");
  assert.equal(getDetailValue(sharedTypesGroup.details, "domain.shared_types"), "ConnectionStatus, CardStatus");
  assert.equal(cardNode.summary, "4 field(s), 3 relation(s)");
  assert.equal(cardContentNode.parentId, "domain-structure:aggregate:Card");
  assert.equal(getDetailValue(cardContentNode.details, "object.role"), "value-object");
  assert.equal(cardContentNode.summary, "2 field(s), 1 relation(s)");
  assert.equal(cardWordingNode.parentId, "domain-structure:aggregate:Card");
  assert.equal(getDetailValue(cardWordingNode.details, "object.role"), "value-object");
  assert.equal(cardWordingNode.summary, "2 field(s), 0 relation(s)");
  assert.equal(
    mustFind(
      domainStructureView.nodes,
      (node) => node.kind === "aggregate-group" && getDetailValue(node.details, "aggregate.id") === "Card"
    ).summary,
    "root + 2 owned object(s), 1 shared type(s), 1 external reference(s)"
  );
  assert.equal(sourceConnectionEdge.label, "connection id");
  assert.equal(getDetailValue(sourceConnectionEdge.details, "relation.kind"), "reference");
  assert.equal(sourceConnectionEdge.cardinality, "1");
  assert.equal(getDetailValue(sourceConnectionEdge.details, "relation.cardinality"), "1");
  assert.equal(cardContentEdge.label, "content");
  assert.equal(getDetailValue(cardContentEdge.details, "relation.kind"), "composition");
  assert.equal(cardContentEdge.cardinality, "1");
  assert.equal(cardStatusEdge.label, "status");
  assert.equal(getDetailValue(cardStatusEdge.details, "relation.kind"), "association");
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
