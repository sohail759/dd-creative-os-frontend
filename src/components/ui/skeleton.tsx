import { cn } from "@/lib/utils";

export function Skeleton({
  className,
}: {
  className?: string;
}) {
  return <div className={cn("skeleton rounded-lg bg-white/5", className)} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-panel p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-3 w-40" />
      <Skeleton className="mt-2 h-3 w-32" />
      <Skeleton className="mt-5 h-20 w-full" />
    </div>
  );
}
