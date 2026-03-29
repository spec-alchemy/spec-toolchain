import assert from "node:assert/strict";
import test from "node:test";

import {
  SHARED_ARTIFACT_MANIFEST_VERSION,
  SHARED_ARTIFACT_ROLES,
  SHARED_DIAGNOSTIC_SEVERITIES,
  SHARED_DIAGNOSTIC_VERSION,
  SHARED_KERNEL_EXTENSION_POINT_STATUS,
  type SharedArtifactManifest,
  type SharedDiagnostic,
  type SharedKernelFamilyContract
} from "./index.ts";

test("shared diagnostics contract stays family-agnostic", () => {
  const diagnostic: SharedDiagnostic = {
    severity: "error",
    code: "missing-reference",
    message: "Reference target is missing.",
    location: {
      path: "/flows/checkout/steps/confirm"
    },
    related: [
      {
        family: "ui-spec",
        kind: "screen",
        stableId: "checkout-confirm"
      }
    ]
  };

  assert.equal(SHARED_DIAGNOSTIC_VERSION, 1);
  assert.deepEqual(SHARED_DIAGNOSTIC_SEVERITIES, ["error", "warning", "info"]);
  assert.equal(diagnostic.related?.[0]?.family, "ui-spec");
});

test("artifact manifest contract tracks generic artifact metadata only", () => {
  const manifest: SharedArtifactManifest = {
    manifestVersion: SHARED_ARTIFACT_MANIFEST_VERSION,
    artifacts: [
      {
        id: "viewer-main",
        family: "frontend-spec",
        kind: "viewer-bundle",
        role: "viewer",
        locator: {
          relativePath: "generated/viewer-spec.json",
          mediaType: "application/json"
        },
        sourceIds: ["route-checkout", "module-cart-shell"]
      }
    ]
  };

  assert.equal(SHARED_ARTIFACT_MANIFEST_VERSION, 1);
  assert.deepEqual(SHARED_ARTIFACT_ROLES, [
    "analysis",
    "generation",
    "viewer",
    "diagnostics",
    "other"
  ]);
  assert.equal(manifest.artifacts[0]?.family, "frontend-spec");
});

test("extension points stay reserved instead of promising runtime behavior", () => {
  const familyContract: SharedKernelFamilyContract = {
    family: "qa-spec",
    artifactContracts: [
      {
        kind: "evidence-chain",
        status: "reserved"
      }
    ]
  };

  assert.deepEqual(SHARED_KERNEL_EXTENSION_POINT_STATUS, [
    "reserved",
    "candidate"
  ]);
  assert.equal(familyContract.artifactContracts?.[0]?.status, "reserved");
});
