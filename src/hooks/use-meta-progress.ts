"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useMetaProgress(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["products", id, "meta-progress"],
    queryFn: () => api.getMetaProgress(id),
    enabled,
    refetchInterval: enabled ? 1000 : false,
    retry: false,
  });
}
