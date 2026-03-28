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
import { ViewerEmptyState } from "@/components/shell/ViewerEmptyState";
import { ViewerHeader } from "@/components/shell/ViewerHeader";
import { layoutViewerView, type LayoutedView } from "@/lib/layout";
import {
  getSelectedViewExperience,
  getViewerNavigationExperience
} from "@/lib/view-experience";
import {
  loadViewerSpec,
  resolveViewerSpecSource,
  type ViewerSpecSource
} from "@/lib/load-viewer-spec";
import {
  resolveViewerLocale,
  syncViewerLocaleUrl,
  writeViewerLocalePreference
} from "@/lib/viewer-locale";
import {
  getViewerDevSessionMessage,
  loadViewerDevSessionStatus,
  shouldReloadViewerSpec,
  VIEWER_DEV_SESSION_POLL_INTERVAL_MS,
  type ViewerDevSessionStatus
} from "@/lib/viewer-dev-session";
import { DEFAULT_DOMAIN_MODEL_ENTRY_PATH } from "@/lib/viewer-constants";
import type {
  BusinessViewerSpec,
  InspectorSelection,
  ViewerLocale,
  ViewerViewSpec
} from "@/types";

const EMPTY_SEMANTIC_DETAIL_HELP: Readonly<Record<string, string>> = {};

export default function App() {
  const [viewerSpec, setViewerSpec] = useState<BusinessViewerSpec | null>(null);
  const [viewerLocale, setViewerLocale] = useState<ViewerLocale>(() => resolveViewerLocale().locale);
  const [specSource, setSpecSource] = useState<ViewerSpecSource>(() => resolveViewerSpecSource());
  const [specSourceLabel, setSpecSourceLabel] = useState(() => resolveViewerSpecSource().label);
  const [specFallbackNotice, setSpecFallbackNotice] = useState<string | null>(null);
  const [selectedViewId, setSelectedViewId] = useState("");
  const deferredViewId = useDeferredValue(selectedViewId);
  const [layoutedView, setLayoutedView] = useState<LayoutedView | null>(null);
  const [selection, setSelection] = useState<InspectorSelection | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(
    `Loading the domain model workspace from ${DEFAULT_DOMAIN_MODEL_ENTRY_PATH}...`
  );
  const [devSessionStatus, setDevSessionStatus] = useState<ViewerDevSessionStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lastLoadedBuildRevisionRef = useRef(0);
  const pendingBuildRevisionRef = useRef<number | null>(null);
  const stopDevSessionPollingRef = useRef(false);

  useEffect(() => {
    stopDevSessionPollingRef.current = false;
    syncViewerLocaleUrl(viewerLocale, {
      history: window.history
    });
    void refreshViewerSpec({
      locale: viewerLocale
    });
  }, []);

  async function refreshViewerSpec(
    options: { loadedBuildRevision?: number; locale?: ViewerLocale } = {}
  ): Promise<void> {
    const nextLocale = options.locale ?? viewerLocale;

    try {
      const nextSource = resolveViewerSpecSource();

      syncViewerLocaleUrl(nextLocale, {
        history: window.history
      });
      setViewerLocale(nextLocale);
      setSpecSource(nextSource);
      setSpecSourceLabel(nextSource.label);
      setSpecFallbackNotice(null);
      setLoadingMessage(getWorkspaceLoadingMessage(nextSource));
      const loadResult = await loadViewerSpec({
        locale: nextLocale,
        source: nextSource
      });
      const nextSpec = loadResult.spec;

      setViewerSpec(nextSpec);
      setSpecSourceLabel(loadResult.loadedLabel);
      setSpecFallbackNotice(loadResult.fallback?.notice ?? null);
      setSelectedViewId((current) =>
        nextSpec.views.some((view) => view.id === current)
          ? current
          : getDefaultViewId(nextSpec.views)
      );
      setErrorMessage(null);

      if (typeof options.loadedBuildRevision === "number") {
        lastLoadedBuildRevisionRef.current = options.loadedBuildRevision;
      }
    } catch (error: unknown) {
      setSpecFallbackNotice(null);
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

  const handleSelectLocale = useEffectEvent((nextLocale: ViewerLocale): void => {
    writeViewerLocalePreference(nextLocale);
    syncViewerLocaleUrl(nextLocale, {
      history: window.history
    });
    setViewerLocale(nextLocale);
    void refreshViewerSpec({
      locale: nextLocale
    });
  });

  useEffect(() => {
    if (!viewerSpec) {
      return;
    }

    const currentView =
      viewerSpec.views.find((view) => view.id === deferredViewId) ??
      getDefaultView(viewerSpec.views);

    if (!currentView) {
      return;
    }

    let cancelled = false;
    setLayoutedView(null);
    setSelection(null);
    setLoadingMessage(getMapPreparationMessage(currentView.title, specSource));

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
  }, [viewerSpec, deferredViewId, specSource]);

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

  const currentView =
    viewerSpec?.views.find((view) => view.id === deferredViewId) ??
    (viewerSpec ? getDefaultView(viewerSpec.views) : null);
  const navigation = getViewerNavigationExperience(viewerSpec);
  const selectedView = getSelectedViewExperience(viewerSpec, selectedViewId);
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
          currentLocale={viewerLocale}
          devSessionMessage={devSessionMessage.message}
          devSessionTone={devSessionMessage.tone}
          localeFallbackNotice={specFallbackNotice}
          viewerSpec={viewerSpec}
          specSourceLabel={specSourceLabel}
          selectedViewId={selectedViewId}
          onSelectLocale={handleSelectLocale}
          onSelectView={setSelectedViewId}
          onReload={() => {
            void refreshViewerSpec({
              locale: viewerLocale
            });
          }}
        />

        <Card className="min-h-0 overflow-hidden" data-slot="canvas-panel">
          {errorMessage ? (
            <ViewerEmptyState
              title="Viewer Load Failed"
              lines={[
                errorMessage,
                specSource.isDefault
                  ? `Run \`ddd-spec build\` or \`npm run repo:build\` to regenerate viewer data from ${DEFAULT_DOMAIN_MODEL_ENTRY_PATH}.`
                  : `Check the external viewer artifact: ${specSource.label}`
              ]}
              primaryViewGuide={navigation.primary}
              activeViewId={selectedView?.id}
            />
          ) : !layoutedView ? (
            <ViewerEmptyState
              title={
                selectedView ? `Preparing ${selectedView.title}` : "Preparing Domain Model Workspace"
              }
              lines={[loadingMessage]}
              primaryViewGuide={navigation.primary}
              activeViewId={selectedView?.id}
            />
          ) : (
            <FlowCanvas
              layoutedView={layoutedView}
              onSelectSelection={setSelection}
            />
          )}
        </Card>

        <Card className="min-h-0 min-w-0 overflow-hidden" data-slot="sidebar-panel">
          <ScrollArea className="h-full min-w-0">
            <aside className="min-w-0 space-y-4 p-4" data-component="viewer-sidebar">
              <InspectorPanel
                view={currentView as ViewerViewSpec | null}
                selection={selection}
                semanticDetailHelp={
                  viewerSpec?.detailHelp.semantic ?? EMPTY_SEMANTIC_DETAIL_HELP
                }
              />
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

function getDefaultView(views: readonly ViewerViewSpec[]): ViewerViewSpec | null {
  return (
    views.find((view) => view.navigation.default) ??
    [...views].sort((left, right) => left.navigation.order - right.navigation.order)[0] ??
    null
  );
}

function getWorkspaceLoadingMessage(source: ViewerSpecSource): string {
  if (source.isDefault) {
    return `Loading the domain model workspace from ${DEFAULT_DOMAIN_MODEL_ENTRY_PATH}...`;
  }

  return `Loading viewer data from ${source.label}...`;
}

function getMapPreparationMessage(viewTitle: string, source: ViewerSpecSource): string {
  if (source.isDefault) {
    return `Preparing the ${viewTitle} map from ${DEFAULT_DOMAIN_MODEL_ENTRY_PATH}...`;
  }

  return `Preparing the ${viewTitle} map from ${source.label}...`;
}

function getDefaultViewId(views: readonly ViewerViewSpec[]): string {
  return getDefaultView(views)?.id ?? "";
}
