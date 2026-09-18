"use client";

import { useSyncExternalStore } from "react";
import { localTime, parseInstant } from "@/components/pages/shared";
import { cn } from "@/lib/utils";

/**
 * How long is left, as a running clock.
 *
 * "Expires soon" answered the wrong question. Someone deciding whether to
 * work through a list needs to know whether they have twenty minutes or two
 * days, and a badge that flips on at six hours tells them neither.
 *
 * Ticks every second so the minutes are honest; shares one timer across the
 * page rather than starting one per row.
 */

const listeners = new Set<() => void>();
let now = 0;
let timer: number | null = null;

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  if (timer === null) {
    now = Date.now();
    timer = window.setInterval(() => {
      now = Date.now();
      listeners.forEach((listener) => listener());
    }, 1000);
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  };
}

const read = () => (now === 0 ? (now = Date.now()) : now);
const readOnServer = () => 0;

/** `47:12` — hours and minutes, counting days into the hours. */
function clock(msLeft: number): string {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function ExpiresIn({ at }: { at?: string | null }) {
  const tick = useSyncExternalStore(subscribe, read, readOnServer);
  const date = parseInstant(at);
  if (!date) return null;

  // Server-rendered: no shared clock yet, so show the instant rather than a
  // countdown computed against a clock the server does not have.
  if (!tick) {
    return <span className="text-faint">Expires {localTime(at)}</span>;
  }

  const msLeft = date.getTime() - tick;
  if (msLeft <= 0) {
    return <span className="font-semibold text-danger">Expired</span>;
  }

  const hoursLeft = msLeft / 3_600_000;
  return (
    <span
      title={`Expires at ${localTime(at)}`}
      className={cn(
        "tabular-nums",
        hoursLeft <= 6 ? "font-semibold text-warning" : "text-faint",
      )}
    >
      Expires after {clock(msLeft)}
    </span>
  );
}
