import { startTransition } from "react";
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
import { cn } from "@/lib/utils";
import type { ViewerLocale } from "@/types";
import type { ViewerViewExperience } from "@/lib/view-experience";

interface ViewNavigationProps {
  currentLocale: ViewerLocale;
  navigation: {
    primary: readonly ViewerViewExperience[];
    secondary: readonly ViewerViewExperience[];
  };
  selectedView: ViewerViewExperience | null;
  selectedViewId: string;
  onSelectView: (nextViewId: string) => void;
}

export function ViewNavigation({
  currentLocale,
  navigation,
  selectedView,
  selectedViewId,
  onSelectView
}: ViewNavigationProps) {
  const copy = getViewerHeaderCopy(currentLocale);

  return (
    <div
      className="border-b border-border/70 bg-white/50 px-4 py-3"
      data-component="view-navigation"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              {copy.viewSelectorLabel}
            </p>
            <p className="mt-1 text-sm text-muted-foreground" data-slot="selected-view-question">
              {copy.selectedViewQuestionLabel}{" "}
              <span className="text-foreground">
                {selectedView?.question ?? copy.selectViewPrompt}
              </span>
            </p>
          </div>

          {navigation.secondary.length > 0 ? (
            <div className="w-full xl:w-[240px]" data-slot="secondary-view-selector">
              <Select
                value={selectedView?.tier === "secondary" ? selectedViewId : ""}
                onValueChange={(nextViewId) => {
                  if (!nextViewId) {
                    return;
                  }
                  startTransition(() => {
                    onSelectView(nextViewId);
                  });
                }}
              >
                <SelectTrigger className="h-10 w-full bg-white/90">
                  <span className="truncate text-left text-sm font-medium">
                    {selectedView?.tier === "secondary"
                      ? selectedView.title
                      : copy.secondaryViewsLabel}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>{copy.secondaryMapsGroupLabel}</SelectLabel>
                    {navigation.secondary.map((view) => (
                      <SelectItem key={view.id} value={view.id}>
                        {view.title}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2" data-slot="primary-map-tabs">
          {navigation.primary.map((view) => (
            <Button
              key={view.id}
              type="button"
              variant={selectedView?.id === view.id ? "default" : "outline"}
              size="sm"
              onClick={() => {
                startTransition(() => {
                  onSelectView(view.id);
                });
              }}
              className={cn(
                "h-auto min-h-10 rounded-full px-4 py-2 text-left",
                selectedView?.id === view.id && "shadow-sm"
              )}
              data-slot="primary-map-tab"
              data-state={selectedView?.id === view.id ? "active" : "idle"}
            >
              {view.title}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
