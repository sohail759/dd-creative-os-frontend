"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type Creative,
  type GenerationResponse,
  type GenerateOptions,
} from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { clearGenerating, markGenerating } from "@/hooks/use-products";

export function useGenerateProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      options,
    }: {
      id: string;
      options?: GenerateOptions;
      showErrorToast?: boolean;
    }) => api.generateProduct(id, options),
    onMutate: ({ id }) => {
      // Pin the creative to `in_progress` locally so the progressive pipeline
      // survives refetches while the backend worker catches up.
      markGenerating(id);
    },
    onSuccess: (res: GenerationResponse) => {
      // Optimistically mark the creative as generating; the real terminal
      // state always comes back from the backend on the next poll. Update the
      // list queries (including filtered/infinite variants) and the detail
      // cache synchronously so the progressive pipeline never drops out while
      // the backend worker catches up.
      const generating = {
        generationStatus: "in_progress" as const,
        headlines: [],
        primary_texts: [],
        generatedAt: null,
      };
      queryClient.setQueriesData<Creative[] | { pages: Creative[][] }>(
        { queryKey: ["products"] },
        (old) => {
          if (old == null) return old;
          const mapCreative = (p: Creative) =>
            p.id === res.id ? { ...p, ...generating } : p;
          if (
            typeof old === "object" &&
            old !== null &&
            "pages" in old &&
            Array.isArray(old.pages)
          ) {
            return { ...old, pages: old.pages.map((page) => page.map(mapCreative)) };
          }
          if (Array.isArray(old)) {
            return old.map(mapCreative);
          }
          return old;
        },
      );
      queryClient.setQueryData<Creative>(["products", res.id], (old) =>
        old ? { ...old, ...generating } : old,
      );
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: Error, variables) => {
      // The trigger failed — drop the local pin so the real state shows.
      clearGenerating(variables.id);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      if (variables.showErrorToast !== false) {
        toast("error", "Generation failed", error.message);
      }
    },
  });
}
