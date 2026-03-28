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
import { getViewerAppCopy } from "@/lib/viewer-system-copy";
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
  const [loadingMessage, setLoadingMessage] = useState(() =>
    getWorkspaceLoadingMessage(resolveViewerSpecSource(), resolveViewerLocale().locale)
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
      setLoadingMessage(getWorkspaceLoadingMessage(nextSource, nextLocale));
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
      setErrorMessage(toErrorMessage(error, nextLocale));
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
    setLoadingMessage(getMapPreparationMessage(currentView.title, specSource, viewerLocale));

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

        setErrorMessage(toErrorMessage(error, viewerLocale));
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
  const navigation = getViewerNavigationExperience(viewerSpec, viewerLocale);
  const selectedView = getSelectedViewExperience(viewerSpec, selectedViewId, viewerLocale);
  const appCopy = getViewerAppCopy(viewerLocale);
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
              locale={viewerLocale}
              title={appCopy.loadFailedTitle}
              lines={[
                errorMessage,
                specSource.isDefault
                  ? appCopy.regenerateDefaultViewerData(DEFAULT_DOMAIN_MODEL_ENTRY_PATH)
                  : appCopy.checkExternalViewerArtifact(specSource.label)
              ]}
              primaryViewGuide={navigation.primary}
              activeViewId={selectedView?.id}
            />
          ) : !layoutedView ? (
            <ViewerEmptyState
              locale={viewerLocale}
              title={
                selectedView
                  ? getMapPreparationTitle(selectedView.title, viewerLocale)
                  : appCopy.preparingWorkspaceTitle
              }
              lines={[loadingMessage]}
              primaryViewGuide={navigation.primary}
              activeViewId={selectedView?.id}
            />
          ) : (
            <FlowCanvas
              layoutedView={layoutedView}
              locale={viewerLocale}
              onSelectSelection={setSelection}
            />
          )}
        </Card>

        <Card className="min-h-0 min-w-0 overflow-hidden" data-slot="sidebar-panel">
          <ScrollArea className="h-full min-w-0">
            <aside className="min-w-0 space-y-4 p-4" data-component="viewer-sidebar">
              <InspectorPanel
                locale={viewerLocale}
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

function toErrorMessage(error: unknown, locale: ViewerLocale): string {
  return error instanceof Error ? error.message : getViewerAppCopy(locale).unknownError;
}

function getDefaultView(views: readonly ViewerViewSpec[]): ViewerViewSpec | null {
  return (
    views.find((view) => view.navigation.default) ??
    [...views].sort((left, right) => left.navigation.order - right.navigation.order)[0] ??
    null
  );
}

function getWorkspaceLoadingMessage(source: ViewerSpecSource, locale: ViewerLocale): string {
  const copy = getViewerAppCopy(locale);

  if (source.isDefault) {
    return copy.loadingDefaultWorkspace(DEFAULT_DOMAIN_MODEL_ENTRY_PATH);
  }

  return copy.loadingExternalWorkspace(source.label);
}

function getMapPreparationMessage(
  viewTitle: string,
  source: ViewerSpecSource,
  locale: ViewerLocale
): string {
  const copy = getViewerAppCopy(locale);

  if (source.isDefault) {
    return copy.preparingDefaultMap(viewTitle, DEFAULT_DOMAIN_MODEL_ENTRY_PATH);
  }

  return copy.preparingExternalMap(viewTitle, source.label);
}

function getMapPreparationTitle(viewTitle: string, locale: ViewerLocale): string {
  return locale === "zh-CN" ? `正在准备 ${viewTitle} 视图` : `Preparing ${viewTitle}`;
}

function getDefaultViewId(views: readonly ViewerViewSpec[]): string {
  return getDefaultView(views)?.id ?? "";
}
