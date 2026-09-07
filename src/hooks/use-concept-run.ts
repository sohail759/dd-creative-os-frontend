"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ConceptVariation, type CopyRun } from "@/lib/api";

/** Poll interval while a run is in flight. */
const ACTIVE_MS = 2000;

const TERMINAL: ReadonlySet<string> = new Set(["ok", "blocked", "failed"]);

/**
 * The most recent copywriting run for a concept.
 *
 * `active` must be true whenever the caller believes a run is under way —
 * the user just pressed Generate, or the creative reads `in_progress`. It is
 * not optional bookkeeping: polling cannot key off the cached status alone,
 * because after any previous run that status is `ok`, the interval evaluates
 * to false, and the query never refetches. The page then keeps rendering the
 * PREVIOUS run — every step ticked — beside a "Generating…" spinner, which is
 * exactly the "steps below the running one are already checked" report.
 *
 * When a run reaches a terminal state, the concept's variations and the
 * product lists are invalidated, so finished copy appears without a manual
 * page refresh.
 */
export function useConceptRun(
  conceptId: string | undefined,
  options: { enabled?: boolean; active?: boolean } = {},
) {
  const { enabled = true, active = false } = options;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["concept-run", conceptId],
    queryFn: () => api.getConceptRun(conceptId!),
    enabled: Boolean(conceptId) && enabled,
    refetchInterval: (q) => {
      const data = q.state.data as CopyRun | undefined;
      if (data?.status === "running") return ACTIVE_MS;
      // Keep polling while the caller says a run is under way, even though
      // the cached row is a finished one — that row is about to be replaced
      // by the new run, and only a refetch will notice.
      return active ? ACTIVE_MS : false;
    },
    staleTime: 0,
  });

  // Fire once per running -> terminal transition.
  const previous = useRef<string | undefined>(undefined);
  const status = query.data?.status;
  useEffect(() => {
    const was = previous.current;
    previous.current = status;
    if (!conceptId || !status) return;
    if (was === "running" && TERMINAL.has(status)) {
      queryClient.invalidateQueries({ queryKey: ["concept-variations", conceptId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
  }, [status, conceptId, queryClient]);

  return query;
}

/** A concept's Level C variations, ENG first. */
export function useConceptVariations(
  conceptId: string | undefined,
  enabled = true,
) {
  return useQuery<ConceptVariation[]>({
    queryKey: ["concept-variations", conceptId],
    queryFn: () => api.getConceptVariations(conceptId!),
    enabled: Boolean(conceptId) && enabled,
  });
}

/**
 * Render an ISO-8601 instant in the viewer's own timezone, with the zone
 * shown so a time is never ambiguous.
 *
 * The API always sends an explicit UTC offset; without one the browser would
 * read the timestamp as local and a run could appear to finish in the future.
 */
// Explicit field options, NOT `dateStyle`/`timeStyle`. Those two are
// shorthands that the spec forbids combining with any individual component,
// `timeZoneName` included — pairing them throws
// `TypeError: Invalid option : option` at render time.
const RUN_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZoneName: "short",
};

export function formatRunTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, RUN_TIME_FORMAT).format(at);
  } catch {
    // A locale or engine that rejects the options must not take the page
    // down over a timestamp.
    return at.toISOString();
  }
}

/** "1m 42s" / "8s" — a run's wall-clock duration. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) return "";
  const whole = Math.max(0, Math.round(seconds));
  if (whole < 60) return `${whole}s`;
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}
