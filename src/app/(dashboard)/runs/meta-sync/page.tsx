import { AdminOnly } from "@/components/auth/admin-only";
import { MetaSyncRunsView } from "./view";

/** Admin-gated: these runs expose ad account ids and Meta error detail. */
export default function Page() {
  return (
    <AdminOnly>
      <MetaSyncRunsView />
    </AdminOnly>
  );
}
