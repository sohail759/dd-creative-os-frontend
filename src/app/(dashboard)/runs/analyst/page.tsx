import { AdminOnly } from "@/components/auth/admin-only";
import { AnalystRunsView } from "./view";

/** Admin-gated, like the rest of Analytics. */
export default function Page() {
  return (
    <AdminOnly>
      <AnalystRunsView />
    </AdminOnly>
  );
}
