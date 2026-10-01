import Link from "next/link";
import { ArrowRight, Inbox, MessageSquareQuote } from "lucide-react";
import { requireCandidate } from "@/lib/auth/guards";
import { getCandidateApplications, getCandidateProfileId } from "@/lib/data/candidate";
import { getNotificationSummary } from "@/lib/data/notifications";
import { MarkNotificationsRead } from "@/components/notifications/mark-notifications-read";
import { EmptyState } from "@/components/common/empty-state";
import { MyWorkHeader } from "@/components/candidate/my-work-header";
import { OpportunityBadge } from "@/components/projects/opportunity-badge";
import { CompanyMark } from "@/components/common/company-mark";
import { FilterChips } from "@/components/ui/filter-chips";
import { Button } from "@/components/ui/button";
import { ApplicationStageBadge } from "@/components/candidate/application-stage-badge";
import { WithdrawApplicationButton } from "@/components/candidate/withdraw-application-button";
import {
  STAGE_DISPLAY,
  applicationHref,
  stageOf,
  type ApplicationStage,
} from "@/lib/applications";
import {
  DEFAULT_CURRENCY,
  WITHDRAWABLE_APPLICATION_STATUSES,
  companyProfilePath,
} from "@/lib/constants";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { ApplicationStatus, OpportunityType } from "@/lib/types/database.types";
import type { ApplicationSummaryView } from "@/lib/types/domain";

export const dynamic = "force-dynamic";

const TABS = {
  all: { label: "All", stages: null },
  assessment: {
    label: "Assessments to do",
    stages: ["assessment_todo", "assessment_in_progress"],
  },
  pending: {
    label: "Pending",
    stages: ["applied", "assessment_submitted", "reviewing", "shortlisted", "interview"],
  },
  active: {
    label: "Active",
    stages: ["building", "awaiting_review", "revision_requested"],
  },
  completed: { label: "Completed", stages: ["completed"] },
  hired: { label: "Selected for a role", stages: ["hired"] },
  rejected: { label: "Rejected", stages: ["not_selected", "work_not_accepted"] },
} as const satisfies Record<string, { label: string; stages: ApplicationStage[] | null }>;

type TabId = keyof typeof TABS;

function inTab(tab: TabId, application: ApplicationSummaryView): boolean {
  const stages: readonly ApplicationStage[] | null = TABS[tab].stages;
  return stages === null || stages.includes(stageOf(application));
}

/** What the candidate should know or do next, for the stages that need a line. */
const STAGE_NOTE: Partial<Record<ApplicationStage, string>> = {
  assessment_todo:
    "Next: complete the hiring assessment. The startup hires on the work you submit.",
  assessment_in_progress: "Your assessment is saved. Submit it before the deadline.",
  assessment_submitted:
    "Your assessment is in. You'll be notified as the startup reviews candidates.",
  shortlisted:
    "You're on the shortlist. Next step: an interview, if the startup invites you.",
  interview: "The startup wants to interview you — look out for their message.",
  hired:
    "You were selected for this role. The startup will be in touch about next steps.",
  building:
    "You were selected. The brief, submission form and message thread are in the workspace.",
  awaiting_review: "Your work is with the startup. You'll be notified when they decide.",
  revision_requested: "The startup asked for changes. Open the workspace to resubmit.",
};

const EMPTY: Record<TabId, { title: string; description: string }> = {
  all: {
    title: "No applications yet",
    description:
      "Apply to a role or a paid project that matches your skills. Every one you complete becomes verified evidence.",
  },
  assessment: {
    title: "No assessments to do",
    description:
      "When you apply to a hire-only role, its hiring assessment appears here until you submit it.",
  },
  pending: {
    title: "Nothing pending",
    description: "Applications waiting on a startup's decision appear here.",
  },
  active: {
    title: "No active work",
    description: "When a startup selects you for a project, it appears here.",
  },
  completed: {
    title: "No completed projects yet",
    description: "Work a startup accepts appears here and on your profile.",
  },
  hired: {
    title: "No roles yet",
    description: "Roles you're selected for through a hiring opportunity appear here.",
  },
  rejected: {
    title: "Nothing here",
    description:
      "Applications that weren't selected, and work that wasn't accepted, appear here with the startup's message.",
  },
};

function ApplicationRow({
  application,
  changed,
}: {
  application: ApplicationSummaryView;
  changed: boolean;
}) {
  const stage = stageOf(application);
  const href = applicationHref(application);
  const note = STAGE_NOTE[stage];
  const canWithdraw = (
    WITHDRAWABLE_APPLICATION_STATUSES as readonly ApplicationStatus[]
  ).includes(application.status);
  const companyName = application.project?.companyName || "Startup";

  return (
    <li className={cn("relative px-4 py-4", changed && "bg-accent-50/40")}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <CompanyMark name={companyName} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {href ? (
                <Link
                  href={href}
                  className="text-sm font-medium text-ink-900 hover:text-brand-700 hover:underline"
                >
                  {application.project?.title ?? "Project"}
                </Link>
              ) : (
                <span className="text-sm font-medium text-ink-900">
                  {application.project?.title ?? "Project"}
                </span>
              )}
              {application.project && (
                <OpportunityBadge type={application.project.opportunityType} size="sm" />
              )}
              {changed && (
                <span className="rounded bg-accent-100 px-1.5 text-2xs font-medium text-accent-800">
                  Updated
                </span>
              )}
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-500">
              {application.project ? (
                <Link
                  href={companyProfilePath(application.project.companyId)}
                  className="hover:text-ink-900 hover:underline"
                >
                  {companyName}
                </Link>
              ) : (
                <span>{companyName}</span>
              )}
              <span aria-hidden>·</span>
              <span>Applied {formatDate(application.createdAt)}</span>
              {application.project?.opportunityType !== "hire" && (
                <>
                  <span aria-hidden>·</span>
                  <span className="tabular font-medium text-ink-700">
                    {formatCurrency(
                      application.project?.paymentAmount ?? 0,
                      application.project?.currency ?? DEFAULT_CURRENCY
                    )}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pl-12 md:pl-0">
          <ApplicationStageBadge stage={stage} />
          {canWithdraw && <WithdrawApplicationButton applicationId={application.id} />}
          {href && (
            <Link href={href} className="ml-auto md:ml-0">
              <Button
                size="sm"
                variant={application.status === "selected" ? "default" : "outline"}
              >
                {STAGE_DISPLAY[stage].action}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {(application.decisionNote || note) && (
        <div className="mt-3 space-y-2 pl-12">
          {application.decisionNote && (
            <blockquote className="rounded-lg border border-line bg-ink-50 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-xs font-medium text-ink-600">
                <MessageSquareQuote className="h-3.5 w-3.5" aria-hidden />
                Message from {companyName}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink-800">
                {application.decisionNote}
              </p>
            </blockquote>
          )}
          {note && <p className="text-xs text-ink-500">{note}</p>}
        </div>
      )}
    </li>
  );
}

export default async function CandidateApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; kind?: string }>;
}) {
  const { tab: tabParam, kind: kindParam } = await searchParams;
  const tab: TabId = tabParam && tabParam in TABS ? (tabParam as TabId) : "all";
  const kind: OpportunityType | null =
    kindParam === "hire" || kindParam === "build" || kindParam === "freelance"
      ? kindParam
      : null;

  const user = await requireCandidate();
  const candidateId = await getCandidateProfileId(user.id);
  const [applications, notifications] = await Promise.all([
    candidateId ? getCandidateApplications(candidateId) : Promise.resolve([]),
    getNotificationSummary(user.id),
  ]);
  // Status changes since the last visit, by project.
  const changed = new Set(
    notifications.unread
      .filter((marker) => marker.type === "application_status")
      .map((marker) => marker.projectId)
  );

  const ofKind = kind
    ? applications.filter((application) => application.project?.opportunityType === kind)
    : applications;
  const shown = ofKind.filter((application) => inTab(tab, application));
  const hrefFor = (next: { tab?: TabId; kind?: OpportunityType | null }) => {
    const url = new URLSearchParams();
    const t = next.tab ?? tab;
    const k = next.kind === undefined ? kind : next.kind;
    if (t !== "all") url.set("tab", t);
    if (k) url.set("kind", k);
    const qs = url.toString();
    return qs ? `/candidate/applications?${qs}` : "/candidate/applications";
  };
  const tabs = (Object.keys(TABS) as TabId[]).map((id) => ({
    id,
    label: TABS[id].label,
    href: hrefFor({ tab: id }),
    count: ofKind.filter((application) => inTab(id, application)).length,
  }));
  const kinds = [
    {
      id: "all",
      label: "Everything",
      href: hrefFor({ kind: null }),
      count: applications.length,
    },
    {
      id: "hire",
      label: "Hire only",
      href: hrefFor({ kind: "hire" }),
      count: applications.filter((a) => a.project?.opportunityType === "hire").length,
    },
    {
      id: "build",
      label: "Build only",
      href: hrefFor({ kind: "build" }),
      count: applications.filter((a) => a.project?.opportunityType === "build").length,
    },
    {
      id: "freelance",
      label: "Freelance",
      href: hrefFor({ kind: "freelance" }),
      count: applications.filter((a) => a.project?.opportunityType === "freelance")
        .length,
    },
  ];

  return (
    <div className="space-y-6">
      <MarkNotificationsRead scopes={[{ linkPrefix: "/candidate/applications" }]} />
      <MyWorkHeader
        section="applications"
        counts={{ applications: applications.length }}
      />

      <div className="space-y-2">
        <FilterChips
          chips={kinds}
          active={kind ?? "all"}
          label="Filter by opportunity type"
        />
        <FilterChips chips={tabs} active={tab} label="Filter applications by status" />
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={EMPTY[tab].title}
          description={EMPTY[tab].description}
          actionText={tab === "all" || tab === "pending" ? "Browse projects" : undefined}
          actionHref={tab === "all" || tab === "pending" ? "/projects" : undefined}
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {shown.map((application) => (
            <ApplicationRow
              key={application.id}
              application={application}
              changed={!!application.project && changed.has(application.project.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
