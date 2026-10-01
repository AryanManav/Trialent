import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink, GitBranch } from "lucide-react";
import { requireCandidate } from "@/lib/auth/guards";
import { getCandidateProfileId } from "@/lib/data/candidate";
import { getCandidateAssessment } from "@/lib/data/assessment";
import { STAGE_DISPLAY, applicationStage } from "@/lib/applications";
import { JOB_TYPES, WORK_ARRANGEMENTS, companyProfilePath } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { MarkNotificationsRead } from "@/components/notifications/mark-notifications-read";
import { AssessmentForm } from "@/components/assessment/assessment-form";
import {
  AssessmentBrief,
  AssessmentFacts,
} from "@/components/assessment/assessment-brief";
import { OpportunityBadge } from "@/components/projects/opportunity-badge";
import { RoleBadge } from "@/components/profile/role-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProgressBar } from "@/components/ui/progress-bar";

export const dynamic = "force-dynamic";

/**
 * A hire-only role's assessment, from the candidate's side: the brief, their
 * progress and links, and — once they submit — a read-only record of what the
 * company is reviewing. The page stays readable after a decision.
 */
export default async function CandidateAssessmentPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireCandidate();
  const { projectId } = await params;
  const candidateId = await getCandidateProfileId(user.id);
  if (!candidateId) notFound();

  const view = await getCandidateAssessment(candidateId, projectId);
  if (!view) notFound();
  const { project, application, assessment, submission } = view;

  const stage =
    STAGE_DISPLAY[
      applicationStage(
        application.status,
        project.status,
        null,
        "hire",
        submission?.status ?? "not_started"
      )
    ];
  const decided = ["selected", "rejected", "withdrawn"].includes(application.status);
  const closed = project.status === "completed" || project.status === "cancelled";
  const submitted = submission?.status === "submitted";
  const editable = !decided && !closed && !submitted;
  const pastDeadline = new Date(assessment.deadline).getTime() < Date.now();
  const done = submission?.completedRequirements.length ?? 0;
  const percent =
    assessment.requirements.length === 0
      ? 0
      : Math.round((done / assessment.requirements.length) * 100);

  const outcome =
    application.status === "selected"
      ? {
          tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
          text: "You were selected for this role. The company will be in touch about next steps.",
        }
      : application.status === "rejected"
        ? {
            tone: "border-line bg-ink-50 text-ink-700",
            text: application.decisionNote ?? "You weren't selected for this role.",
          }
        : application.status === "withdrawn"
          ? {
              tone: "border-line bg-ink-50 text-ink-700",
              text: "You withdrew from this role.",
            }
          : closed
            ? {
                tone: "border-line bg-ink-50 text-ink-700",
                text: "Hiring for this role has closed.",
              }
            : submitted
              ? {
                  tone: "border-sky-200 bg-sky-50 text-sky-800",
                  text: `Submitted${submission?.submittedAt ? ` on ${formatDate(submission.submittedAt)}` : ""}. The company is reviewing candidates' work — you'll be notified of each step.`,
                }
              : pastDeadline
                ? {
                    tone: "border-amber-200 bg-amber-50 text-amber-800",
                    text: "The assessment deadline has passed, so it can no longer be submitted.",
                  }
                : null;

  return (
    <div className="space-y-6">
      <MarkNotificationsRead
        scopes={[{ link: `/candidate/assessments/${project.id}` }]}
      />

      <Link
        href="/candidate/applications?kind=hire"
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        My applications
      </Link>

      <header className="space-y-2 border-b border-line pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <OpportunityBadge type="hire" />
          <StatusBadge tone={stage.tone} label={stage.label} />
        </div>
        <h1 className="text-2xl font-semibold text-ink-900">{project.title}</h1>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-500">
          <Link
            href={companyProfilePath(project.companyId)}
            className="font-medium text-ink-700 hover:text-brand-700 hover:underline"
          >
            {project.companyName ?? "Startup"}
          </Link>
          <RoleBadge role="company" size="sm" />
          <span aria-hidden>·</span>
          <span>
            {project.openings} opening{project.openings === 1 ? "" : "s"}
          </span>
          {project.jobType && (
            <>
              <span aria-hidden>·</span>
              <span>{JOB_TYPES[project.jobType]}</span>
            </>
          )}
          {project.workArrangement && (
            <>
              <span aria-hidden>·</span>
              <span>{WORK_ARRANGEMENTS[project.workArrangement]}</span>
            </>
          )}
        </p>
      </header>

      {outcome && (
        <p role="status" className={`rounded-md border p-3 text-sm ${outcome.tone}`}>
          {outcome.text}
        </p>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section
          aria-labelledby="assessment-title"
          className="space-y-5 rounded-lg border border-line bg-surface p-5"
        >
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-ink-500">Hiring assessment</p>
            <h2 id="assessment-title" className="text-lg font-semibold text-ink-900">
              {assessment.title}
            </h2>
            <AssessmentFacts assessment={assessment} />
          </div>

          {editable ? (
            <AssessmentForm
              projectId={project.id}
              requirements={assessment.requirements}
              submission={submission}
              canSubmit={!pastDeadline}
            />
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium text-ink-900">Progress</span>
                  <span className="tabular text-ink-700">
                    {percent}% · {done} of {assessment.requirements.length} requirements
                  </span>
                </div>
                <ProgressBar
                  value={percent}
                  label="Assessment progress"
                  className="mt-2"
                />
              </div>
              {submission ? (
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-ink-500">Repository</dt>
                    <dd>
                      {submission.repositoryUrl ? (
                        <a
                          href={submission.repositoryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 break-all font-medium text-brand-700 hover:underline"
                        >
                          <GitBranch className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          {submission.repositoryUrl}
                        </a>
                      ) : (
                        <span className="text-ink-400">Not provided</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-500">Live URL</dt>
                    <dd>
                      {submission.liveUrl ? (
                        <a
                          href={submission.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 break-all font-medium text-brand-700 hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          {submission.liveUrl}
                        </a>
                      ) : (
                        <span className="text-ink-400">Not provided</span>
                      )}
                    </dd>
                  </div>
                  {submission.notes && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-ink-500">Notes</dt>
                      <dd className="whitespace-pre-wrap text-ink-700">
                        {submission.notes}
                      </dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="text-sm text-ink-500">Nothing was submitted.</p>
              )}
            </div>
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <div className="rounded-lg border border-line bg-surface p-4 text-sm">
            <p className="text-xs font-medium text-ink-500">Your application</p>
            <dl className="mt-2 space-y-1.5">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Applied</dt>
                <dd className="text-ink-900">{formatDate(application.createdAt)}</dd>
              </div>
              {submission && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Started</dt>
                  <dd className="text-ink-900">{formatDate(submission.startedAt)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Due</dt>
                <dd className="text-ink-900">{formatDate(assessment.deadline)}</dd>
              </div>
            </dl>
            {!closed && (
              <Link
                href={`/projects/${project.slug}`}
                className="mt-3 inline-block text-xs font-medium text-brand-700 hover:underline"
              >
                View the role
              </Link>
            )}
          </div>
        </aside>
      </div>

      <section
        aria-labelledby="brief-title"
        className="rounded-lg border border-line bg-surface p-5"
      >
        <h2 id="brief-title" className="mb-4 text-sm font-semibold text-ink-900">
          Assessment brief
        </h2>
        <AssessmentBrief assessment={assessment} showTitle={false} />
      </section>
    </div>
  );
}
