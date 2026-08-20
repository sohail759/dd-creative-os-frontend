"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type PromptSetting,
  type PromptSettingUpdate,
} from "@/lib/api";
import { useToast } from "@/components/ui/toast";

export function useCopywriterPrompt() {
  return useQuery({
    queryKey: ["settings", "copywriter_prompt"],
    queryFn: () => api.getCopywriterPrompt(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateCopywriterPrompt() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: PromptSettingUpdate) =>
      api.updateCopywriterPrompt(payload),
    onSuccess: (res: PromptSetting) => {
      queryClient.setQueryData(["settings", "copywriter_prompt"], res);
      toast("success", "Copywriter prompt saved", res.is_default
        ? "Reverted to the built-in default."
        : "Your override will be applied on the next generation.");
    },
    onError: (error: Error) => {
      toast("error", "Could not save prompt", error.message);
    },
  });
}
