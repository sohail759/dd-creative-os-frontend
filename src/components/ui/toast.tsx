"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Info, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (kind: ToastKind, title: string, message?: string) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const KIND_STYLES: Record<ToastKind, { icon: typeof Info; ring: string }> = {
  success: { icon: CheckCircle2, ring: "text-success" },
  error: { icon: XCircle, ring: "text-danger" },
  info: { icon: Info, ring: "text-accent" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (kind: ToastKind, title: string, message?: string) => {
      const id = ++counter.current;
      setToasts((prev) => [...prev, { id, kind, title, message }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    [],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((t) => {
          const { icon: Icon, ring } = KIND_STYLES[t.kind];
          return (
            <div
              key={t.id}
              className="animate-fade-in-up pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-panel p-3 shadow-2xl shadow-black/40"
            >
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", ring)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {t.title}
                </p>
                {t.message && (
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">
                    {t.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-md p-1 text-faint transition-colors hover:text-muted"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
