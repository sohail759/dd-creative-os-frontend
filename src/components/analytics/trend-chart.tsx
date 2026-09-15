"use client";

import { useMemo, useState } from "react";
import type { TrendPoint } from "@/lib/api/analytics-insights";
import { cn } from "@/lib/utils";

const WIDTH = 960;
const HEIGHT = 260;
const PAD_LEFT = 56;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

const CURRENCY = new Intl.NumberFormat(undefined, {
  style: "currency", currency: "USD", maximumFractionDigits: 0,
});

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Spend and revenue over the selected window.
 *
 * One linear axis, one currency unit for both series — not a dual-axis
 * chart, which would invite comparing two unrelated scales at a glance.
 * Revenue is drawn on top of spend so the gap between the two lines reads
 * as profit at every point, which is the thing this chart actually exists
 * to show.
 */
export function TrendChart({ trend }: { trend: TrendPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { spendPath, revenuePath, ticks, xFor, yFor, maxValue } = useMemo(() => {
    const values = trend.flatMap((p) => [p.spend, p.revenue]);
    const max = Math.max(1, ...values);
    // A round-ish ceiling so the top gridline reads as a clean number.
    const magnitude = 10 ** Math.floor(Math.log10(max || 1));
    const ceiling = Math.ceil((max * 1.15) / magnitude) * magnitude;

    const innerWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
    const innerHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
    const xFor = (i: number) =>
      trend.length <= 1 ? PAD_LEFT : PAD_LEFT + (i / (trend.length - 1)) * innerWidth;
    const yFor = (v: number) => PAD_TOP + innerHeight - (v / ceiling) * innerHeight;

    const line = (key: "spend" | "revenue") =>
      trend.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(p[key])}`).join(" ");

    const tickCount = 4;
    const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (ceiling / tickCount) * i);

    return { spendPath: line("spend"), revenuePath: line("revenue"), ticks, xFor, yFor, maxValue: ceiling };
  }, [trend]);

  if (trend.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-faint">
        No daily history in this window yet.
      </div>
    );
  }

  const hovered = hoverIndex !== null ? trend[hoverIndex] : null;
  // Show at most ~7 date labels regardless of window length, evenly spaced.
  const labelEvery = Math.max(1, Math.ceil(trend.length / 7));

  return (
    <div className="relative">
      <div className="mb-2 flex items-center gap-4 text-xs">
        <Legend swatch="var(--color-accent)" label="Spend" />
        <Legend swatch="var(--color-type-video)" label="Revenue" />
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Daily spend and revenue trend"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={yFor(t)} y2={yFor(t)}
              stroke="var(--color-border)" strokeWidth={1}
            />
            <text
              x={PAD_LEFT - 8} y={yFor(t)} textAnchor="end" dominantBaseline="middle"
              fontSize={10} fill="var(--color-faint)" className="tabular-nums"
            >
              {CURRENCY.format(t)}
            </text>
          </g>
        ))}

        {trend.map((p, i) =>
          i % labelEvery === 0 ? (
            <text
              key={p.date} x={xFor(i)} y={HEIGHT - 8} textAnchor="middle"
              fontSize={10} fill="var(--color-faint)"
            >
              {formatDate(p.date)}
            </text>
          ) : null,
        )}

        <path d={spendPath} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path d={revenuePath} fill="none" stroke="var(--color-type-video)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {hoverIndex !== null && (
          <line
            x1={xFor(hoverIndex)} x2={xFor(hoverIndex)} y1={PAD_TOP} y2={HEIGHT - PAD_BOTTOM}
            stroke="var(--color-border-strong)" strokeWidth={1}
          />
        )}

        {trend.map((p, i) => (
          <g key={p.date}>
            <circle cx={xFor(i)} cy={yFor(p.spend)} r={hoverIndex === i ? 4 : 0} fill="var(--color-accent)" />
            <circle cx={xFor(i)} cy={yFor(p.revenue)} r={hoverIndex === i ? 4 : 0} fill="var(--color-type-video)" />
            {/* A wide invisible hit target beats hovering the 2px line itself. */}
            <rect
              x={xFor(i) - (WIDTH / trend.length) / 2}
              y={PAD_TOP}
              width={WIDTH / trend.length}
              height={HEIGHT - PAD_TOP - PAD_BOTTOM}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
            />
          </g>
        ))}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-[150px] -translate-x-1/2 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg"
          style={{ left: `${(xFor(hoverIndex!) / WIDTH) * 100}%` }}
        >
          <p className="font-semibold text-foreground">{formatDate(hovered.date)}</p>
          <dl className="mt-1 flex flex-col gap-0.5">
            <Row label="Spend" value={CURRENCY.format(hovered.spend)} color="var(--color-accent)" />
            <Row label="Revenue" value={CURRENCY.format(hovered.revenue)} color="var(--color-type-video)" />
            <Row label="Purchases" value={hovered.purchases.toLocaleString()} />
            <Row label="ROAS" value={hovered.roas.toFixed(2)} />
          </dl>
        </div>
      )}
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted">
      <span className="h-2 w-2 rounded-full" style={{ background: swatch }} />
      {label}
    </span>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={cn("flex items-center gap-1.5 text-faint")}>
        {color && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
        {label}
      </dt>
      <dd className="tabular-nums font-medium text-foreground">{value}</dd>
    </div>
  );
}
