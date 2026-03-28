import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger
} from "@/components/ui/select";
import { getViewerHeaderCopy } from "@/lib/viewer-system-copy";
import type { BusinessViewerSpec, ViewerLocale } from "@/types";

interface AppHeaderProps {
  currentLocale: ViewerLocale;
  currentViewTitle?: string | null;
  devSessionTone?: "info" | "warning" | null;
  viewerSpec: BusinessViewerSpec | null;
  onSelectLocale: (nextLocale: ViewerLocale) => void;
  onReload: () => void;
}

export function AppHeader({
  currentLocale,
  currentViewTitle,
  devSessionTone,
  viewerSpec,
  onSelectLocale,
  onReload
}: AppHeaderProps) {
  const copy = getViewerHeaderCopy(currentLocale);
  const isWarning = devSessionTone === "warning";
  const workspaceStatusLabel =
    isWarning
      ? copy.workspaceStatusWarningLabel
      : copy.workspaceStatusReadyLabel;
  const controlClassName =
    "h-10 rounded-md border-border bg-white/85 text-sm font-medium text-foreground";

  return (
    <header
      className="col-span-full flex min-h-[68px] flex-col gap-3 rounded-[20px] border border-border bg-card/90 px-4 py-3 shadow-viewer backdrop-blur lg:flex-row lg:items-center lg:justify-between"
      data-component="app-header"
    >
      <div
        className="flex min-w-0 w-full flex-1 items-center gap-2 overflow-hidden"
        data-slot="identity"
      >
        <p className="shrink-0 rounded-full bg-white/65 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {copy.workspaceLabel}
        </p>
        <span
          className="h-1 w-1 shrink-0 rounded-full bg-muted-foreground/35"
          aria-hidden="true"
          data-slot="identity-separator"
        />
        <h1 className="truncate text-lg font-semibold tracking-[-0.02em] text-foreground">
          {viewerSpec?.title ?? copy.titleFallback}
        </h1>
        <span
          className="h-1 w-1 shrink-0 rounded-full bg-muted-foreground/35"
          aria-hidden="true"
          data-slot="identity-separator"
        />
        <p className="truncate text-sm text-muted-foreground/80" data-slot="current-view">
          <span className="font-medium text-foreground">
            {currentViewTitle ?? copy.currentViewFallback}
          </span>
        </p>
      </div>

      <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center" data-slot="actions">
        <div className="flex w-full items-center justify-between gap-2 lg:w-auto lg:justify-end" data-slot="toolbar-row">
          <div
            className="inline-flex h-10 shrink-0 items-center gap-2 px-1 text-sm text-muted-foreground"
            data-slot="workspace-status"
            data-tone={isWarning ? "warning" : "info"}
          >
            <span
              className={
                isWarning
                  ? "h-2.5 w-2.5 rounded-full bg-amber-500"
                  : "h-2.5 w-2.5 rounded-full bg-emerald-500"
              }
              data-slot="workspace-status-dot"
              aria-hidden="true"
            />
            <span className="font-medium">{copy.workspaceStatusLabel}</span>
            <span className="text-foreground">{workspaceStatusLabel}</span>
          </div>

          <div
            className="hidden h-6 w-px bg-border/80 lg:block"
            aria-hidden="true"
            data-slot="actions-divider"
          />

          <div className="w-[168px] min-w-[168px]" data-slot="language-selector-panel">
            <Select
              value={currentLocale}
              onValueChange={(nextLocale) => {
                if (nextLocale === "en" || nextLocale === "zh-CN") {
                  onSelectLocale(nextLocale);
                }
              }}
            >
              <SelectTrigger
                className={`w-full ${controlClassName}`}
                data-slot="language-selector"
              >
                <span className="truncate text-left text-sm font-medium">
                  {copy.localeLabels[currentLocale]}
                </span>
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
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onReload}
          className={`w-full lg:w-auto ${controlClassName}`}
          data-slot="reload-button"
        >
          {copy.reloadViewerLabel}
        </Button>
      </div>
    </header>
  );
}
