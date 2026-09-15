import { AdminOnly } from "@/components/auth/admin-only";
import { ConceptsAnalysisPageView } from "./view";

/** Admin-gated. The view itself is the client page this replaced. */
export default function Page() {
  return (
    <AdminOnly>
      <ConceptsAnalysisPageView />
    </AdminOnly>
  );
}
