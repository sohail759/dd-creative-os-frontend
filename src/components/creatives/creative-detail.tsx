"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { Creative } from "@/lib/api";
import { StatusBadge } from "@/components/ui/status-badge";
import { VariationTabs } from "./variation-tabs";
import { GenerationSteps, RunPanel } from "./generation-steps";
import { MetaRunPanel } from "./meta-run-panel";
import { MetaTargetList } from "./meta-target-list";
import { GenerateButton } from "./generate-button";
import { FrameIoMediaGallery } from "./frame-io-media-gallery";
import { MetaControls } from "./meta-controls";
import { ConceptCard } from "./concept-card";
import { displayModel, formatTimestamp } from "@/lib/utils";

const INFO_FIELDS: { label: string; key: keyof InfoData }[] = [
  { label: "Product", key: "product" },
  { label: "Brand", key: "brand" },
  { label: "Status", key: "status" },
  { label: "Angle", key: "angle" },
  { label: "Awareness", key: "awareness" },
  { label: "Audience", key: "audience" },
  { label: "Problem", key: "problem" },
  { label: "Desire", key: "desire" },
  { label: "Hook", key: "hook" },
  { label: "Hypothesis", key: "hypothesis" },
];

type InfoData = {
  product: string;
  brand: string;
  status: React.ReactNode;
  angle?: string | null;
  awareness?: string | null;
  audience?: string | null;
  problem?: string | null;
  desire?: string | null;
  hook?: string | null;
  hypothesis?: string | null;
};

export function CreativeDetailView({
  creative: data,
  back,
}: {
  creative: Creative;
  back: { href: string; label: string };
}) {
  const router = useRouter();

  // Prefer a real history back so the list keeps its scroll position and the
  // status filter; only navigate when there's nothing to go back to.
  function handleBack(e: React.MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(back.href, { scroll: false });
    }
  }

  // Batch -> Concept rule: only concepts carry a `Parent item` relation. Batch
  // / standalone products never own upload state, generated copy, or a generate
  // button — those surfaces are concept-only.
  const isConcept = (data.parentItem?.length ?? 0) > 0;
  const hasCopy = data.headlines.length > 0;
  const info: InfoData = {
    product: data.product,
    brand: data.brand,
    status: <StatusBadge status={data.status} />,
    angle: data.angle,
    awareness: data.awareness,
    audience: data.audience,
    problem: data.problem,
    desire: data.desire,
    hook: data.hook,
    hypothesis: data.hypothesis,
  };

  return (
    <div className="animate-fade-in-up">
      <Link
        href={back.href}
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ChevronRight className="h-4 w-4 rotate-180" />
        {back.label}
      </Link>

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-faint">
            {data.brand}
          </p>
          <h1 className="mt-1 flex flex-wrap items-center gap-3 text-2xl font-bold tracking-tight">
            {data.product}
            {data.name && (
              <span
                title={data.name}
                className="truncate rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-foreground"
              >
                {data.name}
              </span>
            )}
            {data.model && (
              <span className="rounded-md border border-white/5 bg-black/70 px-2 py-1 text-xs font-medium text-white">
                {displayModel(data.model)}
              </span>
            )}
            <StatusBadge status={data.status} />
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-faint">
            {data.lastEditedAt && (
              <span>Edited {formatTimestamp(data.lastEditedAt)}</span>
            )}
            {data.createdAt && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span>Created {formatTimestamp(data.createdAt)}</span>
              </>
            )}
          </div>
        </div>
        {/* {isConcept && data.generationStatus !== "completed" && (
          <GenerateButton creative={data} />
        )} */}
      </div>

      {data.concepts && data.concepts.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-faint">
            Concepts
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.concepts.map((concept) => (
              <ConceptCard key={concept.id} concept={concept} />
            ))}
          </div>
        </section>
      )}

      {/* Upload (meta) controls and Frame.io media gallery are concept-only.
          Batches aggregate concepts and never own upload state or media. */}
      {isConcept && (
        <section className="mt-6">
          <MetaControls creative={data} />
        </section>
      )}

      {isConcept && (
        <section className="mt-4">
          <FrameIoMediaGallery productId={data.id} frameUrl={data.frameUrl} />
        </section>
      )}

      {/* Product information */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-faint">
          Product Information
        </h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INFO_FIELDS.map((field) => {
            const value = info[field.key];
            if (value === null || value === undefined || value === "") return null;
            return (
              <div
                key={field.key}
                className="rounded-xl border border-border bg-panel p-4"
              >
                <dt className="text-xs font-medium uppercase tracking-wider text-faint">
                  {field.label}
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-foreground">
                  {value}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      {/* Generated copy — concept-only. Batches aggregate concepts; the copy
          lives on the concept pages and is never shown/edited here. */}
      {isConcept && (
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-faint">
              Generated Copy
            </h2>
          </div>

          {/* The run panel renders in every state — running, succeeded and
              failed — so the step list does not disappear at the moment it
              becomes most useful. It carries the error itself, so the button
              below suppresses its own copy of it. */}
          {/* Three independent pieces of work on the same concept, in one
              responsive row: writing, then upload, then launch. Each keeps
              its own container so a failure in one does not read as
              another's. Stacks to a single column on narrow screens. */}
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3 xl:items-start">
            <div className="flex min-w-0 flex-col gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                Copywriting
              </p>
              {data.generationStatus === "in_progress" ? (
                <div className="rounded-2xl border border-accent/20 bg-accent-dim/40 p-6">
                  <GenerationSteps conceptId={data.id} />
                </div>
              ) : (
                <>
                  <RunPanel conceptId={data.id} />
                  <div className={!hasCopy ? "rounded-2xl border border-border bg-panel p-6" : undefined}>
                    <GenerateButton creative={data} showRunError={false} />
                  </div>
                </>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                Meta upload
              </p>
              <MetaRunPanel conceptId={data.id} kind="upload" alwaysShow />
              {/* Where this ad landed: the page and campaign by name, plus
                  the object ids, each copyable. Sits under Upload because
                  that is the step that created these objects — a launch only
                  activates them. Listed once for the whole section, not once
                  per panel. */}
              <MetaTargetList
                className="rounded-lg border border-border bg-panel px-3 py-2.5"
                targets={data.metaTargets}
                ids={data.metaIds}
              />
            </div>

            <div className="flex min-w-0 flex-col gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                Meta launch
              </p>
              <MetaRunPanel conceptId={data.id} kind="launch" alwaysShow />
            </div>
          </div>
        </section>
      )}

      {/* Per-language variations. The copy actually lives on these Level C
          pages; the section above shows the concept's preferred set. */}
      {isConcept && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-faint">
            Variations
          </h2>
          <div className="mt-4">
            <VariationTabs conceptId={data.id} />
          </div>
        </section>
      )}
    </div>
  );
}

