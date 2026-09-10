"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type MetaProgress } from "@/lib/api";

/** Poll interval while an upload or launch is in flight. */
const ACTIVE_MS = 1500;

/** States that mean the Meta CLI is still working. */
const IN_FLIGHT: ReadonlySet<string> = new Set(["uploading", "launching"]);

/**
 * Live upload/launch progress for one concept.
 *
 * Mirrors `useConceptRun`, deliberately — including the trap that hook
 * documents. This polled on a flat `refetchInterval: enabled ? 1000 : false`,
 * so it hit the API once a second for as long as the caller said "enabled",
 * and stopped the moment the caller said otherwise, regardless of whether
 * Meta was still working.
 *
 * Polling is driven by the run itself now:
 *
 *   - `status === "running"`, or a `meta_state` of uploading/launching, keeps
 *     it going. The server is the authority on whether work is happening.
 *   - `active` covers the gap right after the button is pressed, when the
 *     cached row is still the PREVIOUS finished run. Without it the interval
 *     evaluates against a terminal status, returns false, and the panel shows
 *     the last attempt's ticked steps beside a spinner.
 *   - Otherwise it stops. An idle creative costs nothing.
 *
 * On the running -> terminal edge the creative and product lists are
 * invalidated so the new Meta state appears without a manual refresh.
 */
export function useMetaProgress(
  id: string | undefined,
  options: { enabled?: boolean; active?: boolean } = {},
) {
  const { enabled = true, active = false } = options;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["products", id, "meta-progress"],
    queryFn: () => api.getMetaProgress(id!),
    enabled: Boolean(id) && enabled,
    refetchInterval: (q) => {
      const data = q.state.data as MetaProgress | undefined;
      if (!data) return active ? ACTIVE_MS : false;
      if (data.run?.status === "running") return ACTIVE_MS;
      if (IN_FLIGHT.has(data.meta_state)) return ACTIVE_MS;
      return active ? ACTIVE_MS : false;
    },
    // The point of this query is freshness; a cached value is never useful.
    staleTime: 0,
    // `refetchOnMount` is false globally, and `staleTime: 0` does not override
    // it. Without this the concept page opened on whatever was cached before
    // the upload began and sat there — the progress only appeared after a
    // manual browser refresh.
    refetchOnMount: "always",
    retry: false,
  });

  // Fire once per running -> terminal transition, not on every poll.
  const previous = useRef<string | undefined>(undefined);
  const status = query.data?.run?.status ?? query.data?.meta_state;
  useEffect(() => {
    const was = previous.current;
    previous.current = status;
    if (!id || !status || was === undefined) return;
    const wasRunning = was === "running" || IN_FLIGHT.has(was);
    const stillRunning = status === "running" || IN_FLIGHT.has(status);
    if (wasRunning && !stillRunning) {
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
  }, [status, id, queryClient]);

  return query;
}


/**
 * Every upload and launch attempt for a concept, newest first.
 *
 * `ad_meta_records` kept one row per creative, so a retry overwrote the
 * previous attempt and there was no history. Each attempt is its own
 * document now, which is what lets the page show upload and launch as two
 * separate panels rather than only whichever ran last.
 */
export function useMetaRuns(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["products", id, "meta-runs"],
    queryFn: () => api.getMetaRuns(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 15_000,
    refetchOnMount: "always",
  });
}
