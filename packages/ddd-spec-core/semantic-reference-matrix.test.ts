import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeBusinessSpecSemantics,
  validateBusinessSpecSemantics,
  type BusinessSpec,
  type ResourceKind
} from "./index.js";
import { cloneBusinessSpec, loadMinimalFixture } from "./test-fixtures.js";

const EXISTING_RESOURCE_IDS: Record<ResourceKind, string> = {
  context: "approvals",
  actor: "requester",
  system: "notification-hub",
  scenario: "approval-request-flow",
  message: "submit-approval-request",
  aggregate: "approval-request",
  policy: "notify-requester-after-approval"
};

test("semantic validation accepts the current allowed reference matrix", async () => {
  const spec = await loadMinimalFixture();

  assert.doesNotThrow(() => {
    validateBusinessSpecSemantics(spec);
  });
});

for (const disallowedKind of [
  "actor",
  "scenario",
  "message",
  "aggregate",
  "policy"
] satisfies readonly ResourceKind[]) {
  test(`semantic validation rejects context relationship targets of kind ${disallowedKind}`, async () => {
    const spec = cloneBusinessSpec(await loadMinimalFixture());
    const context = spec.contexts.find((candidate) => candidate.id === "approvals");

    assert.ok(context?.relationships?.[0]);
    context.relationships[0] = {
      ...context.relationships[0],
      target: {
        kind: disallowedKind,
        id: EXISTING_RESOURCE_IDS[disallowedKind]
      }
    };

    expectUnsupportedKindDiagnostic({
      spec,
      path: "/contexts/approvals/relationships/notify-requester/target",
      messagePattern: new RegExp(`target kind ${disallowedKind} is not allowed here`)
    });
  });
}

for (const side of ["producers", "consumers"] as const) {
  test(`semantic validation rejects message ${side} of kind message`, async () => {
    const spec = cloneBusinessSpec(await loadMinimalFixture());
    const message = spec.messages.find((candidate) => candidate.id === "approval-request-submitted");

    assert.ok(message);
    message[side] = [
      {
        kind: "message",
        id: EXISTING_RESOURCE_IDS.message
      }
    ];

    expectUnsupportedKindDiagnostic({
      spec,
      path: `/messages/approval-request-submitted/${side}/message:${EXISTING_RESOURCE_IDS.message}`,
      messagePattern: new RegExp(`Message approval-request-submitted ${side === "producers" ? "producer" : "consumer"} kind message is not allowed here`)
    });
  });
}

for (const disallowedKind of ["actor", "message"] satisfies readonly ResourceKind[]) {
  test(`semantic validation rejects policy coordinates of kind ${disallowedKind}`, async () => {
    const spec = cloneBusinessSpec(await loadMinimalFixture());
    const policy = spec.policies.find(
      (candidate) => candidate.id === "notify-requester-after-approval"
    );

    assert.ok(policy);
    policy.coordinates = [
      {
        kind: disallowedKind,
        id: EXISTING_RESOURCE_IDS[disallowedKind]
      }
    ];

    expectUnsupportedKindDiagnostic({
      spec,
      path: `/policies/notify-requester-after-approval/coordinates/${disallowedKind}:${EXISTING_RESOURCE_IDS[disallowedKind]}`,
      messagePattern: new RegExp(`Policy notify-requester-after-approval coordinate kind ${disallowedKind} is not allowed here`)
    });
  });
}

function expectUnsupportedKindDiagnostic(options: {
  spec: BusinessSpec;
  path: string;
  messagePattern: RegExp;
}): void {
  const result = analyzeBusinessSpecSemantics(options.spec);

  assert.ok(
    result.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === "unsupported-resource-kind-reference" &&
        diagnostic.path === options.path &&
        options.messagePattern.test(diagnostic.message)
    )
  );

  assert.throws(() => {
    validateBusinessSpecSemantics(options.spec);
  }, options.messagePattern);
}
