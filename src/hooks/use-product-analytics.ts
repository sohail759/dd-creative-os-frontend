"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

export function useProductAnalytics(creativeId: string, enabled = true) {
  return useQuery({
    queryKey: ["product-analytics", creativeId],
    queryFn: () => api.getProductAnalytics(creativeId),
    enabled,
    staleTime: 60_000,
  });
}

export function useFetchProductAnalytics() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ creativeId, brand }: { creativeId: string; brand?: string }) =>
      api.fetchProductAnalytics(creativeId, brand),
    onSuccess: (data) => {
      queryClient.setQueryData(["product-analytics", data.creative_id], data);
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      toast("success", "Analytics fetched", `Last updated: ${data.last_fetched_at ?? "just now"}`);
    },
    onError: (error: Error) => {
      toast("error", "Analytics fetch failed", error.message);
    },
  });
}
