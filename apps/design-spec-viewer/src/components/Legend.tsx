import { Separator } from "@/components/ui/separator";

export function Legend() {
  const items = [
    { label: "Process Group", className: "kind-process-group", borderColor: "#d7bb74" },
    { label: "Aggregate Group", className: "kind-aggregate-group", borderColor: "#8aac91" },
    { label: "Relation", className: "kind-relation", borderColor: "#9b8c72" },
    { label: "Stage", className: "kind-stage", borderColor: "#7d9fc4" },
    { label: "Final Stage", className: "kind-final-stage", borderColor: "#cf8d76" },
    { label: "Aggregate State", className: "kind-aggregate-state", borderColor: "#6f9f79" },
    { label: "Command", className: "kind-command", borderColor: "#c6a24b" },
    { label: "Event", className: "kind-event", borderColor: "#6f88b8" }
  ] as const;

  return (
    <section className="space-y-3">
      <Separator />
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Legend
        </p>
        <div className="grid gap-2">
          {items.map((item) => (
            <div className="flex items-center gap-2 text-xs text-muted-foreground" key={item.label}>
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
