"use client";

import { DatabaseZap } from "lucide-react";

import { RunsView } from "@/components/runs/runs-view";
import { getSyncRuns } from "@/lib/api/runs";

export function MetaSyncRunsView() {
  return (
    <RunsView
      title="Meta Snapshot Runs"
      description={
        <>
          Every attempt the insights job has made to copy performance data out of Meta
          and into the database. It runs once a day, reads the last few days, and folds
          what changed into the ledger. Everything the Analyst and the Analytics screens
          show is read from what these runs wrote.
        </>
      }
      icon={DatabaseZap}
      fetcher={getSyncRuns}
      queryKey="runs-meta-sync"
      emptyHint="No snapshot runs recorded yet. The job is off unless META_INSIGHTS_SCHEDULE_ENABLED is set, and the Refresh button on Analytics records a run here too."
    />
  );
}
