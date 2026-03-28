import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getViewerLegendCopy } from "@/lib/viewer-system-copy";
import {
  VIEWER_NODE_COLOR_BY_KIND,
  VIEWER_RELATION_COLOR
} from "@/lib/viewer-colors";
import type { ViewerLocale } from "@/types";

const LEGEND_ITEMS = [
  {
    kind: "context",
    label: "Context",
    className: "kind-context",
    borderColor: VIEWER_NODE_COLOR_BY_KIND.context
  },
  {
    kind: "scenario",
    label: "Scenario",
    className: "kind-scenario",
    borderColor: VIEWER_NODE_COLOR_BY_KIND.scenario
  },
  {
    kind: "scenario-step",
    label: "Scenario Step",
    className: "kind-scenario-step",
    borderColor: VIEWER_NODE_COLOR_BY_KIND["scenario-step"]
  },
  {
    kind: "message",
    label: "Message",
    className: "kind-message",
    borderColor: VIEWER_NODE_COLOR_BY_KIND.message
  },
  {
    kind: "aggregate",
    label: "Aggregate",
    className: "kind-aggregate",
    borderColor: VIEWER_NODE_COLOR_BY_KIND.aggregate
  },
  {
    kind: "lifecycle-state",
    label: "Lifecycle State",
    className: "kind-lifecycle-state",
    borderColor: VIEWER_NODE_COLOR_BY_KIND["lifecycle-state"]
  },
  {
    kind: "shared-type-group",
    label: "Shared Types",
    className: "kind-shared-type-group",
    borderColor: VIEWER_NODE_COLOR_BY_KIND["shared-type-group"]
  },
  { kind: "relation", label: "Relation", className: "kind-relation", borderColor: VIEWER_RELATION_COLOR },
  {
    kind: "actor",
    label: "Actor",
    className: "kind-actor",
    borderColor: VIEWER_NODE_COLOR_BY_KIND.actor
  },
  {
    kind: "system",
    label: "System",
    className: "kind-system",
    borderColor: VIEWER_NODE_COLOR_BY_KIND.system
  },
  {
    kind: "policy",
    label: "Policy",
    className: "kind-policy",
    borderColor: VIEWER_NODE_COLOR_BY_KIND.policy
  },
  {
    kind: "entity",
    label: "Entity",
    className: "kind-entity",
    borderColor: VIEWER_NODE_COLOR_BY_KIND.entity
  },
  {
    kind: "value-object",
    label: "Value Object",
    className: "kind-value-object",
    borderColor: VIEWER_NODE_COLOR_BY_KIND["value-object"]
  },
  { kind: "enum", label: "Enum", className: "kind-enum", borderColor: VIEWER_NODE_COLOR_BY_KIND.enum }
] as const;

interface LegendProps {
  className?: string;
  locale?: ViewerLocale;
  variant?: "overlay" | "stacked";
}

export function Legend({
  className,
  locale = "en",
  variant = "overlay"
}: LegendProps) {
  const isOverlay = variant === "overlay";
  const copy = getViewerLegendCopy(locale);

  return (
    <Card
      className={cn(
        "min-w-0 rounded-2xl border-border/80",
        isOverlay
          ? "w-[15rem] bg-white/92 shadow-viewer"
          : "bg-white/75 shadow-none backdrop-blur-0",
        className
      )}
      data-component="legend"
      data-variant={variant}
    >
      <CardContent className="min-w-0 p-3">
        <div className="space-y-2" data-slot="items">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {copy.title}
          </p>
          <div className="grid gap-2">
            {LEGEND_ITEMS.map((item) => (
              <div
                className="flex items-center gap-2 text-xs text-muted-foreground"
                data-slot="legend-item"
                data-kind={item.kind}
                key={item.label}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-[4px] border bg-white/90 ${item.className}`}
                  style={{ borderColor: item.borderColor }}
                />
                <span>{copy.itemLabels[item.kind] ?? item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
