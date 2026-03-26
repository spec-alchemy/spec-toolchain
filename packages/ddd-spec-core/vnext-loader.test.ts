import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeVnextBusinessSpecSemantics,
  isVnextBusinessSpec,
  loadBusinessSpec,
  loadCanonicalSpec,
  loadVnextBusinessSpec,
  validateBusinessSpecSemantics,
  type VnextMessageSpec
} from "./index.js";
import {
  VNEXT_MINIMAL_FIXTURE_ENTRY_PATH,
  loadVnextMinimalFixture
} from "./test-fixtures.js";

test("vnext loader reads the minimal canonical into first-class vnext fields", async () => {
  const spec = await loadVnextMinimalFixture();

  assert.equal(spec.version, 3);
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
  assert.deepEqual(
    spec.policies[0].triggerMessages,
    ["approval-request-approved"]
  );
});

test("generic canonical loader dispatches version 3 without legacy adaptation", async () => {
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

test("legacy v2 loader refuses version 3 canonicals instead of adapting them", async () => {
  await assert.rejects(
    loadBusinessSpec({
      entryPath: VNEXT_MINIMAL_FIXTURE_ENTRY_PATH,
      validateSemantics: false
    }),
    /loadBusinessSpec expected version 2 canonical index/
  );
});

test("vnext semantic diagnostics expose a clean happy path result", async () => {
  const spec = await loadVnextMinimalFixture();
  const result = analyzeVnextBusinessSpecSemantics(spec);

  assert.equal(result.validationVersion, 1);
  assert.equal(result.specId, spec.id);
  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.summary.errorCount, 0);
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
