import assert from "node:assert/strict";
import test from "node:test";

import {
  SHARED_ARTIFACT_MANIFEST_VERSION,
  SHARED_ARTIFACT_ROLES,
  SHARED_DIAGNOSTIC_SEVERITIES,
  SHARED_DIAGNOSTIC_VERSION,
  SHARED_KERNEL_EXTENSION_POINT_STATUS,
  SHARED_REFERENCE_VERSION,
  SHARED_STABLE_ID_VERSION,
  type SharedArtifactManifest,
  type SharedDiagnostic,
  type SharedKernelFamilyContract,
  type SharedReference,
  type SharedStableId
} from "./index.ts";

test("stable ID contract only models canonical source object identity", () => {
  const stableId: SharedStableId = {
    family: "qa-spec",
    kind: "coverage-target",
    value: "checkout-happy-path"
  };

  assert.equal(SHARED_STABLE_ID_VERSION, 1);
  assert.deepEqual(Object.keys(stableId), ["family", "kind", "value"]);
});

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
        target: {
          family: "ui-spec",
          kind: "screen",
          value: "checkout-confirm",
          versionHint: "draft"
        },
        path: "/views/checkout/confirm"
      }
    ]
  };

  assert.equal(SHARED_DIAGNOSTIC_VERSION, 1);
  assert.deepEqual(SHARED_DIAGNOSTIC_SEVERITIES, ["error", "warning", "info"]);
  assert.equal(diagnostic.related?.[0]?.target.family, "ui-spec");
  assert.equal(diagnostic.related?.[0]?.target.value, "checkout-confirm");
});

test("cross-family reference contract separates resolver identity from hints", () => {
  const reference: SharedReference = {
    target: {
      family: "frontend-spec",
      kind: "module-contract",
      value: "checkout-cart-shell",
      versionHint: "draft"
    },
    path: "/modules/cart/shell"
  };

  assert.equal(SHARED_REFERENCE_VERSION, 1);
  assert.deepEqual(Object.keys(reference), ["target", "path"]);
  assert.deepEqual(Object.keys(reference.target), [
    "family",
    "kind",
    "value",
    "versionHint"
  ]);
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
