import Link from "next/link";
import { ArrowRight, FolderKanban, Plus } from "lucide-react";
import {
  getCompanyIdForUser,
  getCompanyProjectResults,
  getCompanyProjects,
} from "@/lib/data/company";
import { getNotificationSummary } from "@/lib/data/notifications";
import { unreadByProject } from "@/lib/notifications";
import { isClosedProject } from "@/lib/applications";
import {
  COMPANY_PROJECT_STATUS,
  HIRING_STATE_DISPLAY,
  OUTCOME_LABEL,
  hiringState,
} from "@/lib/company";
import { JOB_TYPES, PRICING_MODELS, WORK_ARRANGEMENTS } from "@/lib/constants";
import { OpportunityBadge } from "@/components/projects/opportunity-badge";
import { FilterChips } from "@/components/ui/filter-chips";
import type { OpportunityType } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { StatusBanner } from "@/components/common/status-banner";
import { StatusBadge } from "@/components/ui/status-badge";
import { LinkTabs } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { cn, formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import type { CompanyProjectResult, CompanyProjectView } from "@/lib/types/domain";

export type CompanyProjectsTab = "active" | "completed";

function ProjectRow({
  project,
  updateCount,
  latest,
  result,
}: {
  project: CompanyProjectView;
  updateCount: number;
  latest?: { title: string; createdAt: string };
  result?: CompanyProjectResult;
}) {
  const hire = project.opportunityType === "hire";
  const freelance = project.freelance !== null;
  const status = hire
    ? HIRING_STATE_DISPLAY[hiringState(project)]
    : COMPANY_PROJECT_STATUS[project.status];
  const closed = isClosedProject(project.status);

  return (
    <li className={cn(updateCount > 0 && "bg-accent-50/40")}>
      <Link
        href={
          freelance
            ? `/company/projects/${project.id}/contract`
            : closed && !hire
              ? `/company/projects/${project.id}/review`
              : `/company/projects/${project.id}`
        }
        className="group flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-ink-50 md:flex-row md:items-center"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-medium text-ink-900 group-hover:text-brand-700">
              {project.title}
            </h2>
            <OpportunityBadge type={project.opportunityType} size="sm" />
            {updateCount > 0 && (
              <span className="rounded bg-accent-100 px-1.5 text-2xs font-medium text-accent-800">
                {updateCount} new
              </span>
            )}
          </div>

          {hire ? (
            <p className="text-xs text-ink-500">
              {[
                project.jobType && JOB_TYPES[project.jobType],
                project.workArrangement && WORK_ARRANGEMENTS[project.workArrangement],
                `${project.hired} / ${project.openings} filled`,
                project.maxApplicants !== null
                  ? `${project.activeApplications} / ${project.maxApplicants} applications`
                  : `${project.activeApplications} applications`,
              ]
                .filter(Boolean)
                .join(" · ")}
              {project.awaitingReview > 0 && (
                <span className="font-medium text-accent-700">
                  {" "}
                  · {project.awaitingReview} new
                </span>
              )}
            </p>
          ) : closed ? (
            <p className="text-xs text-ink-500">
              {!result || result.candidates.length === 0
                ? "No candidate completed it"
                : result.candidates
                    .map(
                      (candidate) =>
                        `${candidate.name} · ${
                          project.purpose === "build"
                            ? "Built it"
                            : candidate.outcome
                              ? OUTCOME_LABEL[candidate.outcome]
                              : "Outcome not recorded yet"
                        }`
                    )
                    .join("  ·  ")}
            </p>
          ) : (
            <p className="text-xs text-ink-500">
              {project.freelance
                ? `${PRICING_MODELS[project.freelance.pricingModel].label} · `
                : `${project.expectedHours}h · `}
              Apply by {formatDate(project.applicationDeadline)}
              {project.awaitingReview > 0 && (
                <span className="font-medium text-accent-700">
                  {" "}
                  · {project.awaitingReview} new applicant
                  {project.awaitingReview === 1 ? "" : "s"}
                </span>
              )}
            </p>
          )}

          {latest && (
            <p className="truncate text-xs text-ink-600">
              {latest.title}
              <span className="text-ink-400">
                {" "}
                · {formatRelativeTime(latest.createdAt)}
              </span>
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-4">
          {hire ? (
            <span className="text-sm font-medium text-emerald-700">Free</span>
          ) : (
            <span className="tabular text-sm font-medium text-emerald-700">
              {formatCurrency(project.paymentAmount, project.currency)}
            </span>
          )}
          <StatusBadge size="sm" tone={status.tone} label={status.label} />
          <span className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-brand-700 md:ml-0">
            {hire
              ? "Manage applicants"
              : freelance
                ? "Contract"
                : closed
                  ? "Evaluations"
                  : "Manage"}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
      </Link>
    </li>
  );
}

/**
 * The company's projects, split across two routes: live ones (released or
 * being built) and finished ones (evaluated or cancelled).
 */
export async function CompanyProjectsScreen({
  userId,
  tab,
  type,
  created,
  deleted,
  error,
}: {
  userId: string;
  tab: CompanyProjectsTab;
  /** Only hiring roles, or only build projects; everything when null. */
  type?: OpportunityType | null;
  created?: string;
  deleted?: string;
  error?: string;
}) {
  const companyId = await getCompanyIdForUser(userId);
  const [allProjects, notifications] = await Promise.all([
    companyId ? getCompanyProjects(companyId) : Promise.resolve([]),
    getNotificationSummary(userId),
  ]);
  const typeCounts = {
    hire: allProjects.filter((project) => project.opportunityType === "hire").length,
    build: allProjects.filter((project) => project.opportunityType === "build").length,
    freelance: allProjects.filter((project) => project.opportunityType === "freelance")
      .length,
  };
  const projects = type
    ? allProjects.filter((project) => project.opportunityType === type)
    : allProjects;
  const basePath = tab === "active" ? "/company/projects" : "/company/projects/completed";
  const withType = (path: string) => (type ? `${path}?type=${type}` : path);

  const active = projects.filter((project) => !isClosedProject(project.status));
  const completed = projects.filter((project) => isClosedProject(project.status));
  const shown = tab === "active" ? active : completed;
  const results =
    tab === "completed"
      ? await getCompanyProjectResults(completed.map((project) => project.id))
      : new Map<string, CompanyProjectResult>();

  const updates = unreadByProject(notifications.unread);
  const counts = { active: active.length, completed: completed.length };
  // Projects with something new float to the top; order is otherwise unchanged.
  const ordered = [...shown].sort(
    (a, b) => Number((updates[b.id] ?? 0) > 0) - Number((updates[a.id] ?? 0) > 0)
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <PageHeader
          title="Projects"
          description="Your hiring roles, build projects and freelance contracts — who's applying, who's being hired, who's delivering."
          actions={
            <Link href="/company/projects/create">
              <Button>
                <Plus className="h-4 w-4" aria-hidden />
                Create opportunity
              </Button>
            </Link>
          }
        />
        <LinkTabs
          label="Project views"
          active={tab}
          tabs={[
            {
              id: "active",
              label: "Live",
              href: withType("/company/projects"),
              count: counts.active,
            },
            {
              id: "completed",
              label: "Finished",
              href: withType("/company/projects/completed"),
              count: counts.completed,
            },
          ]}
        />
      </div>

      <FilterChips
        label="Opportunity type"
        active={type ?? "all"}
        chips={[
          { id: "all", label: "All", href: basePath, count: allProjects.length },
          {
            id: "hire",
            label: "Hiring",
            href: `${basePath}?type=hire`,
            count: typeCounts.hire,
          },
          {
            id: "build",
            label: "Build projects",
            href: `${basePath}?type=build`,
            count: typeCounts.build,
          },
          {
            id: "freelance",
            label: "Freelance",
            href: `${basePath}?type=freelance`,
            count: typeCounts.freelance,
          },
        ]}
      />

      {error && <StatusBanner tone="error">{error}</StatusBanner>}
      {deleted && <StatusBanner tone="success">Deleted.</StatusBanner>}
      {created && (
        <StatusBanner tone="success">
          {created === "hire"
            ? "Role posted and open for applications. Posting a role is free."
            : created === "freelance"
              ? "Contract published and open for applications."
              : "Project published and open for applications."}
        </StatusBanner>
      )}

      {ordered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={
            tab !== "active"
              ? "Nothing finished yet"
              : type === "hire"
                ? "No active hiring opportunities"
                : type === "build"
                  ? "No active build projects"
                  : type === "freelance"
                    ? "No active freelance contracts"
                    : "No live roles or projects"
          }
          description={
            tab !== "active"
              ? "Roles move here once every opening is filled, and projects once their work is evaluated or they're cancelled."
              : type === "hire"
                ? "Create an opportunity to start receiving candidates."
                : type === "build"
                  ? "Create a project and find a candidate to complete it."
                  : type === "freelance"
                    ? "Post a paid contract and select a freelancer to deliver it."
                    : "Hire for a role for free, post a paid project, or bring in a freelancer."
          }
          actionText={tab === "active" ? "Create opportunity" : undefined}
          actionHref={
            tab === "active"
              ? `/company/projects/create${type ? `?type=${type}` : ""}`
              : undefined
          }
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {ordered.map((project) => {
            const latest = notifications.recent.find(
              (item) => item.projectId === project.id && !item.read
            );
            return (
              <ProjectRow
                key={project.id}
                project={project}
                updateCount={updates[project.id] ?? 0}
                latest={latest}
                result={results.get(project.id)}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
