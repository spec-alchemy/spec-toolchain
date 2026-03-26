import { Separator } from "@/components/ui/separator";
import {
  VIEWER_NODE_COLOR_BY_KIND,
  VIEWER_RELATION_COLOR
} from "@/lib/viewer-colors";

export function Legend() {
  const items = [
    {
      kind: "process-group",
      label: "Process Group",
      className: "kind-process-group",
      borderColor: VIEWER_NODE_COLOR_BY_KIND["process-group"]
    },
    {
      kind: "aggregate-group",
      label: "Aggregate",
      className: "kind-aggregate-group",
      borderColor: VIEWER_NODE_COLOR_BY_KIND["aggregate-group"]
    },
    {
      kind: "type-group",
      label: "Shared Types",
      className: "kind-type-group",
      borderColor: VIEWER_NODE_COLOR_BY_KIND["type-group"]
    },
    { kind: "relation", label: "Relation", className: "kind-relation", borderColor: VIEWER_RELATION_COLOR },
    { kind: "stage", label: "Stage", className: "kind-stage", borderColor: VIEWER_NODE_COLOR_BY_KIND.stage },
    {
      kind: "final-stage",
      label: "Final Stage",
      className: "kind-final-stage",
      borderColor: VIEWER_NODE_COLOR_BY_KIND["final-stage"]
    },
    {
      kind: "aggregate-state",
      label: "Aggregate State",
      className: "kind-aggregate-state",
      borderColor: VIEWER_NODE_COLOR_BY_KIND["aggregate-state"]
    },
    {
      kind: "command",
      label: "Command",
      className: "kind-command",
      borderColor: VIEWER_NODE_COLOR_BY_KIND.command
    },
    { kind: "event", label: "Event", className: "kind-event", borderColor: VIEWER_NODE_COLOR_BY_KIND.event },
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

  return (
    <section className="space-y-3" data-component="legend">
      <Separator />
      <div className="space-y-2" data-slot="items">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Legend
        </p>
        <div className="grid gap-2">
          {items.map((item) => (
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
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
