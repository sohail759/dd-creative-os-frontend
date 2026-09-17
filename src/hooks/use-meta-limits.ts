"use client";

import { useQuery } from "@tanstack/react-query";
import { getRateLimitStatus, type RateLimitStatus } from "@/lib/api/meta-limits";

/**
 * Polled faster while an account is cooling, because that is the only time
 * the number is changing in a way anyone is waiting on. The rest of the time
 * a minute is plenty — this is an ambient gauge, not a dashboard.
 */
export function useRateLimitStatus() {
  return useQuery<RateLimitStatus>({
    queryKey: ["meta-rate-limit"],
    queryFn: getRateLimitStatus,
    refetchOnMount: "always",
    staleTime: 0,
    refetchInterval: (query) =>
      query.state.data?.worst_state === "cooling" ? 10_000 : 60_000,
  });
}
