import { Copyright } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-black">
          <Copyright className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div className="leading-tight">
          <p className="text-lg font-bold tracking-tight text-foreground">
            Creative OS
          </p>
          <p className="text-[11px] uppercase tracking-widest text-faint">
            Ad Copy Studio
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}
