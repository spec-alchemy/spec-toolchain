import { startTransition } from "react";
import type { BusinessViewerSpec, ViewerLocale } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
} from "@/components/ui/select";
import {
  getPrimaryModelingFlow,
  getSelectedViewExperience,
  getViewerNavigationExperience
} from "@/lib/view-experience";
import { DEFAULT_DOMAIN_MODEL_ENTRY_PATH } from "@/lib/viewer-constants";
import { getViewerHeaderCopy } from "@/lib/viewer-system-copy";
import { cn } from "@/lib/utils";

interface ViewerHeaderProps {
  currentLocale: ViewerLocale;
  devSessionMessage?: string | null;
  devSessionTone?: "info" | "warning" | null;
  localeFallbackNotice?: string | null;
  viewerSpec: BusinessViewerSpec | null;
  specSourceLabel: string;
  selectedViewId: string;
  onSelectLocale: (nextLocale: ViewerLocale) => void;
  onSelectView: (nextViewId: string) => void;
  onReload: () => void;
}

export function ViewerHeader({
  currentLocale,
  devSessionMessage,
  devSessionTone,
  localeFallbackNotice,
  viewerSpec,
  specSourceLabel,
  selectedViewId,
  onSelectLocale,
  onSelectView,
  onReload
}: ViewerHeaderProps) {
  const copy = getViewerHeaderCopy(currentLocale);
  const navigation = getViewerNavigationExperience(viewerSpec, currentLocale);
  const selectedView = getSelectedViewExperience(viewerSpec, selectedViewId, currentLocale);
  const primaryModelingFlow = getPrimaryModelingFlow(viewerSpec, currentLocale);

  return (
    <header
      className="col-span-full rounded-[20px] border border-border bg-card/90 px-4 py-3 shadow-viewer backdrop-blur"
      data-component="viewer-header"
    >
      <div className="flex flex-col gap-4" data-slot="content">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-1.5" data-slot="title-block">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              {copy.workspaceLabel}
            </p>
            <h1 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
              {viewerSpec?.title ?? copy.titleFallback}
            </h1>
            <p className="max-w-3xl text-[13px] leading-6 text-muted-foreground">
              {viewerSpec?.summary ??
                copy.summaryFallback}
            </p>
            <p
              className="max-w-3xl text-[12px] leading-5 text-muted-foreground"
              data-slot="default-entry"
            >
              {copy.defaultEntryLabel}: {DEFAULT_DOMAIN_MODEL_ENTRY_PATH}
            </p>
            <p
              className="max-w-3xl text-[12px] leading-5 text-muted-foreground"
              data-slot="primary-modeling-flow"
            >
              {copy.primaryModelingFlowLabel}: {primaryModelingFlow}
            </p>
            <p
              className="max-w-3xl break-all text-[12px] leading-5 text-muted-foreground"
              data-slot="viewer-artifact"
            >
              {copy.viewerArtifactLabel}: {specSourceLabel}
            </p>
            {devSessionMessage ? (
              <p
                className={
                  devSessionTone === "warning"
                    ? "max-w-3xl rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] leading-5 text-amber-900"
                    : "max-w-3xl rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] leading-5 text-emerald-900"
                }
                data-slot="dev-session-message"
                data-tone={devSessionTone ?? "info"}
              >
                {devSessionMessage}
              </p>
            ) : null}
            {localeFallbackNotice ? (
              <p
                className="max-w-3xl rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[12px] leading-5 text-sky-900"
                data-slot="locale-fallback-message"
              >
                {localeFallbackNotice}
              </p>
            ) : null}
          </div>

          <div
            className="w-full max-w-[360px] rounded-2xl border border-border/70 bg-white/70 p-3 shadow-sm"
            data-slot="view-selector-panel"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              {copy.viewSelectorLabel}
            </p>
            <div className="mt-2 space-y-3">
              <Select
                value={selectedViewId}
                disabled={!viewerSpec}
                onValueChange={(nextViewId) => {
                  startTransition(() => {
                    onSelectView(nextViewId);
                  });
                }}
              >
                <SelectTrigger className="h-auto min-h-[76px] w-full bg-white/90 px-3 py-3">
                  <div className="flex min-w-0 flex-col items-start text-left">
                    <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                      {selectedView?.tier === "secondary"
                        ? copy.secondaryMapLabel
                        : copy.primaryMapLabel}
                    </span>
                    <span className="min-w-0 text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
                      {selectedView?.title ?? copy.selectViewFallback}
                    </span>
                    <span className="min-w-0 text-[12px] leading-5 text-muted-foreground [overflow-wrap:anywhere]">
                      {selectedView?.question ?? copy.selectViewPrompt}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent className="w-[360px]">
                  {navigation.primary.length > 0 ? (
                    <SelectGroup>
                      <SelectLabel>{copy.primaryMapsGroupLabel}</SelectLabel>
                      {navigation.primary.map((view) => (
                        <SelectItem
                          key={view.id}
                          value={view.id}
                          className="min-h-[64px] items-start py-2.5"
                        >
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="font-medium text-foreground">{view.title}</span>
                            <span className="text-xs leading-5 text-muted-foreground">
                              {view.question}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ) : null}

                  {navigation.secondary.length > 0 ? (
                    <>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel>{copy.secondaryMapsGroupLabel}</SelectLabel>
                        {navigation.secondary.map((view) => (
                          <SelectItem
                            key={view.id}
                            value={view.id}
                            className="min-h-[64px] items-start py-2.5"
                          >
                            <span className="flex min-w-0 flex-col gap-0.5">
                              <span className="font-medium text-foreground">{view.title}</span>
                              <span className="text-xs leading-5 text-muted-foreground">
                                {view.question}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </>
                  ) : null}
                </SelectContent>
              </Select>

              <p
                className="text-[12px] leading-5 text-muted-foreground"
                data-slot="selected-view-question"
              >
                {copy.selectedViewQuestionLabel}{" "}
                <span className="text-foreground">{selectedView?.question}</span>
              </p>

              <div className="space-y-2" data-slot="language-selector-panel">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  {copy.languageLabel}
                </p>
                <Select
                  value={currentLocale}
                  onValueChange={(nextLocale) => {
                    if (nextLocale === "en" || nextLocale === "zh-CN") {
                      onSelectLocale(nextLocale);
                    }
                  }}
                >
                  <SelectTrigger
                    className="h-auto min-h-[56px] w-full bg-white/90 px-3 py-3"
                    data-slot="language-selector"
                  >
                    <div className="flex min-w-0 flex-col items-start text-left">
                      <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                        {copy.viewerLanguageLabel}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {copy.localeLabels[currentLocale]}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>{copy.systemLanguageLabel}</SelectLabel>
                      <SelectItem value="en">{copy.localeLabels.en}</SelectItem>
                      <SelectItem value="zh-CN">{copy.localeLabels["zh-CN"]}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <Button type="button" variant="outline" onClick={onReload} className="w-full">
                {copy.reloadViewerLabel}
              </Button>
            </div>
          </div>
        </div>

        {navigation.primary.length > 0 ? (
          <div className="grid gap-2 lg:grid-cols-4" data-slot="primary-map-tour">
            {navigation.primary.map((view, index) => (
              <div
                key={view.id}
                className={cn(
                  "rounded-2xl border border-border/70 bg-white/58 px-3 py-3 transition-colors",
                  selectedView?.id === view.id && "bg-white/82 shadow-sm"
                )}
                data-slot="primary-map"
                data-state={selectedView?.id === view.id ? "active" : "idle"}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  {copy.primaryTourLabel(index + 1)}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{view.title}</p>
                <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                  {view.question}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
}
