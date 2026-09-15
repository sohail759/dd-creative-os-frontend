"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import type { Kpis } from "@/lib/api/analytics-insights";
import { Badge } from "@/components/pages/shared";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, "good" | "bad" | "warn" | "muted"> = {
  ACTIVE: "good",
  PAUSED: "muted",
  DISAPPROVED: "bad",
  ARCHIVED: "muted",
  DELETED: "bad",
  UNKNOWN: "muted",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "muted";
  return <Badge tone={tone}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
}

/** A clickable column header that shows which key sorts the table now. */
export function SortHeader({
  label, sortKey, current, onSort, align = "left",
}: {
  label: string;
  sortKey: string;
  current: string;
  onSort: (key: string) => void;
  align?: "left" | "right";
}) {
  const active = current === sortKey;
  return (
    <th
      className={cn(
        "cursor-pointer select-none pb-2 pr-4 transition-colors hover:text-foreground",
        align === "right" && "text-right",
      )}
      onClick={() => onSort(sortKey)}
    >
      <span className={cn("inline-flex items-center gap-1", align === "right" && "flex-row-reverse")}>
        {label}
        {active && (sortKey === "name" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </span>
    </th>
  );
}

/** The compact per-ad KPI strip shown inside an expanded campaign row. */
export function AdKpiRow({ kpis }: { kpis: Kpis }) {
  const cells = [
    { label: "Spend", value: `$${Math.round(kpis.spend).toLocaleString()}` },
    { label: "Revenue", value: `$${Math.round(kpis.revenue).toLocaleString()}` },
    { label: "ROAS", value: kpis.roas > 0 ? `${kpis.roas.toFixed(2)}x` : "—" },
    { label: "Purchases", value: kpis.purchases.toLocaleString() },
    { label: "CTR", value: kpis.ctr > 0 ? `${kpis.ctr.toFixed(2)}%` : "—" },
    { label: "CPC", value: kpis.cpc > 0 ? `$${kpis.cpc.toFixed(2)}` : "—" },
  ];
  return (
    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
      {cells.map((c) => (
        <div key={c.label} className="rounded-lg bg-white/[0.03] px-2.5 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-faint">{c.label}</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
