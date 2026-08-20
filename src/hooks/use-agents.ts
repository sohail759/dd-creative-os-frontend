"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type AgentConfig,
  type AgentConfigUpdate,
  type AgentListResponse,
} from "@/lib/api";
import { useToast } from "@/components/ui/toast";

export function useAgents() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: () => api.getAgents(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAgentModels() {
  return useQuery({
    queryKey: ["agents", "models"],
    queryFn: async () => (await api.getAgents()).available_models,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateAgent(agentId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: AgentConfigUpdate) =>
      api.updateAgent(agentId, payload),
    onSuccess: (res: AgentConfig, _vars, _ctx) => {
      // Keep the list cache + this agent's entry fresh.
      queryClient.setQueryData(
        ["agents", agentId],
        res,
      );
      queryClient.setQueryData(
        ["agents"],
        (prev: AgentListResponse | undefined) =>
          prev
            ? {
                ...prev,
                agents: prev.agents.map((a) =>
                  a.id === res.id ? res : a,
                ),
              }
            : prev,
      );
      toast(
        "success",
        `${res.name} saved`,
        res.is_default
          ? "Reverted to built-in defaults."
          : "Your configuration will be used on the next run.",
      );
    },
    onError: (error: Error) => {
      toast("error", "Could not save agent configuration", error.message);
    },
  });
}
