"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

export function useAnalytics(brand = "numy", limit = 30, offset = 0) {
  return useQuery({
    queryKey: ["analytics", brand, limit, offset],
    queryFn: () => api.getAnalytics(brand, limit, offset),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFetchAllAnalytics() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (brand?: string) => api.fetchBulkAnalytics(brand),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      if (data.success) {
        toast("success", "Analytics refreshed", data.message);
      } else {
        toast("info", "Partial refresh", data.message);
      }
    },
    onError: (error: Error) => {
      toast("error", "Analytics refresh failed", error.message);
    },
  });
}
