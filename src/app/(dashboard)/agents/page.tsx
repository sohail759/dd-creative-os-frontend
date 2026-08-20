"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Save,
  RotateCcw,
  Loader2,
  AlertTriangle,
  Check,
  Settings,
  Brain,
  Zap,
  Target,
  Wrench,
  Database,
  Globe,
  BarChart3,
  Video,
  FileText,
  ChevronRight,
  ArrowLeft,
  X,
} from "lucide-react";
import { useAgents, useUpdateAgent } from "@/hooks/use-agents";
import { cn } from "@/lib/utils";
import type { AgentConfig } from "@/lib/api";

type Drafts = Record<string, Record<string, string>>;

function parseError(message: string): string {
  try {
    const parsed = JSON.parse(message);
    if (Array.isArray(parsed)) return parsed.join("  •  ");
  } catch {
    /* not JSON */
  }
  return message;
}

function AgentCard({
  agent,
  isSelected,
  onClick,
}: {
  agent: AgentConfig;
  isSelected: boolean;
  onClick: () => void;
}) {
  const model = agent.config.model;
  const modelShort = model
    ? model.split("/").pop()?.split("-").slice(0, 2).join(" ")
    : "Default";

  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 text-left transition-all",
        isSelected
          ? "border-accent/50 bg-accent-dim/30 shadow-lg shadow-accent/5"
          : "border-border bg-panel hover:border-border-strong hover:bg-panel-hover",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            isSelected ? "bg-accent/20" : "bg-surface",
          )}
        >
          <Bot className={cn("h-5 w-5", isSelected ? "text-accent" : "text-muted")} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn("font-semibold truncate", isSelected ? "text-foreground" : "text-muted")}>
            {agent.name}
          </h3>
          <p className="text-xs text-faint truncate">{agent.id}</p>
        </div>
        <div className="flex items-center gap-2">
          {model && (
            <span className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-xs text-muted">
              <Brain className="h-3 w-3" />
              {modelShort}
            </span>
          )}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs",
              agent.is_default
                ? "bg-accent-dim/60 text-accent"
                : "bg-success/10 text-success",
            )}
          >
            {agent.is_default ? (
              <>
                <Settings className="h-3 w-3" />
                Default
              </>
            ) : (
              <>
                <Check className="h-3 w-3" />
                Custom
              </>
            )}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function AgentsPage() {
  const { data, isLoading, isError, error } = useAgents();
  const [selectedId, setSelectedId] = useState<string>("");
  const [drafts, setDrafts] = useState<Drafts>({});

  useEffect(() => {
    if (!data) return;
    setDrafts((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const agent of data.agents) {
        if (!(agent.id in next)) {
          next[agent.id] = { ...agent.config };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [data]);

  const agents = data?.agents ?? [];
  const availableModels = data?.available_models ?? [];

  const selected: AgentConfig | undefined = useMemo(
    () => agents.find((a) => a.id === selectedId) ?? agents[0],
    [agents, selectedId],
  );

  useEffect(() => {
    if (!selectedId && agents.length > 0) setSelectedId(agents[0].id);
  }, [agents, selectedId]);

  if (isLoading) {
    return (
      <div className="animate-fade-in-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Bot className="h-5 w-5 text-accent" />
          Agent Configuration
        </h1>
        <div className="mt-8 flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          Loading agents...
        </div>
      </div>
    );
  }

  if (isError || !selected) {
    return (
      <div className="animate-fade-in-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Bot className="h-5 w-5 text-accent" />
          Agent Configuration
        </h1>
        <div className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          Failed to load agents: {error instanceof Error ? error.message : "unknown error"}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Bot className="h-5 w-5 text-accent" />
          Agent Configuration
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Configure each agent&apos;s model, role, goal and system prompt. Changes are
          saved to PostgreSQL and applied on the next run.
        </p>
      </div>

      {/* Agent cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            isSelected={agent.id === selected.id}
            onClick={() => setSelectedId(agent.id)}
          />
        ))}
      </div>

      {/* Editor */}
      <AgentEditor
        key={selected.id}
        agent={selected}
        models={availableModels}
        draft={drafts[selected.id] ?? selected.config}
        onDraftChange={(next) =>
          setDrafts((prev) => ({ ...prev, [selected.id]: next }))
        }
      />
    </div>
  );
}

function AgentEditor({
  agent,
  models,
  draft,
  onDraftChange,
}: {
  agent: AgentConfig;
  models: string[];
  draft: Record<string, string>;
  onDraftChange: (next: Record<string, string>) => void;
}) {
  const save = useUpdateAgent(agent.id);

  const serverConfig = agent.config;
  const changed = JSON.stringify(draft) !== JSON.stringify(serverConfig);
  const saving = save.isPending;

  const setField = (key: string, value: string) =>
    onDraftChange({ ...draft, [key]: value });

  const handleSave = () => {
    const isBlank = !Object.values(draft).some((v) => String(v ?? "").trim());
    save.mutate(
      { config: isBlank ? {} : draft },
      { onSuccess: (res) => onDraftChange(res.config) },
    );
  };

  const handleReset = () => {
    save.mutate(
      { config: {} },
      { onSuccess: (res) => onDraftChange(res.config) },
    );
  };

  const currentModel = draft.model;
  const modelShort = currentModel
    ? currentModel.split("/").pop()?.split("-").slice(0, 2).join(" ")
    : "Default";

  return (
    <div className="mt-6 rounded-xl border border-border bg-panel p-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <Bot className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{agent.name}</h2>
            <p className="text-xs text-faint">Agent ID: {agent.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {agent.is_default && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-dim/60 px-3 py-1 text-xs font-medium text-accent">
              <Settings className="h-3 w-3" />
              Built-in default
            </span>
          )}
          {changed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-3 py-1 text-xs font-medium text-warning">
              Unsaved changes
            </span>
          )}
        </div>
      </div>

      {/* Fields */}
      <div className="mt-6 space-y-5">
        {agent.fields.map((field) => (
          <FieldEditor
            key={field.key}
            field={field}
            value={draft[field.key] ?? ""}
            onChange={(val) => setField(field.key, val)}
            models={models}
          />
        ))}
      </div>

      {/* Tools */}
      {agent.tools && agent.tools.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="h-4 w-4 text-faint" />
            <h3 className="text-sm font-medium text-foreground">Tools</h3>
          </div>
          <p className="text-xs text-faint mb-3">
            Enable tools to give this agent additional capabilities
          </p>
          <div className="space-y-2">
            {agent.tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {save.error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{parseError(save.error.message)}</span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
        {!agent.is_default && (
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
            "inline-flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-semibold text-black transition-colors",
            "bg-accent hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {saving ? "Saving..." : "Save Configuration"}
        </button>
      </div>
    </div>
  );
}

function getProviderColor(provider: string): string {
  switch (provider.toLowerCase()) {
    case "google":
      return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    case "anthropic":
      return "bg-orange-500/10 text-orange-400 border-orange-500/30";
    case "openai":
      return "bg-green-500/10 text-green-400 border-green-500/30";
    case "deepseek":
      return "bg-purple-500/10 text-purple-400 border-purple-500/30";
    case "meta-llama":
      return "bg-sky-500/10 text-sky-400 border-sky-500/30";
    case "mistralai":
      return "bg-red-500/10 text-red-400 border-red-500/30";
    default:
      return "bg-gray-500/10 text-gray-400 border-gray-500/30";
  }
}

function getProviderIcon(provider: string): string {
  switch (provider.toLowerCase()) {
    case "google":
      return "G";
    case "anthropic":
      return "A";
    case "openai":
      return "O";
    case "deepseek":
      return "D";
    case "meta-llama":
      return "M";
    case "mistralai":
      return "Mi";
    default:
      return "?";
  }
}

function groupByProvider(models: string[]) {
  const groups: Record<string, { provider: string; displayName: string; icon: string; color: string; models: string[] }> = {};
  for (const m of models) {
    const parts = m.split("/");
    const provider = parts[0] || "unknown";
    if (!groups[provider]) {
      groups[provider] = {
        provider,
        displayName: provider.charAt(0).toUpperCase() + provider.slice(1),
        icon: getProviderIcon(provider),
        color: getProviderColor(provider),
        models: [],
      };
    }
    groups[provider].models.push(m);
  }
  return Object.values(groups);
}

function ModelSelectorModal({
  isOpen,
  onClose,
  value,
  onChange,
  models,
}: {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (val: string) => void;
  models: string[];
}) {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const groups = groupByProvider(models);

  if (!isOpen) return null;

  const handleSelect = (modelId: string) => {
    onChange(modelId);
    onClose();
    setSelectedProvider(null);
  };

  const handleBack = () => {
    setSelectedProvider(null);
  };

  const handleClose = () => {
    onClose();
    setSelectedProvider(null);
  };

  const selectedGroup = groups.find((g) => g.provider === selectedProvider);
  const totalModels = selectedGroup?.models.length ?? models.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-border bg-panel shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border p-5">
          {selectedProvider ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-surface hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <Brain className="h-5 w-5 text-accent" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground">
              {selectedProvider ? selectedGroup?.displayName : "Select Model"}
            </h3>
            <p className="text-sm text-faint">
              {selectedProvider
                ? `${totalModels} models available`
                : `${models.length} models across ${groups.length} providers`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-surface hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-5 custom-scrollbar">
          {!selectedProvider ? (
            /* Provider grid */
            <div className="grid gap-3 sm:grid-cols-2">
              {groups.map((group) => (
                <button
                  key={group.provider}
                  type="button"
                  onClick={() => setSelectedProvider(group.provider)}
                  className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 text-left transition-all hover:border-border-strong hover:bg-panel-hover"
                >
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl border text-lg font-bold",
                      group.color,
                    )}
                  >
                    {group.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{group.displayName}</p>
                    <p className="text-xs text-faint">{group.models.length} models</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-faint" />
                </button>
              ))}
            </div>
          ) : (
            /* Model grid (3 columns) */
            <div className="grid gap-3 sm:grid-cols-3">
              {selectedGroup?.models.map((m) => {
                const modelName = m.split("/").slice(1).join("/") || m;
                const displayName = modelName
                  .split("-")
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ");
                const isSelected = m === value;

                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleSelect(m)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all",
                      isSelected
                        ? "border-accent/50 bg-accent-dim/30 shadow-md shadow-accent/5"
                        : "border-border bg-surface hover:border-border-strong hover:bg-panel-hover",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold",
                        getProviderColor(selectedGroup?.provider ?? ""),
                      )}
                    >
                      {getProviderIcon(selectedGroup?.provider ?? "")}
                    </div>
                    <div className="w-full min-w-0">
                      <p className={cn("text-sm font-medium truncate", isSelected ? "text-foreground" : "text-muted")}>
                        {displayName}
                      </p>
                      <p className="mt-1 text-xs text-faint truncate">{m}</p>
                    </div>
                    {isSelected && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent">
                        <Check className="h-3.5 w-3.5 text-black" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModelSelectorBox({
  value,
  onChange,
  models,
}: {
  value: string;
  onChange: (val: string) => void;
  models: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  const parts = value?.split("/") || [];
  const provider = parts[0] || "";
  const modelName = parts.slice(1).join("/") || value || "No model selected";
  const displayName = modelName
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all",
          "border-border bg-surface hover:border-border-strong hover:bg-panel-hover",
        )}
      >
        {value ? (
          <>
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-bold",
                getProviderColor(provider),
              )}
            >
              {getProviderIcon(provider)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
              <p className="text-xs text-faint truncate">{value}</p>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 text-muted">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-panel">
              <Brain className="h-5 w-5" />
            </div>
            <p className="text-sm">Click to select a model...</p>
          </div>
        )}
        <ChevronRight className="h-4 w-4 text-faint shrink-0" />
      </button>

      <ModelSelectorModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        value={value}
        onChange={onChange}
        models={models}
      />
    </>
  );
}

function getToolIcon(toolId: string) {
  switch (toolId) {
    case "knowledge_base":
      return <Database className="h-4 w-4" />;
    case "web_search":
      return <Globe className="h-4 w-4" />;
    case "analytics":
      return <BarChart3 className="h-4 w-4" />;
    case "frame_analysis":
      return <Video className="h-4 w-4" />;
    case "transcription":
      return <FileText className="h-4 w-4" />;
    default:
      return <Wrench className="h-4 w-4" />;
  }
}

function ToolCard({ tool }: { tool: { id: string; name: string; description: string; enabled: boolean } }) {
  const icon = getToolIcon(tool.id);

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 transition-all",
        tool.enabled
          ? "border-accent/30 bg-accent-dim/20"
          : "border-border bg-surface",
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md",
          tool.enabled ? "bg-accent/20 text-accent" : "bg-panel text-faint",
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn("text-sm font-medium", tool.enabled ? "text-foreground" : "text-muted")}>
            {tool.name}
          </p>
          {tool.enabled && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
              <Check className="h-3 w-3" />
              Enabled
            </span>
          )}
        </div>
        <p className="text-xs text-faint mt-0.5">{tool.description}</p>
      </div>
    </div>
  );
}

function FieldEditor({
  field,
  value,
  onChange,
  models,
}: {
  field: { key: string; label: string; type: string; required: boolean };
  value: string;
  onChange: (val: string) => void;
  models: string[];
}) {
  const getFieldIcon = () => {
    switch (field.key) {
      case "model":
        return <Brain className="h-4 w-4" />;
      case "system_prompt":
        return <Zap className="h-4 w-4" />;
      case "role":
        return <Settings className="h-4 w-4" />;
      case "goal":
        return <Target className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getFieldDescription = () => {
    switch (field.key) {
      case "model":
        return "The AI model used for this agent";
      case "role":
        return "The agent's role and expertise";
      case "goal":
        return "What this agent is trying to achieve";
      case "system_prompt":
        return "The system prompt that guides the agent's behavior";
      default:
        return "";
    }
  };

  const icon = getFieldIcon();
  const description = getFieldDescription();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon && <span className="text-faint">{icon}</span>}
        <label className="text-sm font-medium text-foreground">
          {field.label}
          {field.required && <span className="ml-1 text-accent">*</span>}
        </label>
      </div>
      {description && <p className="text-xs text-faint">{description}</p>}

      {field.type === "select" ? (
        <ModelSelectorBox
          value={value}
          onChange={onChange}
          models={models}
        />
      ) : field.type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={field.key === "system_prompt" ? 14 : 4}
          spellCheck={false}
          placeholder={`Enter ${field.label.toLowerCase()}...`}
          className={cn(
            "block w-full rounded-lg border border-border bg-surface px-4 py-3",
            "font-mono text-sm text-foreground outline-none transition-colors",
            "placeholder:text-faint focus:border-accent/60 focus:ring-1 focus:ring-accent/20",
            "selection:bg-accent-dim",
          )}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${field.label.toLowerCase()}...`}
          className={cn(
            "block w-full rounded-lg border border-border bg-surface px-4 py-2.5",
            "text-sm text-foreground outline-none transition-colors",
            "placeholder:text-faint focus:border-accent/60 focus:ring-1 focus:ring-accent/20",
          )}
        />
      )}
    </div>
  );
}
