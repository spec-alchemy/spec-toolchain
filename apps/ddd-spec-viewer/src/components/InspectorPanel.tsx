import { Card, CardContent } from "@/components/ui/card";
import { InfoTooltip } from "./InfoTooltip";
import { DetailValueRenderer } from "./DetailValueRenderer";
import { getInspectorDetailHelp } from "../lib/inspector-detail-help";
import { getPrimaryModelingPath, getViewExperience } from "../lib/view-experience";
import type { InspectorSelection, ViewerViewSpec } from "../types";

interface InspectorPanelProps {
  view: ViewerViewSpec | null;
  selection: InspectorSelection | null;
  semanticDetailHelp: Readonly<Record<string, string>>;
}

export function InspectorPanel({
  view,
  selection,
  semanticDetailHelp
}: InspectorPanelProps) {
  if (!view) {
    return (
      <section className="min-w-0 space-y-2" data-component="inspector-panel" data-state="no-view">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Status
        </p>
        <h2 className="text-base font-semibold tracking-[-0.02em] text-foreground">
          No View Loaded
        </h2>
        <p className="text-[13px] leading-6 text-muted-foreground [overflow-wrap:anywhere]">
          Load a viewer spec to inspect the default modeling path: {getPrimaryModelingPath(null)}.
        </p>
      </section>
    );
  }

  const viewExperience = getViewExperience(view);

  if (!selection) {
    return (
      <section
        className="min-w-0 space-y-3"
        data-component="inspector-panel"
        data-state="no-selection"
      >
        <div className="min-w-0 space-y-2" data-slot="selection-summary">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {view.navigation.tier === "primary" ? "Primary Map" : "Secondary Map"}
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
                  Question This Map Answers
                </span>
                <InfoTooltip
                  label="Question This Map Answers"
                  description={getInspectorDetailHelp("ui.view_question", semanticDetailHelp)}
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
                  How To Read
                </span>
                <InfoTooltip
                  label="How To Read"
                  description={getInspectorDetailHelp("ui.how_to_read", semanticDetailHelp)}
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
                    description={getInspectorDetailHelp(item.semanticKey, semanticDetailHelp)}
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
                  Details
                </span>
                <InfoTooltip
                  label="Details"
                  description={getInspectorDetailHelp("ui.details", semanticDetailHelp)}
                />
              </div>
              <div className="min-w-0 text-[13px] leading-6 text-foreground/90 [overflow-wrap:anywhere]">
                No details available.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
