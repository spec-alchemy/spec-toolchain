const VIEWER_DEV_SESSION_ROUTE_PATH = "/__ddd-spec/dev-session";

export const VIEWER_DEV_SESSION_POLL_INTERVAL_MS = 1000;

export interface ViewerDevSessionStatus {
  enabled: boolean;
  buildState: "idle" | "ready" | "failed";
  lastFailureMessage: string | null;
  lastSuccessfulBuildRevision: number;
}

export function resolveViewerDevSessionStatusUrl(
  locationUrl: URL = new URL(window.location.href)
): URL {
  return new URL(VIEWER_DEV_SESSION_ROUTE_PATH, locationUrl);
}

export async function loadViewerDevSessionStatus(
  statusUrl: URL = resolveViewerDevSessionStatusUrl()
): Promise<ViewerDevSessionStatus> {
  const response = await fetch(statusUrl, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(
      `Failed to load ${statusUrl.href} (${response.status} ${response.statusText})`
    );
  }

  return response.json() as Promise<ViewerDevSessionStatus>;
}

export function shouldReloadViewerSpec(
  status: ViewerDevSessionStatus,
  lastLoadedBuildRevision: number
): boolean {
  return (
    status.enabled &&
    status.buildState === "ready" &&
    status.lastSuccessfulBuildRevision > lastLoadedBuildRevision
  );
}

export function getViewerDevSessionMessage(
  status: ViewerDevSessionStatus | null,
  options: {
    isDefaultSpecSource: boolean;
  }
): {
  message: string | null;
  tone: "info" | "warning" | null;
} {
  if (!options.isDefaultSpecSource || !status?.enabled) {
    return {
      message: null,
      tone: null
    };
  }

  if (status.buildState === "failed") {
    return {
      message: `Auto-reload paused after a rebuild failure: ${status.lastFailureMessage ?? "Unknown error"}. Showing the last successful viewer artifact until the next build passes.`,
      tone: "warning"
    };
  }

  return {
    message: "Auto-reload is active for the current domain model workspace.",
    tone: "info"
  };
}
