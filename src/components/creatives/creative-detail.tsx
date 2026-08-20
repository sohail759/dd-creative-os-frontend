"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2, Pencil, Save, X } from "lucide-react";
import type { Creative } from "@/lib/api";
import { StatusBadge } from "@/components/ui/status-badge";
import { CopyButton } from "@/components/ui/copy-button";
import { GenerateButton } from "./generate-button";
import { FrameIoMediaGallery } from "./frame-io-media-gallery";
import { MetaControls } from "./meta-controls";
import { ConceptCard } from "./concept-card";
import { useUpdateCreativeCopy } from "@/hooks/use-update-copy";
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
  const updateCopy = useUpdateCreativeCopy();
  const [editing, setEditing] = useState(false);
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
            <div className="flex items-center gap-3">
              {data.generationStatus === "in_progress" && (
                <span className="inline-flex items-center gap-1.5 text-xs text-accent">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Updating…
                </span>
              )}
              {hasCopy &&
                data.generationStatus !== "in_progress" &&
                !editing && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    disabled={updateCopy.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white/5 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit copy
                  </button>
                )}
            </div>
          </div>

          {!hasCopy ? (
            <div className="mt-4">
              <div className="rounded-2xl border border-border bg-panel p-6">
                <GenerateButton creative={data} />
              </div>
            </div>
          ) : (
            <EditableCopy
              key={`${data.id}-${data.generationUpdatedAt ?? data.generatedAt ?? "v"}`}
              data={data}
              editing={editing}
              onSetEditing={setEditing}
              updateCopy={updateCopy}
            />
          )}
        </section>
      )}
    </div>
  );
}

type EditableCopyProps = {
  data: Creative;
  editing: boolean;
  onSetEditing: (v: boolean) => void;
  updateCopy: ReturnType<typeof useUpdateCreativeCopy>;
};

function EditableCopy({ data, editing, onSetEditing, updateCopy }: EditableCopyProps) {
  const [headlines, setHeadlines] = useState<string[]>(data.headlines);
  const [texts, setTexts] = useState<string[]>(data.primary_texts);
  const saving = updateCopy.isPending;

  const save = () => {
    updateCopy.mutate({
      id: data.id,
      payload: { headlines, primary_texts: texts },
    });
    onSetEditing(false);
  };

  const cancel = () => {
    setHeadlines(data.headlines);
    setTexts(data.primary_texts);
    onSetEditing(false);
  };

  if (!editing) {
    return (
      <>
        <div className="mt-4 flex flex-col gap-8">
          <div>
            <h3 className="mb-3 text-base font-semibold">Headlines</h3>
            <ol className="flex flex-col gap-2.5">
              {data.headlines.map((headline, i) => (
                <li
                  key={i}
                  className="group flex items-start gap-4 rounded-xl border border-border bg-panel p-4 transition-colors hover:border-border-strong"
                >
                  <span className="mt-0.5 text-sm font-bold tabular-nums text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="flex-1 text-base leading-relaxed text-foreground">
                    {headline}
                  </p>
                  <CopyButton text={headline} label="Copy" />
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h3 className="mb-3 text-base font-semibold">Primary Text</h3>
            <ol className="flex flex-col gap-2.5">
              {data.primary_texts.map((text, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-border bg-panel p-4 transition-colors hover:border-border-strong"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {text}
                    </p>
                    <CopyButton text={text} label="Copy" />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Headlines</h3>
        <span className="text-xs text-faint">
          {headlines.length} headline{headlines.length === 1 ? "" : "s"}
        </span>
      </div>
      <ul className="space-y-2.5">
        {(headlines.length ? headlines : [""]).map((h, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 text-sm font-bold tabular-nums text-accent">
              {String(i + 1).padStart(2, "0")}
            </span>
            <textarea
              value={h}
              onChange={(e) => {
                const next = [...headlines];
                next[i] = e.target.value;
                setHeadlines(next);
              }}
              rows={2}
              className="flex-1 resize-y rounded-lg border border-border bg-panel px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-faint focus:border-accent/60"
            />
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Primary Text</h3>
        <span className="text-xs text-faint">
          {texts.length} primary text{texts.length === 1 ? "" : "s"}
        </span>
      </div>
      <ul className="space-y-2.5">
        {(texts.length ? texts : [""]).map((t, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 text-sm font-bold tabular-nums text-accent">
              {String(i + 1).padStart(2, "0")}
            </span>
            <textarea
              value={t}
              onChange={(e) => {
                const next = [...texts];
                next[i] = e.target.value;
                setTexts(next);
              }}
              rows={5}
              className="flex-1 resize-y rounded-lg border border-border bg-panel px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-faint focus:border-accent/60"
            />
          </li>
        ))}
      </ul>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={cancel}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white/5 px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : "Save copy"}
        </button>
      </div>
    </div>
  );
}
