import { Card, CardContent } from "@/components/ui/card";
import { InfoTooltip } from "./InfoTooltip";
import { DetailValueRenderer } from "./DetailValueRenderer";
import { getInspectorDetailHelp } from "../lib/inspector-detail-help";
import { getPrimaryModelingFlow, getViewExperience } from "../lib/view-experience";
import { DEFAULT_DOMAIN_MODEL_ENTRY_PATH } from "../lib/viewer-constants";
import { getViewerInspectorCopy } from "../lib/viewer-system-copy";
import type { InspectorSelection, ViewerLocale, ViewerViewSpec } from "../types";

interface InspectorPanelProps {
  locale?: ViewerLocale;
  view: ViewerViewSpec | null;
  selection: InspectorSelection | null;
  semanticDetailHelp: Readonly<Record<string, string>>;
}

export function InspectorPanel({
  locale = "en",
  view,
  selection,
  semanticDetailHelp
}: InspectorPanelProps) {
  const copy = getViewerInspectorCopy(locale);

  if (!view) {
    return (
      <section className="min-w-0 space-y-2" data-component="inspector-panel" data-state="no-view">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {copy.statusLabel}
        </p>
        <h2 className="text-base font-semibold tracking-[-0.02em] text-foreground">
          {copy.noViewTitle}
        </h2>
        <p className="text-[13px] leading-6 text-muted-foreground [overflow-wrap:anywhere]">
          {copy.noViewDescription({
            entryPath: DEFAULT_DOMAIN_MODEL_ENTRY_PATH,
            primaryModelingFlow: getPrimaryModelingFlow(null, locale)
          })}
        </p>
      </section>
    );
  }

  const viewExperience = getViewExperience(view, locale);

  if (!selection) {
    return (
      <section
        className="min-w-0 space-y-3"
        data-component="inspector-panel"
        data-state="no-selection"
      >
        <div className="min-w-0 space-y-2" data-slot="selection-summary">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {view.navigation.tier === "primary" ? copy.primaryMapLabel : copy.secondaryMapLabel}
          </p>
          <h2 className="text-base font-semibold tracking-[-0.02em] text-foreground">
            {view.title}
          </h2>
          <p className="text-[13px] leading-6 text-muted-foreground [overflow-wrap:anywhere]">
            {viewExperience.overview}
          </p>
        </div>
        <div className="grid min-w-0 gap-2" data-slot="detail-list">
          <Card
            className="min-w-0 rounded-2xl border-border/80 bg-white/60 shadow-none backdrop-blur-0"
            data-component="inspector-detail-card"
            data-semantic-key="ui.view_question"
          >
            <CardContent className="min-w-0 p-3">
              <div
                className="mb-2.5 flex min-w-0 items-center gap-1.5 border-b border-border/50 pb-2"
                data-slot="card-header"
              >
                <span className="min-w-0 text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground [overflow-wrap:anywhere]">
                  {copy.viewQuestionLabel}
                </span>
                <InfoTooltip
                  label={copy.viewQuestionLabel}
                  description={getInspectorDetailHelp("ui.view_question", semanticDetailHelp, locale)}
                />
              </div>
              <div className="min-w-0 text-[13px] leading-6 text-foreground/90 [overflow-wrap:anywhere]">
                {viewExperience.question}
              </div>
            </CardContent>
          </Card>
          <Card
            className="min-w-0 rounded-2xl border-border/80 bg-white/60 shadow-none backdrop-blur-0"
            data-component="inspector-detail-card"
            data-semantic-key="ui.how_to_read"
          >
            <CardContent className="min-w-0 p-3">
              <div
                className="mb-2.5 flex min-w-0 items-center gap-1.5 border-b border-border/50 pb-2"
                data-slot="card-header"
              >
                <span className="min-w-0 text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground [overflow-wrap:anywhere]">
                  {copy.howToReadLabel}
                </span>
                <InfoTooltip
                  label={copy.howToReadLabel}
                  description={getInspectorDetailHelp("ui.how_to_read", semanticDetailHelp, locale)}
                />
              </div>
              <div className="min-w-0 text-[13px] leading-6 text-foreground/90 [overflow-wrap:anywhere]">
                {viewExperience.howToRead}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section
      className="min-w-0 space-y-3"
      data-component="inspector-panel"
      data-state="selection"
      data-selection-type={selection.type}
    >
      <div className="min-w-0 space-y-2" data-slot="selection-summary">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {selection.type}
        </p>
        <h2 className="text-base font-semibold tracking-[-0.02em] text-foreground [overflow-wrap:anywhere]">
          {selection.label}
        </h2>
        {selection.summary ? (
          <p className="text-[13px] leading-6 text-muted-foreground [overflow-wrap:anywhere]">
            {selection.summary}
          </p>
        ) : null}
      </div>
      <div className="grid min-w-0 gap-2" data-slot="detail-list">
        {selection.details.length > 0 ? (
          selection.details.map((item, index) => (
            <Card
              className="min-w-0 rounded-2xl border-border/80 bg-white/60 shadow-none backdrop-blur-0"
              key={`${selection.type}-${item.semanticKey}-${index}`}
              data-component="inspector-detail-card"
              data-semantic-key={item.semanticKey}
            >
              <CardContent className="min-w-0 p-3">
                <div
                  className="mb-2.5 flex min-w-0 items-center gap-1.5 border-b border-border/50 pb-2"
                  data-slot="card-header"
                >
                  <span className="min-w-0 text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground [overflow-wrap:anywhere]">
                    {item.label}
                  </span>
                  <InfoTooltip
                    label={item.label}
                    description={getInspectorDetailHelp(item.semanticKey, semanticDetailHelp, locale)}
                  />
                </div>
                <DetailValueRenderer value={item.value} />
              </CardContent>
            </Card>
          ))
        ) : (
          <Card
            className="min-w-0 rounded-2xl border-border/80 bg-white/60 shadow-none backdrop-blur-0"
            data-component="inspector-detail-card"
            data-semantic-key="ui.details"
          >
            <CardContent className="min-w-0 p-3">
              <div
                className="mb-2.5 flex min-w-0 items-center gap-1.5 border-b border-border/50 pb-2"
                data-slot="card-header"
              >
                <span className="min-w-0 text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground [overflow-wrap:anywhere]">
                  {copy.detailsLabel}
                </span>
                <InfoTooltip
                  label={copy.detailsLabel}
                  description={getInspectorDetailHelp("ui.details", semanticDetailHelp, locale)}
                />
              </div>
              <div className="min-w-0 text-[13px] leading-6 text-foreground/90 [overflow-wrap:anywhere]">
                {copy.noDetailsAvailable}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
