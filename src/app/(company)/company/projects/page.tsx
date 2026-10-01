import { requireRole } from "@/lib/auth/guards";
import { CompanyProjectsScreen } from "@/components/company/company-projects-screen";

export const dynamic = "force-dynamic";

/** Live projects: released, taking applications, or being built. */
export default async function CompanyActiveProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    deleted?: string;
    error?: string;
    type?: string;
  }>;
}) {
  const user = await requireRole(["company", "admin"]);
  const { created, deleted, error, type } = await searchParams;
  return (
    <CompanyProjectsScreen
      userId={user.id}
      tab="active"
      type={type === "hire" || type === "build" || type === "freelance" ? type : null}
      created={created}
      deleted={deleted}
      error={error}
    />
  );
}
