"use client";

import {
  DollarSign, Eye, MousePointerClick, ShoppingCart, Target, TrendingUp, Repeat,
} from "lucide-react";
import type { Kpis } from "@/lib/api/analytics-insights";
import { cn } from "@/lib/utils";

const CURRENCY = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const CURRENCY_2 = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NUM = new Intl.NumberFormat(undefined);

type Tile = {
  label: string;
  value: string;
  icon: typeof DollarSign;
  emphasis?: "accent" | "good" | "bad";
};

/**
 * Six tiles, ranked by what a media buyer actually checks first: spend and
 * revenue anchor the row because everything else is a ratio of those two;
 * ROAS gets its own color, since it is the one number that says "is this
 * working" at a glance, before anyone reads the rest.
 */
export function KpiRow({ kpis }: { kpis: Kpis }) {
  const tiles: Tile[] = [
    { label: "Spend", value: CURRENCY.format(kpis.spend), icon: DollarSign },
    { label: "Revenue", value: CURRENCY.format(kpis.revenue), icon: TrendingUp },
    {
      label: "ROAS", value: kpis.roas > 0 ? `${kpis.roas.toFixed(2)}x` : "—", icon: Target,
      emphasis: kpis.roas >= 2 ? "good" : kpis.roas > 0 && kpis.roas < 1 ? "bad" : undefined,
    },
    { label: "Purchases", value: NUM.format(kpis.purchases), icon: ShoppingCart },
    { label: "Cost / Purchase", value: kpis.cost_per_purchase > 0 ? CURRENCY_2.format(kpis.cost_per_purchase) : "—", icon: Repeat },
    { label: "Impressions", value: NUM.format(kpis.impressions), icon: Eye },
    { label: "Clicks", value: NUM.format(kpis.clicks), icon: MousePointerClick },
    { label: "CTR", value: kpis.ctr > 0 ? `${kpis.ctr.toFixed(2)}%` : "—", icon: Target },
    { label: "CPC", value: kpis.cpc > 0 ? CURRENCY_2.format(kpis.cpc) : "—", icon: DollarSign },
    { label: "CPM", value: kpis.cpm > 0 ? CURRENCY_2.format(kpis.cpm) : "—", icon: DollarSign },
    { label: "Frequency", value: kpis.frequency > 0 ? `${kpis.frequency.toFixed(2)}x` : "—", icon: Repeat },
    { label: "Checkouts", value: NUM.format(kpis.initiated_checkouts), icon: ShoppingCart },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <div
            key={tile.label}
            className={cn(
              "rounded-2xl border bg-panel p-4 transition-colors",
              tile.emphasis === "good" && "border-success/30",
              tile.emphasis === "bad" && "border-danger/30",
              !tile.emphasis && "border-border",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">
                {tile.label}
              </span>
              <Icon
                className={cn(
                  "h-3.5 w-3.5",
                  tile.emphasis === "good" ? "text-success"
                  : tile.emphasis === "bad" ? "text-danger"
                  : "text-muted",
                )}
              />
            </div>
            <p
              className={cn(
                "mt-2 text-xl font-bold tabular-nums",
                tile.emphasis === "good" ? "text-success"
                : tile.emphasis === "bad" ? "text-danger"
                : "text-foreground",
              )}
            >
              {tile.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
