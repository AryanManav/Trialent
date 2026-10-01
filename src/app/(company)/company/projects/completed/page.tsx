import { requireRole } from "@/lib/auth/guards";
import { CompanyProjectsScreen } from "@/components/company/company-projects-screen";

export const dynamic = "force-dynamic";

/** Finished: roles with every opening filled, and evaluated or cancelled projects. */
export default async function CompanyCompletedProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const user = await requireRole(["company", "admin"]);
  const { type } = await searchParams;
  return (
    <CompanyProjectsScreen
      userId={user.id}
      tab="completed"
      type={type === "hire" || type === "build" || type === "freelance" ? type : null}
    />
  );
}
