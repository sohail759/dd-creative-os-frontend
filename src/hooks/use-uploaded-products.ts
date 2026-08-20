"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useUploadedProducts(brand?: string) {
  return useQuery({
    queryKey: ["uploaded-products", brand ?? "all"],
    queryFn: () => api.getUploadedProducts(brand),
    staleTime: 30_000,
  });
}
