import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  analyzeBusinessSpec,
  loadBusinessSpec
} from "../ddd-spec-core/index.js";
import type {
  ViewerDetailItem,
  ViewerDetailValue,
  ViewerFieldDetailValue
} from "../ddd-spec-viewer-contract/index.js";
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
    (node) => node.kind === "entity" && getTextDetailValue(node.details, "object.id") === "Connection"
  );
  const connectionStatusNode = mustFind(
    domainStructureView.nodes,
    (node) =>
      node.kind === "enum" &&
      getTextDetailValue(node.details, "object.id") === "ConnectionStatus"
  );
  const sharedTypesGroup = mustFind(
    domainStructureView.nodes,
    (node) => node.kind === "type-group" && node.label === "Shared Types"
  );
  const cardContentNode = mustFind(
    domainStructureView.nodes,
    (node) =>
      node.kind === "value-object" &&
      getTextDetailValue(node.details, "object.id") === "CardContent"
  );
  const cardNode = mustFind(
    domainStructureView.nodes,
    (node) => node.kind === "entity" && getTextDetailValue(node.details, "object.id") === "Card"
  );
  const cardWordingNode = mustFind(
    domainStructureView.nodes,
    (node) =>
      node.kind === "value-object" &&
      getTextDetailValue(node.details, "object.id") === "CardWording"
  );
  const sourceConnectionEdge = mustFind(
    domainStructureView.edges,
    (edge) =>
      edge.kind === "reference" &&
      getTextDetailValue(edge.details, "relation.from") === "Card" &&
      getTextDetailValue(edge.details, "relation.field") === "connectionId" &&
      getTextDetailValue(edge.details, "relation.to") === "Connection"
  );
  const cardContentEdge = mustFind(
    domainStructureView.edges,
    (edge) =>
      edge.kind === "composition" &&
      getTextDetailValue(edge.details, "relation.from") === "Card" &&
      getTextDetailValue(edge.details, "relation.field") === "content" &&
      getTextDetailValue(edge.details, "relation.to") === "CardContent"
  );
  const cardStatusEdge = mustFind(
    domainStructureView.edges,
    (edge) =>
      edge.kind === "association" &&
      getTextDetailValue(edge.details, "relation.from") === "Card" &&
      getTextDetailValue(edge.details, "relation.to") === "CardStatus"
  );
  const cardFields = getListDetailItems(cardNode.details, "object.fields");
  const connectionIdField = getFieldDetail(cardFields, "connectionId");
  const statusField = getFieldDetail(cardFields, "status");

  assert.equal(connectionNode.parentId, "domain-structure:aggregate:Connection");
  assert.equal(connectionNode.label, "Connection");
  assert.equal(getTextDetailValue(connectionNode.details, "object.role"), "entity");
  assert.equal(connectionNode.summary, "5 field(s), 1 relation(s)");
  assert.equal(sharedTypesGroup.summary, "2 enum(s), 2 consumer(s)");
  assert.equal(connectionStatusNode.parentId, "domain-structure:group:shared-types");
  assert.equal(connectionStatusNode.subtitle, "lifecycle type for Connection");
  assert.equal(connectionStatusNode.summary, "3 value(s), 1 consumer(s)");
  assert.equal(getTextDetailValue(connectionStatusNode.details, "object.role"), "enum");
  assert.equal(
    getTextDetailValue(sharedTypesGroup.details, "domain.shared_types"),
    "ConnectionStatus, CardStatus"
  );
  assert.equal(cardNode.summary, "4 field(s), 3 relation(s)");
  assert.equal(cardContentNode.parentId, "domain-structure:aggregate:Card");
  assert.equal(getTextDetailValue(cardContentNode.details, "object.role"), "value-object");
  assert.equal(cardContentNode.summary, "2 field(s), 1 relation(s)");
  assert.equal(cardWordingNode.parentId, "domain-structure:aggregate:Card");
  assert.equal(getTextDetailValue(cardWordingNode.details, "object.role"), "value-object");
  assert.equal(cardWordingNode.summary, "2 field(s), 0 relation(s)");
  assert.equal(connectionIdField.fieldType, "uuid");
  assert.equal(connectionIdField.required, true);
  assert.equal(connectionIdField.relation?.kind, "reference");
  assert.equal(connectionIdField.relation?.target, "Connection");
  assert.equal(statusField.fieldType, "CardStatus");
  assert.equal(statusField.required, true);
  assert.equal(statusField.relation?.kind, "enum");
  assert.equal(statusField.relation?.target, "CardStatus");
  assert.equal(
    mustFind(
      domainStructureView.nodes,
      (node) =>
        node.kind === "aggregate-group" &&
        getTextDetailValue(node.details, "aggregate.id") === "Card"
    ).summary,
    "root + 2 owned object(s), 1 shared type(s), 1 external reference(s)"
  );
  assert.equal(sourceConnectionEdge.label, "connection id");
  assert.equal(getTextDetailValue(sourceConnectionEdge.details, "relation.kind"), "reference");
  assert.equal(sourceConnectionEdge.cardinality, "1");
  assert.equal(getTextDetailValue(sourceConnectionEdge.details, "relation.cardinality"), "1");
  assert.equal(cardContentEdge.label, "content");
  assert.equal(getTextDetailValue(cardContentEdge.details, "relation.kind"), "composition");
  assert.equal(cardContentEdge.cardinality, "1");
  assert.equal(cardStatusEdge.label, "status");
  assert.equal(getTextDetailValue(cardStatusEdge.details, "relation.kind"), "association");
});

test("composition and lifecycle project structured collection details", async () => {
  const spec = await loadBusinessSpec({
    entryPath: SPEC_ENTRY_PATH
  });
  const analysis = analyzeBusinessSpec(spec);
  const viewerSpec = buildBusinessViewerSpec(spec, analysis.graph);
  const compositionView = mustFind(viewerSpec.views, (view) => view.id === "composition");
  const lifecycleView = mustFind(viewerSpec.views, (view) => view.id === "lifecycle");
  const compositionProcessNode = mustFind(
    compositionView.nodes,
    (node) =>
      node.kind === "process-group" &&
      getTextDetailValue(node.details, "process.id") === "connectionCardReviewProcess"
  );
  const compositionStageNode = mustFind(
    compositionView.nodes,
    (node) =>
      node.kind === "stage" &&
      getTextDetailValue(node.details, "stage.id") === "awaitingConnectionReview"
  );
  const compositionAggregateNode = mustFind(
    compositionView.nodes,
    (node) =>
      node.kind === "aggregate-group" &&
      getTextDetailValue(node.details, "aggregate.id") === "Connection"
  );
  const compositionStateNode = mustFind(
    compositionView.nodes,
    (node) =>
      node.kind === "aggregate-state" &&
      getTextDetailValue(node.details, "aggregate.id") === "Connection" &&
      getTextDetailValue(node.details, "aggregate.state.id") === "suggested"
  );
  const lifecycleAggregateNode = mustFind(
    lifecycleView.nodes,
    (node) =>
      node.kind === "aggregate-group" &&
      getTextDetailValue(node.details, "aggregate.id") === "Connection"
  );
  const lifecycleStateNode = mustFind(
    lifecycleView.nodes,
    (node) =>
      node.kind === "aggregate-state" &&
      getTextDetailValue(node.details, "aggregate.id") === "Connection" &&
      getTextDetailValue(node.details, "aggregate.state.id") === "suggested"
  );
  const lifecycleTransitionEdge = mustFind(
    lifecycleView.edges,
    (edge) =>
      edge.kind === "transition" &&
      getTextDetailValue(edge.details, "aggregate.id") === "Connection" &&
      getTextDetailValue(edge.details, "command.type") === "archiveConnection"
  );

  assert.deepEqual(
    getTextListDetailValues(compositionProcessNode.details, "process.used_aggregates"),
    ["Connection", "Card"]
  );
  assert.deepEqual(
    getTextListDetailValues(compositionProcessNode.details, "process.final_stages"),
    ["closedConnectionArchived", "closedCardArchived", "closedCardAccepted"]
  );
  assert.deepEqual(
    getTextListDetailValues(compositionStageNode.details, "behavior.accepted_commands"),
    ["confirmConnection", "archiveConnection"]
  );
  assert.deepEqual(
    getTextListDetailValues(compositionStageNode.details, "behavior.observed_events"),
    ["ConnectionConfirmed", "ConnectionArchived"]
  );
  assert.deepEqual(
    getTextListDetailValues(compositionAggregateNode.details, "aggregate.lifecycle"),
    ["suggested", "confirmed", "archived"]
  );
  assert.deepEqual(
    getTextListDetailValues(compositionAggregateNode.details, "aggregate.referenced_by_stages"),
    ["connectionCardReviewProcess.awaitingConnectionReview (等待连接审核)"]
  );
  assert.deepEqual(
    getTextListDetailValues(compositionStateNode.details, "behavior.accepted_commands"),
    ["confirmConnection", "archiveConnection"]
  );
  assert.deepEqual(
    getTextListDetailValues(compositionStateNode.details, "aggregate.state.emitted_events"),
    ["ConnectionConfirmed", "ConnectionArchived"]
  );
  assert.deepEqual(
    getTextListDetailValues(compositionStateNode.details, "aggregate.state.bound_by_stages"),
    ["connectionCardReviewProcess.awaitingConnectionReview (等待连接审核)"]
  );

  assert.deepEqual(
    getTextListDetailValues(lifecycleAggregateNode.details, "aggregate.lifecycle"),
    ["suggested", "confirmed", "archived"]
  );
  assert.deepEqual(
    getTextListDetailValues(lifecycleAggregateNode.details, "behavior.accepted_commands"),
    ["confirmConnection", "archiveConnection"]
  );
  assert.deepEqual(
    getTextListDetailValues(lifecycleStateNode.details, "aggregate.state.outgoing_commands"),
    ["confirmConnection", "archiveConnection"]
  );
  assert.deepEqual(
    getTextListDetailValues(lifecycleStateNode.details, "aggregate.referenced_by_stages"),
    ["connectionCardReviewProcess.awaitingConnectionReview (等待连接审核)"]
  );
  assert.deepEqual(
    getRecordListDetailEntries(lifecycleTransitionEdge.details, "transition.payload_mapping"),
    [
      {
        Field: "connectionId",
        From: "$command.connectionId"
      },
      {
        Field: "reason",
        From: "$command.reason"
      }
    ]
  );
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

function getDetail(
  details: readonly ViewerDetailItem[],
  semanticKey: string
): ViewerDetailItem {
  const detail = details.find((candidate) => candidate.semanticKey === semanticKey);

  if (!detail) {
    throw new Error(`Expected detail ${semanticKey}`);
  }

  return detail;
}

function getTextDetailValue(details: readonly ViewerDetailItem[], semanticKey: string): string {
  const detail = getDetail(details, semanticKey);

  assert.equal(detail.value.kind, "text");

  return detail.value.text;
}

function getListDetailItems(
  details: readonly ViewerDetailItem[],
  semanticKey: string
): readonly ViewerDetailValue[] {
  const detail = getDetail(details, semanticKey);

  assert.equal(detail.value.kind, "list");

  return detail.value.items;
}

function getTextListDetailValues(
  details: readonly ViewerDetailItem[],
  semanticKey: string
): readonly string[] {
  return getListDetailItems(details, semanticKey).map((item, index) => {
    assert.equal(item.kind, "text", `Expected text item ${semanticKey}[${index}]`);

    return item.text;
  });
}

function getRecordListDetailEntries(
  details: readonly ViewerDetailItem[],
  semanticKey: string
): readonly Readonly<Record<string, string>>[] {
  return getListDetailItems(details, semanticKey).map((item, index) => {
    assert.equal(item.kind, "record", `Expected record item ${semanticKey}[${index}]`);

    return Object.fromEntries(
      item.entries.map((entry) => {
        assert.equal(
          entry.value.kind,
          "text",
          `Expected text entry ${semanticKey}[${index}].${entry.label}`
        );

        return [entry.label, entry.value.text];
      })
    );
  });
}

function getFieldDetail(
  details: readonly ViewerDetailValue[],
  fieldName: string
): ViewerFieldDetailValue {
  const detail = details.find(
    (candidate): candidate is ViewerFieldDetailValue =>
      candidate.kind === "field" && candidate.name === fieldName
  );

  if (!detail) {
    throw new Error(`Expected field detail ${fieldName}`);
  }

  return detail;
}
