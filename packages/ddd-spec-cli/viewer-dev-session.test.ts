import assert from "node:assert/strict";
import test from "node:test";
import {
  createViewerDevSessionStatusController,
  getViewerDevSessionStatus
} from "./viewer-dev-session.js";

test("viewer dev session status defaults to a disabled idle snapshot", () => {
  assert.deepEqual(getViewerDevSessionStatus(), {
    enabled: false,
    buildState: "idle",
    lastFailureMessage: null,
    lastSuccessfulBuildRevision: 0
  });
});

test("viewer dev session status controller tracks failure recovery without losing the last good revision", () => {
  const controller = createViewerDevSessionStatusController();

  assert.deepEqual(controller.getStatus(), {
    enabled: true,
    buildState: "idle",
    lastFailureMessage: null,
    lastSuccessfulBuildRevision: 0
  });

  assert.deepEqual(controller.markBuildSucceeded(), {
    enabled: true,
    buildState: "ready",
    lastFailureMessage: null,
    lastSuccessfulBuildRevision: 1
  });

  assert.deepEqual(controller.markBuildFailed("schema broke"), {
    enabled: true,
    buildState: "failed",
    lastFailureMessage: "schema broke",
    lastSuccessfulBuildRevision: 1
  });

  assert.deepEqual(controller.markBuildSucceeded(), {
    enabled: true,
    buildState: "ready",
    lastFailureMessage: null,
    lastSuccessfulBuildRevision: 2
  });
});
