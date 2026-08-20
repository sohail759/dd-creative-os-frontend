import { cn } from "@/lib/utils";
import { STATUS_LABELS, type CreativeStatus } from "@/lib/api/types";

const STATUS_STYLES: Record<CreativeStatus, string> = {
  not_started: "bg-white/5 text-muted border-white/10",
  in_progress: "bg-accent-dim text-accent border-accent/30",
  checkpoint: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  revision: "bg-warning/10 text-warning border-warning/30",
};

const DOT_STYLES: Record<CreativeStatus, string> = {
  not_started: "bg-faint",
  in_progress: "bg-accent animate-pulse",
  checkpoint: "bg-sky-400",
  revision: "bg-warning",
};

export function StatusBadge({
  status,
  className,
}: {
  status: CreativeStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        STATUS_STYLES[status],
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          DOT_STYLES[status],
        )}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}
