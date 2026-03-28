import { cn } from "@/lib/utils";
import { getViewerEmptyStateCopy } from "@/lib/viewer-system-copy";
import type { ViewerLocale } from "@/types";

interface ViewerEmptyStateGuideItem {
  id: string;
  title: string;
  question: string;
}

interface ViewerEmptyStateProps {
  locale?: ViewerLocale;
  title: string;
  lines: readonly string[];
  primaryViewGuide?: readonly ViewerEmptyStateGuideItem[];
  activeViewId?: string;
}

export function ViewerEmptyState({
  locale = "en",
  title,
  lines,
  primaryViewGuide = [],
  activeViewId
}: ViewerEmptyStateProps) {
  const copy = getViewerEmptyStateCopy(locale);

  return (
    <div
      className="grid h-full place-content-center px-6 py-10 text-center"
      data-component="viewer-empty-state"
    >
      <div className="mx-auto max-w-5xl space-y-6" data-slot="content">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        {lines.map((line) => (
          <p
            key={line}
            className="mx-auto max-w-xl text-sm leading-6 text-muted-foreground"
            data-slot="message"
          >
            {line}
          </p>
        ))}

        {primaryViewGuide.length > 0 ? (
          <div className="space-y-3" data-slot="view-tour">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              {copy.primaryMapsLabel}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {primaryViewGuide.map((view, index) => (
                <div
                  key={view.id}
                  className={cn(
                    "rounded-2xl border border-border/70 bg-white/62 px-4 py-3 text-left",
                    activeViewId === view.id && "bg-white/84 shadow-sm"
                  )}
                  data-slot="view-tour-item"
                  data-state={activeViewId === view.id ? "active" : "idle"}
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    {copy.mapLabel(index + 1)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{view.title}</p>
                  <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                    {view.question}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
