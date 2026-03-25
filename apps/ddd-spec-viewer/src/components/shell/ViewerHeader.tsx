import { startTransition } from "react";
import type { BusinessViewerSpec } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

interface ViewerHeaderProps {
  devSessionMessage?: string | null;
  devSessionTone?: "info" | "warning" | null;
  viewerSpec: BusinessViewerSpec | null;
  specSourceLabel: string;
  selectedViewId: string;
  onSelectView: (nextViewId: string) => void;
  onReload: () => void;
}

export function ViewerHeader({
  devSessionMessage,
  devSessionTone,
  viewerSpec,
  specSourceLabel,
  selectedViewId,
  onSelectView,
  onReload
}: ViewerHeaderProps) {
  return (
    <header className="col-span-full rounded-[20px] border border-border bg-card/90 px-4 py-3 shadow-viewer backdrop-blur">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            React Flow + ELK
          </p>
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
            {viewerSpec?.title ?? "DDD Spec Viewer"}
          </h1>
          <p className="max-w-3xl text-[13px] leading-6 text-muted-foreground">
            {viewerSpec?.summary ??
              "Load the generated viewer spec to inspect domain structure, process composition, aggregate lifecycle, and business traces."}
          </p>
          <p className="max-w-3xl break-all text-[12px] leading-5 text-muted-foreground">
            Source: {specSourceLabel}
          </p>
          {devSessionMessage ? (
            <p
              className={
                devSessionTone === "warning"
                  ? "max-w-3xl rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] leading-5 text-amber-900"
                  : "max-w-3xl rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] leading-5 text-emerald-900"
              }
            >
              {devSessionMessage}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2 max-sm:w-full max-sm:flex-wrap">
          <Select
            value={selectedViewId}
            disabled={!viewerSpec}
            onValueChange={(nextViewId) => {
              startTransition(() => {
                onSelectView(nextViewId);
              });
            }}
          >
            <SelectTrigger className="w-[220px] bg-white/90 max-sm:w-full">
              <SelectValue placeholder="Select a view" />
            </SelectTrigger>
            <SelectContent>
              {(viewerSpec?.views ?? []).map((view) => (
                <SelectItem key={view.id} value={view.id}>
                  {view.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button type="button" variant="outline" onClick={onReload}>
            Reload Spec
          </Button>
        </div>
      </div>
    </header>
  );
}
