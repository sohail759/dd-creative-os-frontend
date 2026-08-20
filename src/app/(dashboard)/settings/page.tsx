"use client";

import { useState } from "react";
import { Settings, Save, RotateCcw, Loader2 } from "lucide-react";
import { useCopywriterPrompt, useUpdateCopywriterPrompt } from "@/hooks/use-copywriter-prompt";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const {
    data: prompt,
    isFetching: isLoadingPrompt,
  } = useCopywriterPrompt();
  const save = useUpdateCopywriterPrompt();

  // The server value is the source of truth for display. `draft` only diverges
  // from it once the user starts editing, so a hard refresh always shows the
  // real default prompt (no empty textarea).
  const serverValue = prompt?.value ?? "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(serverValue);

  const value = editing ? draft : serverValue;
  const saving = save.isPending;
  const changed = editing && draft !== serverValue;
  const isDefault = !serverValue;

  const handleSave = () => {
    save.mutate({ value: draft });
    setEditing(false);
  };

  const handleReset = () => {
    if (!window.confirm("Revert to the built-in copywriter prompt?")) return;
    setDraft("");
    setEditing(true);
    save.mutate({ value: "" });
  };

  const startEditing = () => {
    setDraft(serverValue);
    setEditing(true);
  };

  if (isLoadingPrompt || prompt === undefined) {
    return (
      <div className="animate-fade-in-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Settings className="h-5 w-5 text-accent" />
          Settings
        </h1>
        <div className="mt-8 flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          Loading settings…
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <Settings className="h-5 w-5 text-accent" />
        Settings
      </h1>

      <div className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-faint">
          Copywriter agent prompt
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          The system prompt given to the AI copywriter (the &quot;copyright
          agent&quot;). When this field is empty, the built-in default prompt is
          used. Edits here take effect on the next generation.
        </p>

        <textarea
          value={value}
          onChange={(e) => {
            if (!editing) startEditing();
            setDraft(e.target.value);
          }}
          placeholder="Write a custom system prompt for the copywriter agent…"
          className={cn(
            "mt-3 block w-full rounded-xl border border-border bg-panel px-4 py-3",
            "font-mono text-sm text-foreground outline-none transition-colors",
            "placeholder:text-faint focus:border-accent/60",
            "selection:bg-accent-dim",
          )}
          rows={22}
          spellCheck={false}
        />
        {!editing && (
          <p className="mt-2 text-xs text-faint">
            Click the prompt to edit it.
          </p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-faint">
            {isDefault && (
              <span className="inline-flex items-center rounded-full bg-accent-dim/60 px-2 py-0.5 text-xs text-accent">
                Built-in default
              </span>
            )}
            {changed && (
              <span className="inline-flex items-center rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning">
                Unsaved changes
              </span>
            )}
            {prompt?.is_default && isDefault && (
              <span>Default prompt is active.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isDefault && editing && (
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white/5 px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Revert to default
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !changed}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-black transition-colors",
                "bg-accent hover:bg-accent-hover disabled:cursor-not-allowed",
                "disabled:opacity-60",
              )}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {saving ? "Saving…" : "Save prompt"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
