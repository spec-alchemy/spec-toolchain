import { Button } from "@/components/ui/button";
import { DEFAULT_DOMAIN_MODEL_ENTRY_PATH } from "@/lib/viewer-constants";
import { getViewerHeaderCopy } from "@/lib/viewer-system-copy";
import { cn } from "@/lib/utils";
import type { ViewerLocale } from "@/types";

interface WorkspaceContextBarProps {
  currentLocale: ViewerLocale;
  devSessionMessage?: string | null;
  devSessionTone?: "info" | "warning" | null;
  localeFallbackNotice?: string | null;
  summary?: string | null;
  specSourceLabel: string;
  primaryModelingFlow: string;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

export function WorkspaceContextBar({
  currentLocale,
  devSessionMessage,
  devSessionTone,
  localeFallbackNotice,
  summary,
  specSourceLabel,
  primaryModelingFlow,
  isExpanded,
  onToggleExpanded
}: WorkspaceContextBarProps) {
  const copy = getViewerHeaderCopy(currentLocale);
  const notices = [
    devSessionMessage
      ? {
          key: "dev-session",
          message: devSessionMessage,
          tone: devSessionTone === "warning" ? "warning" : "info"
        }
      : null,
    localeFallbackNotice
      ? {
          key: "locale-fallback",
          message: localeFallbackNotice,
          tone: "info" as const
        }
      : null
  ].filter((value): value is { key: string; message: string; tone: "info" | "warning" } =>
    value !== null
  );

  return (
    <section
      className="col-span-full rounded-[20px] border border-border bg-card/80 px-4 py-3 shadow-viewer backdrop-blur"
      data-component="workspace-context-bar"
    >
      <div className="flex flex-col gap-3" data-slot="content">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-wrap gap-2" data-slot="workspace-summary">
            <ContextChip label={copy.defaultEntryLabel} value={DEFAULT_DOMAIN_MODEL_ENTRY_PATH} slot="default-entry" />
            <ContextChip
              label={copy.primaryModelingFlowLabel}
              value={primaryModelingFlow}
              slot="primary-modeling-flow"
            />
            <ContextChip label={copy.viewerArtifactLabel} value={specSourceLabel} slot="viewer-artifact" />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggleExpanded}
            className="self-start"
            data-slot="workspace-context-toggle"
            aria-expanded={isExpanded}
          >
            {isExpanded ? copy.hideWorkspaceInfoLabel : copy.showWorkspaceInfoLabel}
          </Button>
        </div>

        {notices.length > 0 ? (
          <div className="flex flex-col gap-2" data-slot="workspace-notices">
            {notices.map((notice) => (
              <p
                key={notice.key}
                className={cn(
                  "rounded-xl border px-3 py-2 text-[12px] leading-5",
                  notice.tone === "warning"
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : "border-sky-200 bg-sky-50 text-sky-900"
                )}
                data-slot={notice.key === "dev-session" ? "dev-session-message" : "locale-fallback-message"}
                data-tone={notice.tone}
              >
                {notice.message}
              </p>
            ))}
          </div>
        ) : null}

        {isExpanded ? (
          <div
            className="grid gap-3 border-t border-border/70 pt-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
            data-slot="workspace-details"
          >
            <div className="min-w-0 space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                {copy.workspaceInfoLabel}
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                {summary ?? copy.summaryFallback}
              </p>
            </div>
            <dl className="grid gap-2 text-sm" data-slot="workspace-metadata">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  {copy.defaultEntryLabel}
                </dt>
                <dd className="mt-1 break-all text-foreground">{DEFAULT_DOMAIN_MODEL_ENTRY_PATH}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  {copy.primaryModelingFlowLabel}
                </dt>
                <dd className="mt-1 text-foreground">{primaryModelingFlow}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  {copy.viewerArtifactLabel}
                </dt>
                <dd className="mt-1 break-all text-foreground">{specSourceLabel}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </div>
    </section>
  );
}

interface ContextChipProps {
  label: string;
  value: string;
  slot: string;
}

function ContextChip({ label, value, slot }: ContextChipProps) {
  return (
    <p
      className="max-w-full rounded-full border border-border/70 bg-white/65 px-3 py-1.5 text-[12px] leading-5 text-muted-foreground"
      data-slot={slot}
    >
      <span className="font-medium text-foreground">{label}:</span> {value}
    </p>
  );
}
