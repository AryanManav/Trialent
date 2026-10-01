import Link from "next/link";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import {
  getCompanyIdForUser,
  getProjectApplicants,
  getProjectHeader,
} from "@/lib/data/company";
import { StatusBanner } from "@/components/common/status-banner";
import { EmptyState } from "@/components/common/empty-state";
import { ApplicationStatusForm } from "@/components/company/application-status-form";
import { ProjectControls } from "@/components/company/project-controls";
import { HiringPipeline } from "@/components/company/hiring-pipeline";
import { AssessmentSummary } from "@/components/assessment/assessment-brief";
import { OpportunityBadge } from "@/components/projects/opportunity-badge";
import { PageHeader } from "@/components/common/page-header";
import { buttonVariants } from "@/components/ui/button";
import { HIRE_TABS, type HireTab } from "@/lib/company";
import { MarkNotificationsRead } from "@/components/notifications/mark-notifications-read";
import { CountBadge } from "@/components/notifications/count-badge";
import { getNotificationSummary } from "@/lib/data/notifications";
import { cn } from "@/lib/utils";
import { CLOSED_APPLICATION_STATUSES } from "@/lib/constants";
import type { ApplicantView } from "@/lib/types/domain";
import type { ApplicationStatus } from "@/lib/types/database.types";

export const dynamic = "force-dynamic";

const HIRE_UPDATE_MESSAGES: Record<string, string> = {
  reviewing: "Marked under review. The candidate has been notified.",
  shortlisted: "Candidate shortlisted. They've been notified.",
  interview: "Candidate moved to interview. They've been notified.",
  selected:
    "Candidate selected. They've been notified. If that filled the last opening, hiring is complete and everyone still in the running was told.",
  rejected: "Application rejected. The candidate has been notified.",
  withdrawn: "Hiring closed. Candidates still in the running were notified.",
  private: "Role is now private — hidden from Browse, applications paused.",
  public: "Role is public again and taking applications.",
};

const PROJECT_UPDATE_MESSAGES: Record<string, string> = {
  selected: "Candidate selected. They can now see the brief and submit their work.",
  private: "Project is now private — hidden from Browse, applications paused.",
  public: "Project is public again and taking applications.",
  withdrawn: "Project withdrawn. Applicants have been notified.",
};

export default async function ManageProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string; error?: string; stage?: string }>;
}) {
  const user = await requireRole(["company", "admin"]);
  const { id } = await params;
  const { updated, error, stage } = await searchParams;

  const project = await getProjectHeader(id);
  if (!project) notFound();

  if (user.role !== "admin") {
    const companyId = await getCompanyIdForUser(user.id);
    if (companyId !== project.companyId) notFound();
  }

  const [applicants, notifications] = await Promise.all([
    getProjectApplicants(project.id),
    getNotificationSummary(user.id),
  ]);

  const projectPath = `/company/projects/${project.id}`;

  // Hire only: a role's hiring pipeline, not a project's evaluation.
  if (project.opportunityType === "hire") {
    const tab: HireTab = stage && stage in HIRE_TABS ? (stage as HireTab) : "all";
    const unreadApplicants = new Set(
      applicants
        .filter((a) =>
          notifications.unread.some(
            (marker) => marker.linkUrl === `${projectPath}/applicants/${a.id}`
          )
        )
        .map((a) => a.id)
    );
    return (
      <div className="space-y-6">
        <MarkNotificationsRead
          scopes={[{ linkPrefix: `${projectPath}/applicants/` }, { link: projectPath }]}
        />
        <PageHeader
          eyebrow={
            <Link
              href="/company/projects?type=hire"
              className="inline-flex items-center gap-1 hover:text-ink-900"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              Hiring
            </Link>
          }
          title={project.title}
          description="Review applicants, move them through hiring, and select up to your number of openings."
          actions={<OpportunityBadge type="hire" />}
        />
        {error && <StatusBanner tone="error">{error}</StatusBanner>}
        {updated && (
          <StatusBanner tone="success">
            {HIRE_UPDATE_MESSAGES[updated] ??
              PROJECT_UPDATE_MESSAGES[updated] ??
              "Application updated."}
          </StatusBanner>
        )}
        <ProjectControls
          projectId={project.id}
          status={project.status}
          applicationCount={applicants.length}
          applicationDeadline={project.applicationDeadline}
          kind="hire"
        />
        {project.assessment ? (
          <AssessmentSummary assessment={project.assessment} />
        ) : (
          <StatusBanner tone="info">
            This role was posted before hiring assessments, so candidates go straight to
            review.
          </StatusBanner>
        )}
        <HiringPipeline
          project={{
            ...project,
            requirementCount: project.assessment?.requirements.length ?? 0,
          }}
          applicants={applicants}
          tab={tab}
          unreadApplicants={unreadApplicants}
        />
      </div>
    );
  }

  const freelance = project.opportunityType === "freelance";
  // A freelancer's work is reviewed milestone by milestone on the contract page.
  const evaluationPath = (candidateId: string) =>
    freelance ? `${projectPath}/contract` : `${projectPath}/review/${candidateId}`;
  const applicantPath = (applicationId: string) =>
    `${projectPath}/applicants/${applicationId}`;
  const unreadLinks = new Set(notifications.unread.map((marker) => marker.linkUrl));
  // Submitted work and candidate questions link to that candidate's evaluation.
  const evaluationUpdates = (candidateId: string) =>
    notifications.unread.filter(
      (marker) => marker.linkUrl === evaluationPath(candidateId)
    ).length;

  const isClosed = (application: ApplicantView) =>
    (CLOSED_APPLICATION_STATUSES as readonly ApplicationStatus[]).includes(
      application.status
    );
  // Rejected and withdrawn applications leave the main list but stay on record.
  const selectedApplicants = applicants.filter(
    (application) => application.status === "selected"
  );
  const pendingApplicants = applicants.filter(
    (application) => application.status !== "selected" && !isClosed(application)
  );
  const closedApplicants = applicants.filter(isClosed);
  const openingsFull = selectedApplicants.length >= project.openings;
  const withUpdates = selectedApplicants.find(
    (application) => evaluationUpdates(application.candidateId) > 0
  );
  const placesTaken = applicants.filter(
    (application) => application.status !== "withdrawn"
  ).length;

  const renderApplicant = (application: ApplicantView) => {
    const selected = application.status === "selected";
    const updates = selected ? evaluationUpdates(application.candidateId) : 0;
    return (
      <article
        key={application.id}
        className={cn(
          "group relative space-y-fib5 rounded-2xl border bg-surface p-fib6 shadow-xs transition-all",
          selected && "hover:border-brand-300 hover:shadow-md",
          unreadLinks.has(applicantPath(application.id)) || updates > 0
            ? "border-brand-300 ring-2 ring-brand-100"
            : "border-line"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-fib4">
          <div className="min-w-0">
            <div className="flex items-center gap-fib4">
              {selected ? (
                // Stretched over the whole card: a selected candidate opens their evaluation.
                <Link
                  href={evaluationPath(application.candidateId)}
                  className="font-semibold text-ink-900 after:absolute after:inset-0 after:rounded-2xl hover:text-brand-700"
                >
                  {application.candidateName}
                </Link>
              ) : (
                <h2 className="font-semibold text-ink-900">
                  {application.candidateName}
                </h2>
              )}
              {application.status === "submitted" && (
                <span className="rounded-md border border-accent-200 bg-accent-50 px-fib4 py-fib1 text-xs font-semibold text-accent-800">
                  New
                </span>
              )}
            </div>
            <p className="text-sm text-ink-500">
              {application.candidateHeadline || application.candidateEmail}
            </p>
          </div>
          <span className="rounded-md bg-ink-100 px-fib5 py-fib2 text-xs font-semibold capitalize text-ink-700">
            {selected && application.workStatus
              ? `Selected · ${application.workStatus.replaceAll("_", " ")}`
              : application.status.replaceAll("_", " ")}
          </span>
        </div>

        <p className="line-clamp-4 whitespace-pre-wrap text-sm text-ink-700">
          {application.coverMessage}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-fib4 border-t border-line pt-fib5">
          <Link
            href={applicantPath(application.id)}
            className="relative z-10 text-sm font-semibold text-brand-700 hover:underline"
          >
            View full profile →
          </Link>
          {selected ? (
            <span aria-hidden="true" className={buttonVariants()}>
              {freelance ? "Open contract" : "Evaluate work"}
              <CountBadge count={updates} />
              <ArrowRight className="h-4 w-4" />
            </span>
          ) : (
            <div className="relative z-10">
              <ApplicationStatusForm
                applicationId={application.id}
                status={application.status}
                selectionTaken={openingsFull}
              />
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Applicants are on screen now; review-page items stay unread until opened. */}
      <MarkNotificationsRead
        scopes={[{ linkPrefix: `${projectPath}/applicants/` }, { link: projectPath }]}
      />
      <Link href="/company/projects" className="text-sm text-indigo-700">
        ← Projects
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{project.title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review applications, select candidates and evaluate their work.
          </p>
          <div className="mt-fib3 flex flex-wrap gap-fib3 text-xs font-semibold">
            <span className="rounded-md bg-brand-50 px-fib4 py-fib2 text-brand-700">
              {freelance
                ? `Freelance · ${selectedApplicants.length ? "freelancer selected" : "no freelancer yet"}`
                : project.purpose === "hire"
                  ? `${selectedApplicants.length} of ${project.openings} candidate${project.openings === 1 ? "" : "s"} selected`
                  : `Build only · ${selectedApplicants.length ? "candidate selected" : "no candidate yet"}`}
            </span>
            {project.maxApplicants !== null && (
              <span className="rounded-md bg-ink-100 px-fib4 py-fib2 text-ink-700">
                {placesTaken} / {project.maxApplicants} application places taken
              </span>
            )}
          </div>
        </div>
      </div>

      {withUpdates && (
        <Link
          href={evaluationPath(withUpdates.candidateId)}
          className="flex items-center justify-between gap-fib4 rounded-xl border border-brand-200 bg-brand-50 px-fib6 py-fib5 text-sm transition-colors hover:bg-brand-100"
        >
          <span className="font-semibold text-brand-800">
            New from {withUpdates.candidateName} — submitted work or a question.
          </span>
          <span className="shrink-0 font-semibold text-brand-700">
            {freelance ? "Open contract →" : "Evaluate →"}
          </span>
        </Link>
      )}

      {error && <StatusBanner tone="error">{error}</StatusBanner>}
      <ProjectControls
        projectId={project.id}
        status={project.status}
        applicationCount={applicants.length}
        applicationDeadline={project.applicationDeadline}
        kind={project.opportunityType}
      />

      {updated && (
        <StatusBanner tone="success">
          {PROJECT_UPDATE_MESSAGES[updated] ??
            `Application marked as ${updated.replaceAll("_", " ")}.`}
        </StatusBanner>
      )}

      {applicants.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Candidates who apply will appear here. You'll see their full profile before deciding."
        />
      ) : (
        <div className="space-y-fib6">
          {selectedApplicants.length > 0 && (
            <section className="space-y-fib4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Selected · {selectedApplicants.length}
              </h2>
              {selectedApplicants.map((application) => renderApplicant(application))}
            </section>
          )}

          <section className="space-y-fib4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Waiting on you · {pendingApplicants.length}
            </h2>
            {pendingApplicants.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line p-fib6 text-center text-sm text-ink-500">
                No applications waiting on you.
              </p>
            ) : (
              <div className="space-y-fib5">
                {pendingApplicants.map((application) => renderApplicant(application))}
              </div>
            )}
          </section>

          {closedApplicants.length > 0 && (
            <details className="group rounded-2xl border border-line bg-surface">
              <summary className="cursor-pointer list-none px-fib6 py-fib5 text-sm font-semibold text-ink-600 hover:text-ink-900">
                Rejected &amp; withdrawn · {closedApplicants.length}
                <span className="ml-fib3 font-normal text-ink-400 group-open:hidden">
                  Show
                </span>
              </summary>
              <div className="space-y-fib5 border-t border-line p-fib5">
                {closedApplicants.map((application) => renderApplicant(application))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
