import assert from "node:assert/strict";
import test from "node:test";
import {
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

test("vnext semantic validation rejects broken message references", async () => {
  const spec = await loadVnextBusinessSpec({
    entryPath: VNEXT_MINIMAL_FIXTURE_ENTRY_PATH,
    validateSemantics: false
  });
  const messages = spec.messages as VnextMessageSpec[];
  const submittedMessage = messages.find((message) => message.id === "submit-approval-request");

  assert.ok(submittedMessage);
  submittedMessage.consumers = [
    {
      kind: "aggregate",
      id: "missing-aggregate"
    }
  ];

  assert.throws(
    () => {
      validateBusinessSpecSemantics(spec);
    },
    /Message submit-approval-request consumer aggregate missing-aggregate must reference existing aggregate/
  );
});
