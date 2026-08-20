import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Suspense>
        <Sidebar />
      </Suspense>
      <main className="md:pl-60">
        <div className="mx-auto px-4 pb-16 pt-16 md:px-8 md:pt-8">
          <Suspense>{children}</Suspense>
        </div>
      </main>
    </div>
  );
}
