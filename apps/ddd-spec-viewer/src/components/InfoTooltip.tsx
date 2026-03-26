import { CircleHelp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";

interface InfoTooltipProps {
  label: string;
  description: string;
}

export function InfoTooltip({ label, description }: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild={true}>
        <button
          type="button"
          aria-label={`${label}: ${description}`}
          className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#a88e658c] bg-white/85 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          data-component="info-tooltip-trigger"
        >
          <CircleHelp className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end" data-component="info-tooltip-content">
        {description}
      </TooltipContent>
    </Tooltip>
  );
}
