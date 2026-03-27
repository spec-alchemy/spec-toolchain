import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  analyzeVnextBusinessSpec,
  analyzeVnextBusinessSpecSemantics,
  isVnextBusinessSpec,
  loadCanonicalSpec,
  loadVnextBusinessSpec,
  projectVnextContextMap,
  projectVnextLifecycle,
  projectVnextMessageFlow,
  projectVnextPolicyCoordination,
  projectVnextScenarioStory,
  validateBusinessSpecSemantics,
  type VnextMessageSpec
} from "./index.js";
import {
  VNEXT_MINIMAL_FIXTURE_ENTRY_PATH,
  loadVnextCrossContextFixture,
  loadVnextMinimalFixture
} from "./test-fixtures.js";

test("vnext loader reads the minimal canonical into first-class vnext fields", async () => {
  const spec = await loadVnextMinimalFixture();

  assert.equal(spec.version, 1);
  assert.equal("model" in spec, false);
  assert.equal("domain" in spec, false);
  assert.deepEqual(
    spec.contexts.map((context) => context.id),
    ["approvals"]
  );
  assert.deepEqual(
    spec.actors.map((actor) => actor.id),
    ["approver", "requester"]
  );
  assert.deepEqual(
    spec.systems.map((system) => system.id),
    ["notification-hub"]
  );
  assert.deepEqual(
    spec.scenarios.map((scenario) => scenario.id),
    ["approval-request-flow"]
  );
  assert.deepEqual(
    spec.messages.map((message) => message.id),
    [
      "approval-request-approved",
      "approval-request-submitted",
      "approve-request",
      "send-approval-notification",
      "submit-approval-request"
    ]
  );
  assert.deepEqual(
    spec.aggregates[0].transitions.map((transition) => transition.onMessage),
    ["submit-approval-request", "approve-request"]
  );
  assert.equal(spec.aggregates[0]?.lifecycleComplexity, true);
  assert.deepEqual(
    spec.policies[0].triggerMessages,
    ["approval-request-approved"]
  );
});

test("generic canonical loader dispatches version 1 without legacy adaptation", async () => {
  const spec = await loadCanonicalSpec({
    entryPath: VNEXT_MINIMAL_FIXTURE_ENTRY_PATH
  });

  assert.equal(isVnextBusinessSpec(spec), true);

  if (!isVnextBusinessSpec(spec)) {
    throw new Error("Expected a vnext business spec");
  }

  assert.equal("domain" in spec, false);
  assert.equal(spec.messages.find((message) => message.id === "send-approval-notification")?.producers[0].kind, "policy");
});

test("generic canonical loader rejects reset version 3 workspaces", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-legacy-version-"));
  const entryPath = join(tempDir, "index.yaml");

  try {
    await writeFile(
      entryPath,
      [
        "version: 3",
        "id: legacy-spec",
        "title: Legacy Spec",
        "summary: Should be rejected after the reset.",
        "model:",
        "  contexts: ./contexts",
        "  actors: ./actors",
        "  systems: ./systems",
        "  scenarios: ./scenarios",
        "  messages: ./messages",
        "  aggregates: ./aggregates",
        "  policies: ./policies"
      ].join("\n").concat("\n"),
      "utf8"
    );

    await assert.rejects(
      loadCanonicalSpec({
        entryPath,
        validateSemantics: false
      }),
      /reset the default workspace contract to version 1/
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("generic canonical loader rejects legacy top-level domain containers", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ddd-spec-legacy-domain-shape-"));
  const entryPath = join(tempDir, "index.yaml");

  try {
    await writeFile(
      entryPath,
      [
        "version: 1",
        "id: legacy-domain-shape",
        "title: Legacy Domain Shape",
        "summary: Should be rejected.",
        "domain: {}"
      ].join("\n").concat("\n"),
      "utf8"
    );

    await assert.rejects(
      loadCanonicalSpec({
        entryPath,
        validateSemantics: false
      }),
      /Legacy top-level `domain` is no longer supported/
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("vnext semantic diagnostics expose a clean happy path result", async () => {
  const spec = await loadVnextMinimalFixture();
  const analysis = analyzeVnextBusinessSpec(spec);
  const result = analyzeVnextBusinessSpecSemantics(spec);

  assert.equal(result.validationVersion, 1);
  assert.equal(result.specId, spec.id);
  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.summary.errorCount, 0);
  assert.equal(analysis.analysisVersion, 1);
  assert.deepEqual(analysis.diagnostics, result.diagnostics);
  assert.equal(analysis.summary.errorCount, result.summary.errorCount);
});

test("vnext analysis IR exposes unified primary-view projections and policy coordination", async () => {
  const spec = await loadVnextMinimalFixture();
  const analysis = analyzeVnextBusinessSpec(spec);
  const contextMap = projectVnextContextMap(analysis.ir);
  const scenarioStory = projectVnextScenarioStory(analysis.ir);
  const messageFlow = projectVnextMessageFlow(analysis.ir);
  const lifecycle = projectVnextLifecycle(analysis.ir);
  const policyCoordination = projectVnextPolicyCoordination(analysis.ir);

  const approvalsContext = mustFind(
    contextMap.contexts,
    (context) => context.id === "approvals"
  );
  const requesterActor = mustFind(
    contextMap.actors,
    (actor) => actor.id === "requester"
  );
  const notificationHub = mustFind(
    contextMap.systems,
    (system) => system.id === "notification-hub"
  );
  const approvalScenario = mustFind(
    scenarioStory,
    (scenario) => scenario.id === "approval-request-flow"
  );
  const approvalMessage = mustFind(
    messageFlow,
    (message) => message.id === "approval-request-approved"
  );
  const notificationMessage = mustFind(
    messageFlow,
    (message) => message.id === "send-approval-notification"
  );
  const approvalLifecycle = mustFind(
    lifecycle,
    (aggregate) => aggregate.id === "approval-request"
  );
  const notificationPolicy = mustFind(
    policyCoordination,
    (policy) => policy.id === "notify-requester-after-approval"
  );

  assert.deepEqual(analysis.diagnostics, []);
  assert.deepEqual(approvalsContext.aggregateIds, ["approval-request"]);
  assert.deepEqual(approvalsContext.scenarioIds, ["approval-request-flow"]);
  assert.deepEqual(approvalsContext.policyIds, ["notify-requester-after-approval"]);
  assert.deepEqual(approvalsContext.actorIds, ["requester", "approver"]);
  assert.deepEqual(approvalsContext.systemIds, ["notification-hub"]);
  assert.deepEqual(
    approvalsContext.relationships.map((relationship) => relationship.id),
    ["notify-requester"]
  );
  assert.deepEqual(requesterActor.contextIds, ["approvals"]);
  assert.deepEqual(requesterActor.scenarioIds, ["approval-request-flow"]);
  assert.deepEqual(
    requesterActor.stepRefs.map((stepRef) => `${stepRef.scenarioId}.${stepRef.stepId}`),
    ["approval-request-flow.draft-request"]
  );
  assert.deepEqual(notificationHub.contextIds, ["approvals"]);
  assert.deepEqual(
    notificationHub.dependencyRefs.map((dependency) => dependency.kind),
    ["context-relationship", "message-consumer", "policy-target"]
  );
  assert.deepEqual(approvalScenario.entryStepIds, ["draft-request"]);
  assert.deepEqual(approvalScenario.finalStepIds, ["request-approved"]);
  assert.deepEqual(approvalScenario.participatingContextIds, ["approvals"]);
  assert.deepEqual(approvalScenario.actorIds, ["requester", "approver"]);
  assert.deepEqual(
    mustFind(approvalScenario.steps, (step) => step.id === "awaiting-review").incomingMessageIds,
    ["approval-request-submitted"]
  );
  assert.deepEqual(
    mustFind(approvalScenario.steps, (step) => step.id === "awaiting-review").outgoingMessageIds,
    ["approve-request"]
  );
  assert.deepEqual(
    approvalMessage.producers.map((producer) => `${producer.kind}:${producer.id}`),
    ["aggregate:approval-request"]
  );
  assert.deepEqual(
    approvalMessage.consumers.map((consumer) => `${consumer.kind}:${consumer.id}`),
    ["scenario:approval-request-flow", "policy:notify-requester-after-approval"]
  );
  assert.deepEqual(
    approvalMessage.stepLinks.map((link) => `${link.direction}:${link.scenarioId}.${link.stepId}`),
    ["incoming:approval-request-flow.request-approved"]
  );
  assert.deepEqual(
    notificationMessage.producers.map((producer) => `${producer.kind}:${producer.id}`),
    ["policy:notify-requester-after-approval"]
  );
  assert.deepEqual(
    notificationMessage.consumers.map((consumer) => `${consumer.kind}:${consumer.id}`),
    ["system:notification-hub"]
  );
  assert.equal(notificationMessage.crossesContextBoundary, false);
  assert.equal(approvalLifecycle.lifecycleComplexity, true);
  assert.equal(approvalLifecycle.initialState, "draft");
  assert.deepEqual(
    approvalLifecycle.reachableStateIds,
    ["draft", "submitted", "approved"]
  );
  assert.deepEqual(
    approvalLifecycle.transitions.map((transition) => ({
      id: transition.id,
      onMessageId: transition.onMessageId,
      emits: transition.emittedMessageIds
    })),
    [
      {
        id: "submit-request",
        onMessageId: "submit-approval-request",
        emits: ["approval-request-submitted"]
      },
      {
        id: "approve-request",
        onMessageId: "approve-request",
        emits: ["approval-request-approved"]
      }
    ]
  );
  assert.deepEqual(
    notificationPolicy.triggerMessageIds,
    ["approval-request-approved"]
  );
  assert.deepEqual(
    notificationPolicy.emittedMessageIds,
    ["send-approval-notification"]
  );
  assert.deepEqual(notificationPolicy.targetSystemIds, ["notification-hub"]);
  assert.deepEqual(notificationPolicy.relatedContextIds, ["approvals"]);
});

test("vnext cross-context example exposes command, event, and query message flow across contexts", async () => {
  const spec = await loadVnextCrossContextFixture();
  const analysis = analyzeVnextBusinessSpec(spec);
  const contextMap = projectVnextContextMap(analysis.ir);
  const scenarioStory = projectVnextScenarioStory(analysis.ir);
  const messageFlow = projectVnextMessageFlow(analysis.ir);
  const lifecycle = projectVnextLifecycle(analysis.ir);

  const ordersContext = mustFind(
    contextMap.contexts,
    (context) => context.id === "orders"
  );
  const paymentsContext = mustFind(
    contextMap.contexts,
    (context) => context.id === "payments"
  );
  const ledgerGateway = mustFind(
    contextMap.systems,
    (system) => system.id === "ledger-gateway"
  );
  const settlementScenario = mustFind(
    scenarioStory,
    (scenario) => scenario.id === "order-settlement-flow"
  );
  const orderSubmitted = mustFind(
    messageFlow,
    (message) => message.id === "order-submitted"
  );
  const paymentAuthorized = mustFind(
    messageFlow,
    (message) => message.id === "payment-authorized"
  );
  const fetchLedgerStatus = mustFind(
    messageFlow,
    (message) => message.id === "fetch-ledger-status"
  );
  const ledgerStatusFetched = mustFind(
    messageFlow,
    (message) => message.id === "ledger-status-fetched"
  );
  const orderLifecycle = mustFind(
    lifecycle,
    (aggregate) => aggregate.id === "order"
  );

  assert.deepEqual(analysis.diagnostics, []);
  assert.deepEqual(
    contextMap.contexts.map((context) => context.id),
    ["orders", "payments"]
  );
  assert.deepEqual(ordersContext.systemIds, ["ledger-gateway"]);
  assert.deepEqual(
    ordersContext.relationships.map((relationship) => ({
      id: relationship.id,
      kind: relationship.kind,
      direction: relationship.direction,
      integration: relationship.integration,
      target: `${relationship.target.kind}:${relationship.target.id}`
    })),
    [
      {
        id: "requests-payment-authorization",
        kind: "depends-on",
        direction: "downstream",
        integration: "customer-supplier",
        target: "context:payments"
      }
    ]
  );
  assert.deepEqual(
    paymentsContext.relationships.map((relationship) => ({
      id: relationship.id,
      kind: relationship.kind,
      direction: relationship.direction,
      integration: relationship.integration,
      target: `${relationship.target.kind}:${relationship.target.id}`
    })),
    [
      {
        id: "queries-ledger",
        kind: "queries",
        direction: "downstream",
        integration: "synchronous-query",
        target: "system:ledger-gateway"
      }
    ]
  );
  assert.equal(ledgerGateway.boundary, "external");
  assert.deepEqual(
    analysis.ir.aggregateLifecycles.map((aggregate) => aggregate.id),
    ["order", "payment"]
  );
  assert.deepEqual(
    lifecycle.map((aggregate) => aggregate.id),
    ["order"]
  );
  assert.deepEqual(settlementScenario.participatingContextIds, ["orders", "payments"]);
  assert.deepEqual(settlementScenario.entryStepIds, ["capture-order"]);
  assert.deepEqual(settlementScenario.finalStepIds, ["order-confirmed"]);
  assert.equal(orderSubmitted.messageKind, "event");
  assert.equal(orderSubmitted.crossesContextBoundary, true);
  assert.deepEqual(orderSubmitted.producerContextIds, ["orders"]);
  assert.deepEqual(orderSubmitted.consumerContextIds, ["payments"]);
  assert.equal(paymentAuthorized.messageKind, "event");
  assert.equal(paymentAuthorized.crossesContextBoundary, true);
  assert.deepEqual(paymentAuthorized.producerContextIds, ["payments"]);
  assert.deepEqual(paymentAuthorized.consumerContextIds, ["orders"]);
  assert.equal(fetchLedgerStatus.messageKind, "query");
  assert.equal(fetchLedgerStatus.channel, "sync");
  assert.equal(fetchLedgerStatus.crossesContextBoundary, false);
  assert.deepEqual(
    fetchLedgerStatus.consumers.map((consumer) => `${consumer.kind}:${consumer.id}`),
    ["system:ledger-gateway"]
  );
  assert.deepEqual(
    ledgerStatusFetched.stepLinks.map((link) => `${link.direction}:${link.scenarioId}.${link.stepId}`),
    ["incoming:order-settlement-flow.order-confirmed"]
  );
  assert.equal(orderLifecycle.lifecycleComplexity, true);
  assert.deepEqual(orderLifecycle.acceptedMessageIds, ["submit-order", "ledger-status-fetched"]);
  assert.deepEqual(orderLifecycle.reachableStateIds, ["draft", "submitted", "confirmed"]);
});

test("vnext semantic validation reports missing context ownership", async () => {
  const spec = cloneVnextBusinessSpec(await loadVnextMinimalFixture());
  const contexts = asMutableArray(spec.contexts);

  contexts[0] = {
    ...contexts[0],
    owners: []
  };

  const result = analyzeVnextBusinessSpecSemantics(spec);

  assert.equal(result.summary.errorCount, 1);
  assert.equal(result.diagnostics[0]?.code, "missing-context-owner");
  assert.equal(result.diagnostics[0]?.path, "/contexts/approvals/owners");
  assert.match(result.diagnostics[0]?.message ?? "", /must declare at least one owner/);

  assert.throws(
    () => {
      validateBusinessSpecSemantics(spec);
    },
    /Context approvals must declare at least one owner/
  );
});

test("vnext semantic validation rejects broken scenario message linkage", async () => {
  const spec = cloneVnextBusinessSpec(await loadVnextMinimalFixture());
  const scenarios = asMutableArray(spec.scenarios);
  const scenario = scenarios.find((candidate) => candidate.id === "approval-request-flow");

  assert.ok(scenario);

  const steps = asMutableArray(scenario.steps);
  const reviewStep = steps.find((candidate) => candidate.id === "awaiting-review");

  assert.ok(reviewStep);
  reviewStep.incomingMessages = ["send-approval-notification"];

  const result = analyzeVnextBusinessSpecSemantics(spec);

  assert.ok(
    result.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === "scenario-message-link-broken" &&
        diagnostic.path ===
          "/scenarios/approval-request-flow/steps/awaiting-review/incomingMessages/send-approval-notification"
    )
  );

  assert.throws(
    () => {
      validateBusinessSpecSemantics(spec);
    },
    /incoming message send-approval-notification is not linked to the step or its owner context/
  );
});

test("vnext semantic validation rejects broken scenario step topology", async () => {
  const spec = cloneVnextBusinessSpec(await loadVnextMinimalFixture());
  const scenarios = asMutableArray(spec.scenarios);
  const scenario = scenarios.find((candidate) => candidate.id === "approval-request-flow");

  assert.ok(scenario);

  const steps = asMutableArray(scenario.steps);
  const reviewStep = steps.find((candidate) => candidate.id === "awaiting-review");

  assert.ok(reviewStep);
  reviewStep.next = ["missing-step"];

  const result = analyzeVnextBusinessSpecSemantics(spec);

  assert.ok(
    result.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === "unknown-resource-reference" &&
        diagnostic.path ===
          "/scenarios/approval-request-flow/steps/awaiting-review/next/missing-step"
    )
  );
  assert.ok(
    result.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === "scenario-multiple-entry-steps" &&
        diagnostic.path === "/scenarios/approval-request-flow/steps"
    )
  );
});

test("vnext semantic validation rejects broken aggregate lifecycle triggers", async () => {
  const spec = await loadVnextBusinessSpec({
    entryPath: VNEXT_MINIMAL_FIXTURE_ENTRY_PATH,
    validateSemantics: false
  });
  const messages = asMutableArray(spec.messages as VnextMessageSpec[]);
  const submittedMessage = messages.find((message) => message.id === "submit-approval-request");

  assert.ok(submittedMessage);
  submittedMessage.consumers = [
    {
      kind: "aggregate",
      id: "missing-aggregate"
    }
  ];

  const result = analyzeVnextBusinessSpecSemantics(spec);

  assert.ok(
    result.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === "unknown-resource-reference" &&
        diagnostic.path === "/messages/submit-approval-request/consumers/aggregate:missing-aggregate"
    )
  );
  assert.ok(
    result.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === "aggregate-transition-trigger-consumer-mismatch" &&
        diagnostic.path === "/aggregates/approval-request/transitions/submit-request/onMessage"
    )
  );

  assert.throws(
    () => {
      validateBusinessSpecSemantics(spec);
    },
    /Message submit-approval-request consumer aggregate missing-aggregate must reference existing aggregate/
  );
});

test("vnext semantic validation rejects unreachable aggregate states", async () => {
  const spec = cloneVnextBusinessSpec(await loadVnextMinimalFixture());
  const aggregates = asMutableArray(spec.aggregates);

  aggregates[0] = {
    ...aggregates[0],
    states: [...aggregates[0].states, "abandoned"]
  };

  const result = analyzeVnextBusinessSpecSemantics(spec);

  assert.ok(
    result.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === "aggregate-state-unreachable" &&
        diagnostic.path === "/aggregates/approval-request/states/abandoned"
    )
  );

  assert.throws(
    () => {
      validateBusinessSpecSemantics(spec);
    },
    /state abandoned is unreachable from initialState draft/
  );
});

test("vnext semantic validation rejects aggregate transitions that target unknown states", async () => {
  const spec = cloneVnextBusinessSpec(await loadVnextMinimalFixture());
  const aggregates = asMutableArray(spec.aggregates);
  const approvalRequestAggregate = aggregates.find(
    (aggregate) => aggregate.id === "approval-request"
  );

  assert.ok(approvalRequestAggregate);
  const transitions = asMutableArray(approvalRequestAggregate.transitions);

  transitions[1] = {
    ...transitions[1],
    to: "missing-state"
  };

  const result = analyzeVnextBusinessSpecSemantics(spec);

  assert.ok(
    result.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === "aggregate-transition-state-invalid" &&
        diagnostic.path === "/aggregates/approval-request/transitions/approve-request/to"
    )
  );

  assert.throws(
    () => {
      validateBusinessSpecSemantics(spec);
    },
    /transition approve-request to missing-state must belong to states/
  );
});

test("vnext semantic validation rejects policies without explicit outcome", async () => {
  const spec = cloneVnextBusinessSpec(await loadVnextMinimalFixture());
  const policies = asMutableArray(spec.policies);

  policies[0] = {
    ...policies[0],
    emittedMessages: []
  };

  const result = analyzeVnextBusinessSpecSemantics(spec);

  assert.ok(
    result.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === "policy-outcome-missing" &&
        diagnostic.path === "/policies/notify-requester-after-approval/emittedMessages"
    )
  );

  assert.throws(
    () => {
      validateBusinessSpecSemantics(spec);
    },
    /Policy notify-requester-after-approval must declare at least one emitted message/
  );
});

function cloneVnextBusinessSpec(spec: Awaited<ReturnType<typeof loadVnextMinimalFixture>>) {
  return structuredClone(spec);
}

function asMutableArray<Value>(values: readonly Value[]): Value[] {
  return values as Value[];
}

function mustFind<Value>(
  values: readonly Value[],
  predicate: (value: Value) => boolean
): Value {
  const value = values.find(predicate);

  assert.ok(value);

  return value;
}
