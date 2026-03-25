export const VIEWER_DEV_SESSION_ROUTE_PATH = "/__ddd-spec/dev-session";

export type ViewerDevSessionBuildState = "idle" | "ready" | "failed";

export interface ViewerDevSessionStatus {
  enabled: boolean;
  buildState: ViewerDevSessionBuildState;
  lastFailureMessage: string | null;
  lastSuccessfulBuildRevision: number;
}

export interface ViewerDevSessionStatusProvider {
  getStatus: () => ViewerDevSessionStatus;
}

export interface ViewerDevSessionStatusController
  extends ViewerDevSessionStatusProvider {
  markBuildFailed: (message: string) => ViewerDevSessionStatus;
  markBuildSucceeded: () => ViewerDevSessionStatus;
}

const DISABLED_VIEWER_DEV_SESSION_STATUS: ViewerDevSessionStatus = {
  enabled: false,
  buildState: "idle",
  lastFailureMessage: null,
  lastSuccessfulBuildRevision: 0
};

export function createViewerDevSessionStatusController(): ViewerDevSessionStatusController {
  let lastSuccessfulBuildRevision = 0;
  let buildState: ViewerDevSessionBuildState = "idle";
  let lastFailureMessage: string | null = null;

  return {
    getStatus: () => ({
      enabled: true,
      buildState,
      lastFailureMessage,
      lastSuccessfulBuildRevision
    }),
    markBuildFailed: (message: string) => {
      buildState = "failed";
      lastFailureMessage = message;

      return {
        enabled: true,
        buildState,
        lastFailureMessage,
        lastSuccessfulBuildRevision
      };
    },
    markBuildSucceeded: () => {
      buildState = "ready";
      lastFailureMessage = null;
      lastSuccessfulBuildRevision += 1;

      return {
        enabled: true,
        buildState,
        lastFailureMessage,
        lastSuccessfulBuildRevision
      };
    }
  };
}

export function getViewerDevSessionStatus(
  provider?: ViewerDevSessionStatusProvider
): ViewerDevSessionStatus {
  return provider?.getStatus() ?? DISABLED_VIEWER_DEV_SESSION_STATUS;
}
