import {
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState
} from "react";
import { Card } from "@/components/ui/card";
import { FlowCanvas } from "@/components/FlowCanvas";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InspectorPanel } from "@/components/InspectorPanel";
import { Legend } from "@/components/Legend";
import { ViewerEmptyState } from "@/components/shell/ViewerEmptyState";
import { ViewerHeader } from "@/components/shell/ViewerHeader";
import { layoutViewerView, type LayoutedView } from "@/lib/layout";
import {
  loadViewerSpec,
  resolveViewerSpecSource,
  type ViewerSpecSource
} from "@/lib/load-viewer-spec";
import {
  getViewerDevSessionMessage,
  loadViewerDevSessionStatus,
  shouldReloadViewerSpec,
  VIEWER_DEV_SESSION_POLL_INTERVAL_MS,
  type ViewerDevSessionStatus
} from "@/lib/viewer-dev-session";
import type {
  BusinessViewerSpec,
  InspectorSelection,
  ViewerViewSpec
} from "@/types";

const EMPTY_SEMANTIC_DETAIL_HELP: Readonly<Record<string, string>> = {};

export default function App() {
  const [viewerSpec, setViewerSpec] = useState<BusinessViewerSpec | null>(null);
  const [specSource, setSpecSource] = useState<ViewerSpecSource>(() => resolveViewerSpecSource());
  const [selectedViewId, setSelectedViewId] = useState("");
  const deferredViewId = useDeferredValue(selectedViewId);
  const [layoutedView, setLayoutedView] = useState<LayoutedView | null>(null);
  const [selection, setSelection] = useState<InspectorSelection | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Loading viewer spec...");
  const [devSessionStatus, setDevSessionStatus] = useState<ViewerDevSessionStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lastLoadedBuildRevisionRef = useRef(0);
  const pendingBuildRevisionRef = useRef<number | null>(null);
  const stopDevSessionPollingRef = useRef(false);

  useEffect(() => {
    stopDevSessionPollingRef.current = false;
    void refreshViewerSpec();
  }, []);

  async function refreshViewerSpec(
    options: { loadedBuildRevision?: number } = {}
  ): Promise<void> {
    try {
      const nextSource = resolveViewerSpecSource();

      setSpecSource(nextSource);
      setLoadingMessage(`Loading viewer spec from ${nextSource.label}...`);
      const nextSpec = await loadViewerSpec(nextSource);

      setViewerSpec(nextSpec);
      setSelectedViewId((current) =>
        nextSpec.views.some((view) => view.id === current)
          ? current
          : (nextSpec.views[0]?.id ?? "")
      );
      setErrorMessage(null);

      if (typeof options.loadedBuildRevision === "number") {
        lastLoadedBuildRevisionRef.current = options.loadedBuildRevision;
      }
    } catch (error: unknown) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      if (typeof options.loadedBuildRevision === "number") {
        pendingBuildRevisionRef.current = null;
      }
    }
  }

  const pollViewerDevSession = useEffectEvent(async (): Promise<void> => {
    if (stopDevSessionPollingRef.current || !specSource.isDefault) {
      return;
    }

    try {
      const nextStatus = await loadViewerDevSessionStatus();

      setDevSessionStatus(nextStatus);

      if (!nextStatus.enabled) {
        stopDevSessionPollingRef.current = true;
        return;
      }

      if (
        shouldReloadViewerSpec(nextStatus, lastLoadedBuildRevisionRef.current) &&
        pendingBuildRevisionRef.current !== nextStatus.lastSuccessfulBuildRevision
      ) {
        pendingBuildRevisionRef.current = nextStatus.lastSuccessfulBuildRevision;
        await refreshViewerSpec({
          loadedBuildRevision: nextStatus.lastSuccessfulBuildRevision
        });
      }
    } catch (error: unknown) {
      stopDevSessionPollingRef.current = true;
    }
  });

  useEffect(() => {
    if (!viewerSpec) {
      return;
    }

    const currentView = viewerSpec.views.find((view) => view.id === deferredViewId) ?? viewerSpec.views[0];

    if (!currentView) {
      return;
    }

    let cancelled = false;
    setLayoutedView(null);
    setSelection(null);
    setLoadingMessage(`Laying out ${currentView.title}...`);

    void layoutViewerView(currentView)
      .then((nextLayout) => {
        if (cancelled) {
          return;
        }

        setLayoutedView(nextLayout);
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setErrorMessage(toErrorMessage(error));
      });

    return () => {
      cancelled = true;
    };
  }, [viewerSpec, deferredViewId]);

  useEffect(() => {
    if (!specSource.isDefault) {
      setDevSessionStatus(null);
      stopDevSessionPollingRef.current = true;
      return;
    }

    stopDevSessionPollingRef.current = false;
    void pollViewerDevSession();

    const intervalId = window.setInterval(() => {
      void pollViewerDevSession();
    }, VIEWER_DEV_SESSION_POLL_INTERVAL_MS);

    return () => {
      stopDevSessionPollingRef.current = true;
      window.clearInterval(intervalId);
    };
  }, [specSource.isDefault]);

  const currentView = viewerSpec?.views.find((view) => view.id === deferredViewId) ?? viewerSpec?.views[0] ?? null;
  const devSessionMessage = getViewerDevSessionMessage(devSessionStatus, {
    isDefaultSpecSource: specSource.isDefault
  });

  return (
    <TooltipProvider delayDuration={120}>
      <div
        className="grid h-full grid-cols-[minmax(0,1fr)_320px] grid-rows-[auto_minmax(0,1fr)] gap-3 p-3 max-[1080px]:grid-cols-1 max-[1080px]:grid-rows-[auto_minmax(420px,1fr)_auto]"
        data-component="viewer-app"
      >
        <ViewerHeader
          devSessionMessage={devSessionMessage.message}
          devSessionTone={devSessionMessage.tone}
          viewerSpec={viewerSpec}
          specSourceLabel={specSource.label}
          selectedViewId={selectedViewId}
          onSelectView={setSelectedViewId}
          onReload={() => {
            void refreshViewerSpec();
          }}
        />

        <Card className="min-h-0 overflow-hidden" data-slot="canvas-panel">
          {errorMessage ? (
            <ViewerEmptyState
              title="Viewer Load Failed"
              lines={[
                errorMessage,
                specSource.isDefault
                  ? "Run `ddd-spec build` or `npm run repo:build` to regenerate the default viewer spec."
                  : `Check the external spec source: ${specSource.label}`
              ]}
            />
          ) : !layoutedView ? (
            <ViewerEmptyState title="Preparing Viewer" lines={[loadingMessage]} />
          ) : (
            <FlowCanvas
              layoutedView={layoutedView}
              onSelectSelection={setSelection}
            />
          )}
        </Card>

        <Card className="min-h-0 overflow-hidden" data-slot="sidebar-panel">
          <ScrollArea className="h-full">
            <aside className="space-y-4 p-4" data-component="viewer-sidebar">
              <InspectorPanel
                view={currentView as ViewerViewSpec | null}
                selection={selection}
                semanticDetailHelp={
                  viewerSpec?.detailHelp.semantic ?? EMPTY_SEMANTIC_DETAIL_HELP
                }
              />
              <Legend />
            </aside>
          </ScrollArea>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}
