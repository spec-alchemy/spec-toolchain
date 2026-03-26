import { Card, CardContent } from "@/components/ui/card";
import { InfoTooltip } from "./InfoTooltip";
import { getInspectorDetailHelp } from "../lib/inspector-detail-help";
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
      <section className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Status
        </p>
        <h2 className="text-base font-semibold tracking-[-0.02em] text-foreground">
          No View Loaded
        </h2>
        <p className="text-[13px] leading-6 text-muted-foreground">
          Load a viewer spec to inspect business topology.
        </p>
      </section>
    );
  }

  if (!selection) {
    return (
      <section className="space-y-3">
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Selection
          </p>
          <h2 className="text-base font-semibold tracking-[-0.02em] text-foreground">
            {view.title}
          </h2>
          <p className="text-[13px] leading-6 text-muted-foreground">{view.description}</p>
        </div>
        <div className="grid gap-2">
          <Card className="rounded-2xl border-border/80 bg-white/60 shadow-none backdrop-blur-0">
            <CardContent className="p-3">
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground">
                  How To Read
                </span>
                <InfoTooltip
                  label="How To Read"
                  description={getInspectorDetailHelp("ui.how_to_read", semanticDetailHelp)}
                />
              </div>
              <div className="text-[13px] leading-6 text-foreground/90">
                Select a node or edge to inspect the business facts projected from canonical.
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {selection.type}
        </p>
        <h2 className="text-base font-semibold tracking-[-0.02em] text-foreground">
          {selection.label}
        </h2>
        {selection.summary ? (
          <p className="text-[13px] leading-6 text-muted-foreground">{selection.summary}</p>
        ) : null}
      </div>
      <div className="grid gap-2">
        {selection.details.length > 0 ? (
          selection.details.map((item, index) => (
            <Card
              className="rounded-2xl border-border/80 bg-white/60 shadow-none backdrop-blur-0"
              key={`${selection.type}-${item.semanticKey}-${index}`}
            >
              <CardContent className="p-3">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground">
                    {item.label}
                  </span>
                  <InfoTooltip
                    label={item.label}
                    description={getInspectorDetailHelp(item.semanticKey, semanticDetailHelp)}
                  />
                </div>
                <div className="whitespace-pre-wrap text-[13px] leading-6 text-foreground/90">
                  {item.value}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="rounded-2xl border-border/80 bg-white/60 shadow-none backdrop-blur-0">
            <CardContent className="p-3">
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground">
                  Details
                </span>
                <InfoTooltip
                  label="Details"
                  description={getInspectorDetailHelp("ui.details", semanticDetailHelp)}
                />
              </div>
              <div className="text-[13px] leading-6 text-foreground/90">No details available.</div>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
