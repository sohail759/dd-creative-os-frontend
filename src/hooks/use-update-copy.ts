"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type Creative,
  type CreativeCopyUpdate,
} from "@/lib/api";
import { useToast } from "@/components/ui/toast";

/**
 * Persist an admin-edited headlines / primary-text set for a creative.
 * The backend writes these back into the MongoDB `generation` subdocument.
 */
export function useUpdateCreativeCopy() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: CreativeCopyUpdate;
    }) => api.updateCreativeCopy(id, payload),
    onSuccess: (updated: Creative, variables) => {
      queryClient.setQueryData<Creative>(
        ["products", variables.id],
        updated,
      );
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast("success", "Copy saved", "Edits written to the creative.");
    },
    onError: (error: Error) => {
      toast("error", "Could not save copy", error.message);
    },
  });
}
