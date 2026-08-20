import { cn } from "@/lib/utils";

export function Chip({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-md border border-border bg-white/5 px-2 py-0.5 text-xs text-muted",
        className,
      )}
    >
      {label}
    </span>
  );
}
