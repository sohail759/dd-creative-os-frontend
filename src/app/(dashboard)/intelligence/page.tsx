import { AdminOnly } from "@/components/auth/admin-only";
import { IntelligencePageView } from "./view";

/** Admin-gated. The view itself is the client page this replaced. */
export default function Page() {
  return (
    <AdminOnly>
      <IntelligencePageView />
    </AdminOnly>
  );
}
