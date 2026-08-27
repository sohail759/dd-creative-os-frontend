"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Settings,
  Menu,
  X,
  Copyright,
  Upload,
  Bot,
  Brain,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { signOut, type AuthUser } from "@/lib/api/auth";

const BRANDS = [
  { slug: "numy", label: "NUMY" },
  { slug: "holy-mouthwash", label: "Holy Mouthwash" },
] as const;

const NAV_ITEMS = [
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Intelligence", href: "/intelligence", icon: Brain },
  { label: "Uploaded Products", href: "/uploaded-products", icon: Upload },
  // { label: "Agent Configuration", href: "/agents", icon: Bot },
];

function BrandMark() {
  return (
    <Link href="/creatives" className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-black">
        <Copyright className="h-4 w-4" strokeWidth={2.5} />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold tracking-tight text-foreground">
          Creative OS
        </p>
        <p className="text-[10px] uppercase tracking-widest text-faint">
          Ad Copy Studio
        </p>
      </div>
    </Link>
  );
}

function BrandSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentBrand = searchParams.get("brand") ?? "numy";

  function handleBrand(slug: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("brand", slug);
    router.push(`/creatives?${params.toString()}`);
    onNavigate?.();
  }

  return (
    <div className="mb-4 flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-widest text-faint">
        Brand
      </p>
      <div className="flex flex-col gap-1">
        {BRANDS.map((b) => (
          <button
            key={b.slug}
            onClick={() => handleBrand(b.slug)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-left text-sm font-medium transition-colors",
              currentBrand === b.slug
                ? "bg-accent text-black"
                : "text-muted hover:bg-white/5 hover:text-foreground",
            )}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent-dim text-accent"
                : "text-muted hover:bg-white/5 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
      {/* <Link
        href="/settings"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-white/5 hover:text-foreground"
      >
        <Settings className="h-4 w-4" />
        Settings
      </Link> */}
    </nav>
  );
}

function UserFooter({ user }: { user: AuthUser | null }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      // Full navigation: clears the cookie server-side and all client state.
      window.location.assign("/sign-in");
    }
  }

  if (!user) {
    return (
      <div className="border-t border-border p-4">
        <p className="text-xs text-faint">
          Notion-Fetching · Generation UI
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-border p-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-dim text-xs font-bold uppercase text-accent">
          {(user.name || user.email).slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-xs font-semibold text-foreground">
            {user.name || user.email}
          </p>
          {user.name && (
            <p className="truncate text-[10px] text-faint">{user.email}</p>
          )}
        </div>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className={cn(
            "shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-foreground",
            signingOut && "cursor-wait opacity-60",
          )}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ user }: { user?: AuthUser | null }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg border border-border bg-surface p-2 text-muted transition-colors hover:text-foreground md:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-surface md:flex">
        <div className="px-4 pb-4 pt-5">
          <BrandMark />
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3">
          <BrandSwitcher />
          <NavList />
        </div>
        <UserFooter user={user ?? null} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-border bg-surface">
            <div className="flex items-center justify-between px-4 pb-4 pt-5">
              <BrandMark />
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-muted transition-colors hover:text-foreground"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3">
              <BrandSwitcher onNavigate={() => setOpen(false)} />
              <NavList onNavigate={() => setOpen(false)} />
            </div>
            <UserFooter user={user ?? null} />
          </aside>
        </div>
      )}
    </>
  );
}
