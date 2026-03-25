import assert from "node:assert/strict";
import test from "node:test";
import {
  getViewerDevSessionMessage,
  shouldReloadViewerSpec,
  type ViewerDevSessionStatus
} from "../src/lib/viewer-dev-session";

const READY_STATUS: ViewerDevSessionStatus = {
  enabled: true,
  buildState: "ready",
  lastFailureMessage: null,
  lastSuccessfulBuildRevision: 2
};

test("viewer dev session auto-reload only reacts to newer successful builds", () => {
  assert.equal(shouldReloadViewerSpec(READY_STATUS, 1), true);
  assert.equal(shouldReloadViewerSpec(READY_STATUS, 2), false);
  assert.equal(
    shouldReloadViewerSpec(
      {
        ...READY_STATUS,
        buildState: "failed"
      },
      1
    ),
    false
  );
});

test("viewer dev session messaging stays scoped to the default workspace spec", () => {
  const readyMessage = getViewerDevSessionMessage(READY_STATUS, {
    isDefaultSpecSource: true
  });
  const failedMessage = getViewerDevSessionMessage(
    {
      ...READY_STATUS,
      buildState: "failed",
      lastFailureMessage: "bad yaml"
    },
    {
      isDefaultSpecSource: true
    }
  );
  const externalMessage = getViewerDevSessionMessage(READY_STATUS, {
    isDefaultSpecSource: false
  });

  assert.equal(readyMessage.tone, "info");
  assert.ok(readyMessage.message);
  assert.equal(failedMessage.tone, "warning");
  assert.ok(failedMessage.message);
  assert.match(failedMessage.message, /bad yaml/);
  assert.deepEqual(externalMessage, {
    message: null,
    tone: null
  });
});
