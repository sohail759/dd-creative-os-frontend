"use client";

import { Loader2 } from "lucide-react";
import { useAdDetail } from "@/hooks/use-analytics-insights";

const CURRENCY = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/**
 * One ad's ledger row: lifetime total, the trailing 28-day window, and the
 * daily detail behind it — the same three blocks `meta_ledger` actually
 * stores, shown as three tiles rather than flattened into one number that
 * would hide which period it came from.
 */
export function AdDetailPanel({ brand, adId }: { brand: string; adId: string }) {
  const { data, isLoading, error } = useAdDetail(brand, adId);

  if (isLoading) {
    return <div className="px-8 py-4"><Loader2 className="h-4 w-4 animate-spin text-muted" /></div>;
  }
  if (error || !data) {
    return <p className="px-8 py-4 text-xs text-danger">No ledger row for this ad yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3 px-8 py-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="font-mono">Ad ID: {data.ad_id}</span>
        {data.persona_code && <span>Persona: {data.persona_code}</span>}
        {data.created_time && <span>Launched: {new Date(data.created_time).toLocaleDateString()}</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <LedgerBlock title="Last 28 days" block={data.window_28d} />
        <LedgerBlock title="Lifetime" block={data.lifetime} />
      </div>

      {data.daily.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
            Daily, last {data.daily.length} days
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-xs">
              <thead>
                <tr className="text-faint">
                  <th className="pb-1 pr-3 text-left font-medium">Date</th>
                  <th className="pb-1 pr-3 text-right font-medium">Spend</th>
                  <th className="pb-1 pr-3 text-right font-medium">Purchases</th>
                  <th className="pb-1 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.daily.map((row) => (
                  <tr key={row.date} className="border-t border-border/40">
                    <td className="py-1 pr-3 text-muted">{row.date}</td>
                    <td className="py-1 pr-3 text-right tabular-nums text-foreground">{CURRENCY.format(row.spend ?? 0)}</td>
                    <td className="py-1 pr-3 text-right tabular-nums text-muted">{row.purchases ?? 0}</td>
                    <td className="py-1 text-right tabular-nums text-muted">{CURRENCY.format(row.revenue ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function LedgerBlock({ title, block }: { title: string; block: Record<string, number> }) {
  const spend = block.spend ?? 0;
  const revenue = block.revenue ?? 0;
  const roas = spend > 0 ? revenue / spend : 0;
  return (
    <div className="rounded-xl border border-border/60 bg-panel p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-faint">{title}</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Stat label="Spend" value={CURRENCY.format(spend)} />
        <Stat label="Revenue" value={CURRENCY.format(revenue)} />
        <Stat label="ROAS" value={roas > 0 ? `${roas.toFixed(2)}x` : "—"} />
        <Stat label="Purchases" value={(block.purchases ?? 0).toLocaleString()} />
        <Stat label="Clicks" value={(block.clicks ?? 0).toLocaleString()} />
        <Stat label="Impr." value={(block.impressions ?? 0).toLocaleString()} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wide text-faint">{label}</p>
      <p className="tabular-nums text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
