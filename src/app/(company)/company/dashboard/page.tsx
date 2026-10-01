import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  FileCheck2,
  Hammer,
  Inbox,
  Plus,
  Sparkles,
} from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import {
  getCompanyForUser,
  getCompanyHistory,
  getCompanyPipeline,
  getCompanyProjects,
} from "@/lib/data/company";
import { getNotificationSummary } from "@/lib/data/notifications";
import {
  hiringState,
  isActiveHiring,
  entryAssessment,
  pipelineStage,
} from "@/lib/company";
import { isClosedProject } from "@/lib/applications";
import { greetingFor } from "@/lib/next-action";
import { formatMonth, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PipelineList } from "@/components/company/pipeline-list";
import {
  ActiveBuildList,
  ActiveHiringList,
  SectionHeading,
} from "@/components/company/dashboard-sections";
import { OpportunityBadge } from "@/components/projects/opportunity-badge";
import { NotificationIcon } from "@/components/notifications/notification-icon";

export const dynamic = "force-dynamic";

const FIRST_STEPS = [
  {
    icon: ClipboardList,
    title: "Post a role or a project",
    body: "Hire for a role (free), or post a paid project for one candidate to build.",
  },
  {
    icon: Inbox,
    title: "Review applications",
    body: "Shortlist, interview and select for roles; pick one candidate to build a project.",
  },
  {
    icon: FileCheck2,
    title: "Hire, or evaluate real work",
    body: "Fill your openings, or judge a delivered project against your criteria.",
  },
];

/** A hiring workspace, not a report: what needs attention comes first. */
export default async function CompanyDashboardPage() {
  const user = await requireRole(["company", "admin"]);
  const company = await getCompanyForUser(user.id);
  const [pipeline, notifications, projects, history] = await Promise.all([
    company ? getCompanyPipeline(company.id) : Promise.resolve([]),
    getNotificationSummary(user.id),
    company ? getCompanyProjects(company.id) : Promise.resolve([]),
    company ? getCompanyHistory(company.id) : Promise.resolve([]),
  ]);

  const stageOf = (entry: (typeof pipeline)[number]) =>
    pipelineStage(
      entry.applicationStatus,
      entry.workStatus,
      entry.opportunityType,
      entryAssessment(entry)
    );
  const toEvaluate = pipeline.filter((entry) => stageOf(entry) === "to_evaluate");
  const toReview = pipeline.filter((entry) => stageOf(entry) === "new");
  const attention = [...toEvaluate, ...toReview];

  const activeHiring = projects.filter(
    (project) =>
      project.opportunityType === "hire" && isActiveHiring(hiringState(project))
  );
  const activeBuild = projects.filter(
    // Paid work: build projects and freelance contracts.
    (project) => project.opportunityType !== "hire" && !isClosedProject(project.status)
  );
  const openPositions = activeHiring.reduce(
    (total, posting) => total + Math.max(0, posting.openings - posting.hired),
    0
  );
  const hiringApplications = activeHiring.reduce(
    (total, posting) => total + posting.activeApplications,
    0
  );
  const completedProjects = history.filter(
    (entry) => entry.status === "completed" && entry.opportunityType !== "hire"
  ).length;

  const summary = [
    toEvaluate.length > 0 &&
      `${toEvaluate.length} submission${toEvaluate.length === 1 ? "" : "s"} to evaluate`,
    toReview.length > 0 &&
      `${toReview.length} new application${toReview.length === 1 ? "" : "s"}`,
  ].filter(Boolean);
  const name = company?.name ?? user.fullName.trim().split(/\s+/)[0] ?? "";

  const metrics = [
    {
      label: "Active hiring",
      value: activeHiring.length,
      href: "/company/projects?type=hire",
    },
    {
      label: "Open positions",
      value: openPositions,
      href: "/company/projects?type=hire",
    },
    {
      label: "Applications",
      value: hiringApplications,
      href: "/company/candidates",
    },
    {
      label: "Active build projects",
      value: activeBuild.length,
      href: "/company/projects?type=build",
    },
    {
      label: "Completed projects",
      value: completedProjects,
      href: "/company/history?show=projects",
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">
            {greetingFor()}, {name}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {summary.length > 0
              ? `Needs your attention: ${summary.join(" and ")}.`
              : "Manage your hiring and project opportunities."}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href="/company/projects/create?type=build">
            <Button variant="outline">
              <Hammer className="h-4 w-4" aria-hidden />
              Create build project
            </Button>
          </Link>
          <Link href="/company/projects/create?type=hire">
            <Button>
              <Plus className="h-4 w-4" aria-hidden />
              Create hiring opportunity
            </Button>
          </Link>
        </div>
      </header>

      {projects.length === 0 && history.length === 0 ? (
        <section className="rounded-lg border border-line bg-surface p-6">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <Sparkles className="h-4 w-4 text-brand-700" aria-hidden />
            Find talent through real work
          </p>
          <ol className="mt-5 grid gap-4 md:grid-cols-3">
            {FIRST_STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="rounded-lg border border-line p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-ink-400">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <Icon className="h-4 w-4 text-ink-400" aria-hidden />
                  </div>
                  <p className="mt-4 text-sm font-medium text-ink-900">{step.title}</p>
                  <p className="mt-1 text-sm text-ink-500">{step.body}</p>
                </li>
              );
            })}
          </ol>
          <Link href="/company/projects/create" className="mt-5 inline-block">
            <Button>
              <Plus className="h-4 w-4" aria-hidden />
              Create your first opportunity
            </Button>
          </Link>
        </section>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
            {metrics.map((metric) => (
              <Link
                key={metric.label}
                href={metric.href}
                className="flex flex-col bg-surface px-4 py-3 transition-colors hover:bg-ink-50"
              >
                <span className="text-xs text-ink-500">{metric.label}</span>
                <span className="tabular text-xl font-semibold text-ink-900">
                  {metric.value}
                </span>
              </Link>
            ))}
          </div>

          <section aria-labelledby="attention" className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <h2 id="attention" className="text-sm font-semibold text-ink-900">
                Needs your attention
              </h2>
              {attention.length > 6 && (
                <Link
                  href="/company/candidates"
                  className="text-sm font-medium text-brand-700 hover:underline"
                >
                  See all {attention.length}
                </Link>
              )}
            </div>
            {attention.length === 0 ? (
              <div className="flex items-center justify-between gap-4 rounded-xl border border-dashed border-ink-200 bg-surface px-4 py-5">
                <p className="text-sm text-ink-600">
                  You&apos;re all caught up. New applications and submitted work will show
                  here first.
                </p>
                <Link href="/company/projects" className="shrink-0">
                  <Button variant="outline" size="sm">
                    View projects
                  </Button>
                </Link>
              </div>
            ) : (
              <PipelineList entries={attention.slice(0, 6)} />
            )}
          </section>

          <section aria-labelledby="hiring" className="space-y-2">
            <SectionHeading
              id="hiring"
              title="Active hiring"
              count={activeHiring.length}
              href="/company/projects?type=hire"
            />
            <ActiveHiringList postings={activeHiring} />
          </section>

          <section aria-labelledby="build" className="space-y-2">
            <SectionHeading
              id="build"
              title="Active build projects"
              count={activeBuild.length}
              href="/company/projects?type=build"
            />
            <ActiveBuildList projects={activeBuild} pipeline={pipeline} />
          </section>

          <div className="grid items-start gap-6 lg:grid-cols-3">
            <section aria-labelledby="history" className="space-y-2 lg:col-span-2">
              <SectionHeading
                id="history"
                title="Recent history"
                count={history.length}
                href="/company/history"
                linkLabel="Open history"
              />
              {history.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line bg-surface px-4 py-4 text-sm text-ink-500">
                  Filled roles, completed projects and closed opportunities are kept here
                  after they leave Browse.
                </p>
              ) : (
                <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
                  {history.slice(0, 5).map((entry) => (
                    <li
                      key={entry.projectId}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
                    >
                      <span className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium text-ink-900">
                          {entry.title}
                        </span>
                        <OpportunityBadge type={entry.opportunityType} size="sm" />
                      </span>
                      <span className="text-xs text-ink-500">
                        {entry.status === "cancelled"
                          ? "Closed"
                          : entry.opportunityType === "hire"
                            ? `${entry.hired} candidate${entry.hired === 1 ? "" : "s"} hired`
                            : "Completed"}{" "}
                        · {formatMonth(entry.closedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="activity" className="space-y-2">
              <SectionHeading id="activity" title="Recent activity" />
              {notifications.recent.length === 0 ? (
                <p className="rounded-xl border border-dashed border-ink-200 bg-surface px-4 py-5 text-sm text-ink-500">
                  Applications, questions and submissions appear here as they happen.
                </p>
              ) : (
                <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                  {notifications.recent.slice(0, 6).map((item) => {
                    const body = (
                      <>
                        <NotificationIcon type={item.type} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-ink-900">
                            {item.title}
                          </span>
                          <span className="block text-xs text-ink-500">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </span>
                        {!item.read && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500">
                            <span className="sr-only">Unread</span>
                          </span>
                        )}
                      </>
                    );
                    return (
                      <li key={item.id}>
                        {item.linkUrl ? (
                          <Link
                            href={item.linkUrl}
                            className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-ink-50"
                          >
                            {body}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-3 px-4 py-2.5">
                            {body}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              <Link
                href="/company/projects"
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
              >
                All opportunities
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
