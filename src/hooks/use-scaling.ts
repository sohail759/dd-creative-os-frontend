"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  decideProposal,
  decideSelection,
  executeProposal,
  getPolicy,
  listProposals,
  proposalCounts,
  runPlan,
  updatePolicy,
  type BulkResult,
  type ProposalPage,
  type ScalingPolicy,
  type ScalingRun,
  listRuns,
} from "@/lib/api/scaling";
import { useToast } from "@/components/ui/toast";

/**
 * `refetchOnMount: "always"` throughout, for the same reason the pages hooks
 * use it: the app sets `refetchOnMount: false` globally, and an approval list
 * showing cached rows after someone else decided them is worse than a spinner.
 */

export function useScalingPolicy(brand: string) {
  return useQuery<ScalingPolicy>({
    queryKey: ["scaling-policy", brand],
    queryFn: () => getPolicy(brand),
    enabled: Boolean(brand),
    refetchOnMount: "always",
    staleTime: 0,
  });
}

export function useUpdatePolicy(brand: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (changes: Partial<ScalingPolicy>) => updatePolicy(brand, changes),
    onSuccess: () => {
      toast("success", "Rules saved", `Ad Scaling rules updated for ${brand}.`);
      queryClient.invalidateQueries({ queryKey: ["scaling-policy", brand] });
    },
    // The API refuses rather than coerces, so the message names the field.
    onError: (error: Error) => toast("error", "Could not save", error.message),
  });
}

export function useProposals(params: {
  brand?: string;
  status?: string[];
  min_purchases?: number;
  max_cpa?: number;
  limit?: number;
  offset?: number;
}) {
  return useQuery<ProposalPage>({
    queryKey: ["scaling-proposals", params],
    queryFn: () => listProposals(params),
    refetchOnMount: "always",
    staleTime: 0,
    placeholderData: (previous) => previous,
  });
}

export function useProposalCounts(brand?: string) {
  return useQuery({
    queryKey: ["scaling-proposal-counts", brand],
    queryFn: () => proposalCounts(brand),
    refetchOnMount: "always",
    staleTime: 0,
  });
}

function useRefreshProposals() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["scaling-proposals"] });
    queryClient.invalidateQueries({ queryKey: ["scaling-proposal-counts"] });
  };
}

export function useDecideProposal() {
  const refresh = useRefreshProposals();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, decision, note, revision }: {
      id: string;
      decision: "approved" | "rejected" | "revised";
      note?: string;
      revision?: Record<string, string>;
    }) => decideProposal(id, decision, { note, revision }),
    onSuccess: (_result, { decision }) => {
      toast("success", decision === "approved" ? "Approved" :
        decision === "rejected" ? "Rejected" : "Revised",
        decision === "rejected"
          ? "Saved."
          : "Building it on Meta now — created paused, checked, then activated.");
      refresh();
    },
    // A 409 means someone already decided it, which is information, not noise.
    onError: (error: Error) => toast("error", "Could not apply", error.message),
  });
}

export function useDecideSelection() {
  const refresh = useRefreshProposals();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ ids, decision, note }: {
      ids: string[];
      decision: "approved" | "rejected";
      note?: string;
    }) => decideSelection(ids, decision, note ?? ""),
    onSuccess: (result: BulkResult, { ids, decision }) => {
      const verb = decision === "approved" ? "Approved" : "Rejected";
      const tail = decision === "approved" ? " Building them on Meta now." : "";
      if (result.ok) {
        toast("success", `${verb} ${result.applied}`,
          `${result.applied} of ${ids.length} proposals.${tail}`);
      } else {
        // A partial result is the normal case, and hiding the failures would
        // leave someone believing they approved more than they did.
        toast("info", `${verb} ${result.applied} of ${ids.length}`,
          result.failed.slice(0, 2).map((f) => f.reason).join(" · ") ||
          result.reason);
      }
      refresh();
    },
    onError: (error: Error) => toast("error", "Could not apply", error.message),
  });
}

export function useRunPlan(brand: string) {
  const queryClient = useQueryClient();
  const refresh = useRefreshProposals();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (dryRun: boolean) => runPlan(brand, dryRun),
    onSuccess: (result, dryRun) => {
      if (result.skipped) {
        toast("info", "Nothing to propose", result.skipped);
      } else {
        toast("success", dryRun ? "Preview ready" : "Plan saved",
          `${result.proposals.length} proposal${result.proposals.length === 1 ? "" : "s"}${
            result.capped_at ? ` (capped at ${result.capped_at})` : ""}.`);
      }
      refresh();
      queryClient.invalidateQueries({ queryKey: ["scaling-runs"] });
    },
    onError: (error: Error) => toast("error", "Plan failed", error.message),
  });
}

export function useExecuteProposal() {
  const refresh = useRefreshProposals();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => executeProposal(id, false),
    onSuccess: (result) => {
      toast("success", result.activated ? "Ad is live" : "Ad created, paused",
        result.activated
          ? `Created and activated as ${result.created_ad_id}.`
          : `Created as ${result.created_ad_id}. It stays paused until activated.`);
      refresh();
    },
    // A rate limit is not a failure to fix — it is a wait. Saying "could not
    // build" for it would send someone looking for a problem that is not
    // theirs.
    onError: (error: Error) => {
      const limited = /rate limit|refusing new ads|has paused this ad account/i
        .test(error.message);
      toast(
        limited ? "info" : "error",
        limited ? "Still waiting on Meta" : "Could not build the ad",
        error.message,
      );
    },
  });
}


export function useScalingRuns(brand?: string) {
  return useQuery<{ runs: ScalingRun[] }>({
    queryKey: ["scaling-runs", brand],
    queryFn: () => listRuns(brand),
    refetchOnMount: "always",
    staleTime: 0,
  });
}
