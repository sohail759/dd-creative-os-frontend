"use client";

import { Bot } from "lucide-react";

import { RunsView } from "@/components/runs/runs-view";
import { getAnalystRuns } from "@/lib/api/runs";

export function AnalystRunsView() {
  return (
    <RunsView
      title="Analyst Agent Runs"
      description={
        <>
          Every pass the Analyst has made over a brand. A pass refreshes the brand&apos;s
          insights, reads the stored performance, then classifies each concept in turn and
          writes learnings, value blocks and the verdict back to Notion. It runs at the end
          of the week, and one pass covers every concept the brand has in scope.
        </>
      }
      icon={Bot}
      fetcher={getAnalystRuns}
      queryKey="runs-analyst"
      emptyHint="No Analyst passes recorded yet. The weekly schedule is off unless ANALYSIS_SCHEDULE_ENABLED is set; running one concept from its Concepts Analysis page does not record here."
    />
  );
}
