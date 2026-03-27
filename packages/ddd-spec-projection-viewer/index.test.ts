import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  analyzeVnextBusinessSpec
} from "../ddd-spec-core/index.js";
import {
  VNEXT_CROSS_CONTEXT_VIEWER_GOLDEN_PATH,
  loadVnextCrossContextFixture
} from "../ddd-spec-core/test-fixtures.js";
import type {
  ViewerDetailItem,
  ViewerDetailValue,
  ViewerFieldDetailValue
} from "../ddd-spec-viewer-contract/index.js";
import { buildVnextViewerSpec } from "./index.js";

test("vNext viewer projection matches the checked-in cross-context artifact", async () => {
  const spec = await loadVnextCrossContextFixture();
  const analysis = analyzeVnextBusinessSpec(spec);
  const actualViewerSpec = buildVnextViewerSpec(spec, analysis);
  const expectedViewerSpec = JSON.parse(
    await readFile(VNEXT_CROSS_CONTEXT_VIEWER_GOLDEN_PATH, "utf8")
  );

  assert.deepStrictEqual(actualViewerSpec, expectedViewerSpec);
});

test("vNext viewer projection renders cross-context message flow and query details", async () => {
  const spec = await loadVnextCrossContextFixture();
  const analysis = analyzeVnextBusinessSpec(spec);
  const viewerSpec = buildVnextViewerSpec(spec, analysis);
  const contextMapView = mustFind(viewerSpec.views, (view) => view.id === "context-map");
  const messageFlowView = mustFind(viewerSpec.views, (view) => view.id === "message-flow");
  const scenarioStoryView = mustFind(viewerSpec.views, (view) => view.id === "scenario-story");
  const lifecycleView = mustFind(viewerSpec.views, (view) => view.id === "lifecycle");
  const ordersContextNode = mustFind(
    contextMapView.nodes,
    (node) =>
      node.kind === "context" &&
      getTextDetailValue(node.details, "context.id") === "orders"
  );
  const ledgerGatewayNode = mustFind(
    contextMapView.nodes,
    (node) =>
      node.kind === "system" &&
      getTextDetailValue(node.details, "system.boundary") === "external" &&
      node.subtitle === "ledger-gateway"
  );
  const ordersPaymentsEdge = mustFind(
    contextMapView.edges,
    (edge) =>
      edge.kind === "collaboration" &&
      edge.label === "depends-on" &&
      getTextDetailValue(edge.details, "relation.from") === "orders" &&
      getTextDetailValue(edge.details, "relation.to") === "context:payments"
  );
  const paymentAuthorizedNode = mustFind(
    messageFlowView.nodes,
    (node) =>
      node.kind === "message" &&
      getTextDetailValue(node.details, "message.type") === "payment-authorized"
  );
  const fetchLedgerStatusNode = mustFind(
    messageFlowView.nodes,
    (node) =>
      node.kind === "message" &&
      getTextDetailValue(node.details, "message.type") === "fetch-ledger-status"
  );
  const orderSubmittedTargetEdge = mustFind(
    messageFlowView.edges,
    (edge) =>
      edge.kind === "message-flow" &&
      edge.label === "target" &&
      getTextDetailValue(edge.details, "message.type") === "order-submitted" &&
      getTextDetailValue(edge.details, "relation.to") === "context:payments"
  );
  const queryStepEdge = mustFind(
    messageFlowView.edges,
    (edge) =>
      edge.kind === "message-flow" &&
      edge.label === "asks" &&
      getTextDetailValue(edge.details, "message.type") === "fetch-ledger-status" &&
      getTextDetailValue(edge.details, "step.id") === "reconcile-order"
  );
  const crossContextScenarioEdge = mustFind(
    scenarioStoryView.edges,
    (edge) =>
      edge.kind === "sequence" &&
      getTextDetailValue(edge.details, "relation.from") === "await-payment-authorization" &&
      getTextDetailValue(edge.details, "relation.to") === "reconcile-order"
  );
  const orderAggregateNode = mustFind(
    lifecycleView.nodes,
    (node) =>
      node.kind === "aggregate" &&
      getTextDetailValue(node.details, "aggregate.id") === "order"
  );
  const submittedStateNode = mustFind(
    lifecycleView.nodes,
    (node) =>
      node.kind === "lifecycle-state" &&
      getTextDetailValue(node.details, "aggregate.id") === "order" &&
      getTextDetailValue(node.details, "aggregate.state.id") === "submitted"
  );
  const confirmTransitionEdge = mustFind(
    lifecycleView.edges,
    (edge) =>
      edge.kind === "state-transition" &&
      getTextDetailValue(edge.details, "aggregate.id") === "order" &&
      getTextDetailValue(edge.details, "transition.trigger_message") === "ledger-status-fetched"
  );

  assert.deepEqual(
    viewerSpec.views.map((view) => view.id),
    ["context-map", "scenario-story", "message-flow", "lifecycle"]
  );
  assert.equal(getTextDetailValue(ledgerGatewayNode.details, "system.boundary"), "external");
  assert.deepEqual(
    getRecordListDetailEntries(ordersContextNode.details, "context.relationships"),
    [
      {
        Relationship: "requests-payment-authorization",
        Kind: "depends-on",
        Direction: "downstream",
        Integration: "customer-supplier",
        Target: "context:payments",
        Description: "Orders depends on the payments context to authorize settlement before confirmation."
      }
    ]
  );
  assert.deepEqual(
    getRecordDetailEntries(ordersPaymentsEdge.details, "context.relationships"),
    {
      Relationship: "requests-payment-authorization",
      Kind: "depends-on",
      Direction: "downstream",
      Integration: "customer-supplier",
      Target: "context:payments",
      Description: "Orders depends on the payments context to authorize settlement before confirmation."
    }
  );
  assert.equal(getTextDetailValue(paymentAuthorizedNode.details, "message.kind"), "event");
  assert.equal(
    getTextDetailValue(paymentAuthorizedNode.details, "message.crosses_context_boundary"),
    "yes"
  );
  assert.equal(getTextDetailValue(fetchLedgerStatusNode.details, "message.kind"), "query");
  assert.equal(getTextDetailValue(fetchLedgerStatusNode.details, "message.channel"), "sync");
  assert.equal(orderSubmittedTargetEdge.target, "message-flow:context:payments");
  assert.equal(
    queryStepEdge.source,
    "message-flow:scenario:order-settlement-flow:step:reconcile-order"
  );
  assert.equal(crossContextScenarioEdge.label, "payment-authorized");
  assert.equal(orderAggregateNode.subtitle, "order | orders");
  assert.equal(getTextDetailValue(orderAggregateNode.details, "aggregate.context"), "orders");
  assert.deepEqual(
    getTextListDetailValues(orderAggregateNode.details, "aggregate.accepted_messages"),
    ["submit-order", "ledger-status-fetched"]
  );
  assert.equal(getTextDetailValue(submittedStateNode.details, "aggregate.context"), "orders");
  assert.equal(getTextDetailValue(confirmTransitionEdge.details, "aggregate.context"), "orders");
  assert.equal(getTextDetailValue(confirmTransitionEdge.details, "relation.to"), "confirmed");
  assert.equal(
    lifecycleView.nodes.some(
      (node) =>
        node.kind === "aggregate" &&
        getTextDetailValue(node.details, "aggregate.id") === "payment"
    ),
    false
  );
});

function mustFind<Value>(
  values: readonly Value[],
  predicate: (value: Value) => boolean
): Value {
  const value = values.find(predicate);

  if (!value) {
    throw new Error("Expected a matching value.");
  }

  return value;
}

function getTextDetailValue(
  details: readonly ViewerDetailItem[],
  semanticKey: string
): string {
  const detail = mustFind(details, (item) => item.semanticKey === semanticKey);

  return getTextValue(detail.value);
}

function getTextListDetailValues(
  details: readonly ViewerDetailItem[],
  semanticKey: string
): readonly string[] {
  const detail = mustFind(details, (item) => item.semanticKey === semanticKey);

  if (detail.value.kind !== "list") {
    throw new Error(`Expected ${semanticKey} to be a list detail.`);
  }

  return detail.value.items.map((item) => getTextValue(item));
}

function getRecordListDetailEntries(
  details: readonly ViewerDetailItem[],
  semanticKey: string
): readonly Record<string, string>[] {
  const detail = mustFind(details, (item) => item.semanticKey === semanticKey);

  if (detail.value.kind !== "list") {
    throw new Error(`Expected ${semanticKey} to be a list detail.`);
  }

  return detail.value.items.map((item) => getRecordEntries(item));
}

function getRecordDetailEntries(
  details: readonly ViewerDetailItem[],
  semanticKey: string
): Record<string, string> {
  const detail = mustFind(details, (item) => item.semanticKey === semanticKey);

  return getRecordEntries(detail.value);
}

function getRecordEntries(value: ViewerDetailValue): Record<string, string> {
  if (value.kind !== "record") {
    throw new Error("Expected a record detail value.");
  }

  return Object.fromEntries(
    value.entries.map((entry) => [entry.label, getTextValue(entry.value)])
  );
}

function getTextValue(value: ViewerDetailValue): string {
  if (value.kind === "text") {
    return value.text;
  }

  if (value.kind === "field") {
    return getFieldText(value);
  }

  throw new Error(`Expected a text-like detail value, received ${value.kind}.`);
}

function getFieldText(field: ViewerFieldDetailValue): string {
  const parts = [field.fieldType];

  if (field.required) {
    parts.push("required");
  }

  return parts.join(" ");
}
