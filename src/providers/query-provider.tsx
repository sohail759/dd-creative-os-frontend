"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/**
 * Query defaults.
 *
 * The previous config was three lines — `staleTime: 30_000`, `retry: 1`,
 * `refetchOnWindowFocus: false` — which left several things at values that
 * are wrong for this app:
 *
 *   - **`gcTime` at its 5-minute default** threw cached pages away while the
 *     user was still working, so returning to Creatives refetched a list that
 *     had not changed.
 *   - **`retry: 1` on every failure** retried 401s and 422s, doubling the
 *     load exactly when the server was already saying no. A retry only helps
 *     a request that might succeed next time.
 *   - **`refetchOnReconnect` left on** meant every mounted query fired at
 *     once when a laptop woke up.
 *   - **No `refetchOnMount: false`** meant navigating back to a page refetched
 *     data that was still inside its `staleTime`.
 *   - **No mutation policy.** An upload creates real objects in a Meta ad
 *     account; a silent automatic retry could create a second ad.
 *
 * Per-query overrides still win, but note that `staleTime: 0` alone does NOT
 * defeat `refetchOnMount: false` — a remounted query serves cache and does
 * not refetch, however stale it is. A live query must say
 * `refetchOnMount: "always"` explicitly. The run-progress hooks set `staleTime: 0`
 * and their own `refetchInterval`, because for those a cached value is never
 * the point.
 */
function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Long enough that moving between pages does not refetch, short
        // enough that a background refetch is never far away.
        staleTime: 60_000,
        // Keep data for a working session so back-navigation is instant.
        gcTime: 10 * 60_000,
        // Only retry what could plausibly succeed on a second attempt. A 4xx
        // is the server stating a fact; asking again just costs a round trip.
        retry: (failureCount, error) => {
          const status = (error as { status?: number } | null)?.status;
          if (typeof status === "number" && status >= 400 && status < 500) {
            return false;
          }
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
        // Tab focus is not a signal that data changed; anything needing
        // freshness polls for it explicitly.
        refetchOnWindowFocus: false,
        // Waking from sleep would otherwise fire every mounted query at once.
        refetchOnReconnect: false,
        // Honour staleTime on navigation instead of refetching on every mount.
        refetchOnMount: false,
      },
      mutations: {
        // Not idempotent: uploads create real Meta objects.
        retry: false,
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  // Created once per browser session, inside state so a re-render never
  // swaps the client and drops every cache with it.
  const [client] = useState(makeClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
