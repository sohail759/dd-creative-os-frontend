"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

export function usePageHealth(brand = "numy") {
  return useQuery({
    queryKey: ["page-health", brand],
    queryFn: () => api.getPageHealth(brand),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRefreshPageHealth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (brand?: string) => api.refreshPageHealth(brand),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["page-health"] });
      if (data.success) {
        toast("success", "Page health refreshed", data.message);
      } else {
        toast("error", "Page health refresh failed", data.message);
      }
    },
    onError: (error: Error) => {
      toast("error", "Page health refresh failed", error.message);
    },
  });
}
