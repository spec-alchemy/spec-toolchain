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
  assert.deepEqual(
    getViewerDevSessionMessage(READY_STATUS, {
      isDefaultSpecSource: true
    }),
    {
      message: "Auto-reload is active for the current workspace viewer spec.",
      tone: "info"
    }
  );

  assert.deepEqual(
    getViewerDevSessionMessage(
      {
        ...READY_STATUS,
        buildState: "failed",
        lastFailureMessage: "bad yaml"
      },
      {
        isDefaultSpecSource: true
      }
    ),
    {
      message:
        "Auto-reload paused after a rebuild failure: bad yaml. Showing the last successful viewer spec until the next build passes.",
      tone: "warning"
    }
  );

  assert.deepEqual(
    getViewerDevSessionMessage(READY_STATUS, {
      isDefaultSpecSource: false
    }),
    {
      message: null,
      tone: null
    }
  );
});
