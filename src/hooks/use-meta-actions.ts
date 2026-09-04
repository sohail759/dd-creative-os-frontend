"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Creative, type MetaUploadPayload } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

function patchCreative(
  id: string,
  patch: Partial<Creative>,
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.setQueriesData<Creative[] | { pages: Creative[][] }>(
    { queryKey: ["products"] },
    (old) => {
      if (!old) return old;
      const apply = (item: Creative) => (item.id === id ? { ...item, ...patch } : item);
      if (
        typeof old === "object" &&
        old !== null &&
        "pages" in old &&
        Array.isArray(old.pages)
      ) {
        return { ...old, pages: old.pages.map((page) => page.map(apply)) };
      }
      if (Array.isArray(old)) {
        return old.map(apply);
      }
      return old;
    },
  );
  queryClient.setQueryData<Creative>(["products", id], (old) =>
    old ? { ...old, ...patch } : old,
  );
}

export function useUploadOptions(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["products", id, "upload-options"],
    queryFn: () => api.getUploadOptions(id),
    enabled,
  });
}

export function useFrameAssets(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["products", id, "frame-assets"],
    queryFn: () => api.getFrameAssets(id),
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: "always",
  });
}

export function useRefreshFrameAssets(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.getFrameAssets(id, true),
    onSuccess: (data) => {
      queryClient.setQueryData(["products", id, "frame-assets"], data);
    },
  });
}

export function useUploadProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MetaUploadPayload }) =>
      api.uploadProduct(id, payload),
    onMutate: ({ id }) => {
      patchCreative(id, { metaState: "uploading", metaError: null }, queryClient);
    },
    onSuccess: (res) => {
      patchCreative(
        res.id,
        {
          metaState: res.meta_state,
          metaIds: res.meta_ids,
          metaError: res.meta_error ?? null,
        },
        queryClient,
      );
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast("success", "Upload complete", res.message);
    },
    onError: (error: Error, vars) => {
      patchCreative(vars.id, { metaState: "failed", metaError: error.message }, queryClient);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast("error", "Upload failed", error.message);
    },
  });
}

export function useLaunchProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.launchProduct(id),
    onMutate: ({ id }) => {
      patchCreative(id, { metaState: "launching", metaError: null }, queryClient);
    },
    onSuccess: (res) => {
      patchCreative(
        res.id,
        {
          metaState: res.meta_state,
          metaIds: res.meta_ids,
          metaError: res.meta_error ?? null,
        },
        queryClient,
      );
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast("success", "Launch complete", res.message);
    },
    onError: (error: Error, vars) => {
      patchCreative(vars.id, { metaState: "failed", metaError: error.message }, queryClient);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast("error", "Launch failed", error.message);
    },
  });
}

export function useUpdateFrameUrl() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, url }: { id: string; url?: string | null }) =>
      api.updateFrameUrl(id, { url }),
    onSuccess: (res) => {
      patchCreative(
        res.id,
        {
          frameUrl: res.frame_url ?? null,
          frameUrlSource: res.frame_url_source,
        },
        queryClient,
      );
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast("success", "Creative URL saved", "Updated creative video URL.");
    },
    onError: (error: Error) => {
      toast("error", "Creative URL update failed", error.message);
    },
  });
}
