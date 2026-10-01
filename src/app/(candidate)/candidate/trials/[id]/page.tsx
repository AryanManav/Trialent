import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Clock,
  FileText,
  GitBranch,
  Hourglass,
  Laptop,
  ListChecks,
  MessagesSquare,
  Package,
  RotateCcw,
  Scale,
  Send,
  XCircle,
} from "lucide-react";
import { requireCandidate } from "@/lib/auth/guards";
import {
  getCandidateProfileId,
  getCandidateProjectEvaluation,
} from "@/lib/data/candidate";
import { WORK_STATUS_DISPLAY, isClosedWork, workHref } from "@/lib/applications";
import { getCandidateTrial } from "@/lib/data/trial";
import { getProjectThread } from "@/lib/data/thread";
import { dueLabel } from "@/lib/next-action";
import { MarkNotificationsRead } from "@/components/notifications/mark-notifications-read";
import { SubmitWorkForm } from "@/components/candidate/submit-work-form";
import { EvaluationCard } from "@/components/candidate/evaluation-card";
import { RequirementChecklist } from "@/components/candidate/requirement-checklist";
import { WorkStepper } from "@/components/candidate/work-stepper";
import { ProjectThread } from "@/components/common/project-thread";
import { SectionCard } from "@/components/common/section-card";
import { AttachmentList } from "@/components/common/attachment-list";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { BriefList, BriefSection } from "@/components/projects/brief";
import { WORK_MODES, companyProfilePath } from "@/lib/constants";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { SubmissionView } from "@/lib/types/domain";

export const dynamic = "force-dynamic";

const LOCAL_STEPS = [
  {
    icon: GitBranch,
    text: "Create a repository and commit as you go — the history is evidence.",
  },
  { icon: Laptop, text: "Build in your own tools, against the acceptance criteria." },
  {
    icon: MessagesSquare,
    text: "Ask in Clarifications if anything in the brief is unclear.",
  },
  { icon: Send, text: "Submit the repository, plus any files a repo can't hold." },
];

const DECISION: Record<
  SubmissionView["status"],
  { label: string; tone: StatusTone; icon: typeof CheckCircle2; accent: string }
> = {
  submitted: {
    label: "Waiting for review",
    tone: "warning",
    icon: Hourglass,
    accent: "bg-amber-400",
  },
  under_review: {
    label: "Under review",
    tone: "warning",
    icon: Hourglass,
    accent: "bg-amber-400",
  },
  accepted: {
    label: "Accepted",
    tone: "success",
    icon: CheckCircle2,
    accent: "bg-emerald-500",
  },
  revision_requested: {
    label: "Revision requested",
    tone: "attention",
    icon: RotateCcw,
    accent: "bg-accent-500",
  },
  rejected: {
    label: "Not accepted",
    tone: "danger",
    icon: XCircle,
    accent: "bg-rose-500",
  },
};

/**
 * The startup's latest decision, pinned near the top so the candidate never
 * has to hunt for it — with the message, and a way to reply.
 */
function DecisionPanel({
  submission,
  companyName,
  canResubmit,
}: {
  submission: SubmissionView;
  companyName: string;
  canResubmit: boolean;
}) {
  const style = DECISION[submission.status];
  const Icon = style.icon;
  const decided = submission.reviewedAt !== null;

  return (
    <section
      aria-label="Startup's decision"
      className="relative overflow-hidden rounded-xl border border-line bg-surface p-5"
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", style.accent)} />
      <div className="flex items-start gap-4">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-ink-500" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-2xs font-semibold uppercase tracking-wider text-ink-500">
              {decided ? `${companyName}'s decision` : "Your latest submission"}
            </p>
            <StatusBadge size="sm" tone={style.tone} label={style.label} />
          </div>
          <h2 className="text-base font-semibold text-ink-900">
            {!decided
              ? "Submitted — waiting for the startup's decision"
              : submission.status === "revision_requested"
                ? "Changes requested before a final decision"
                : submission.status === "accepted"
                  ? "Your work was accepted"
                  : "Your work wasn't accepted"}
          </h2>
          <p className="text-xs text-ink-500">
            Submitted {formatDate(submission.submittedAt)}
            {submission.reviewedAt && ` · decided ${formatDate(submission.reviewedAt)}`}
          </p>
          {submission.reviewNote && (
            <blockquote className="whitespace-pre-wrap rounded-lg border border-line bg-ink-50 px-4 py-3 text-sm text-ink-800">
              {submission.reviewNote}
            </blockquote>
          )}
          {!decided && (
            <p className="text-sm text-ink-600">
              You&apos;ll get a notification the moment they decide.
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {submission.status === "revision_requested" && canResubmit && (
              <a href="#submit-work">
                <Button size="sm">
                  <Send className="h-3.5 w-3.5" aria-hidden />
                  Submit a revision
                </Button>
              </a>
            )}
            <a href="#clarifications">
              <Button size="sm" variant="outline">
                <MessagesSquare className="h-3.5 w-3.5" aria-hidden />
                {decided ? `Reply to ${companyName}` : "Message the startup"}
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function CandidateTrialWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireCandidate();
  const { id } = await params;
  const candidateId = await getCandidateProfileId(user.id);
  if (!candidateId) notFound();

  const [trial, messages, evaluation] = await Promise.all([
    getCandidateTrial(candidateId, id),
    getProjectThread(id, candidateId, user.id),
    getCandidateProjectEvaluation(candidateId, id),
  ]);
  if (!trial) notFound();
  // Freelance work is delivered milestone by milestone on its contract page.
  if (trial.opportunityType === "freelance") redirect(workHref(id, "freelance"));

  const closed = isClosedWork(trial);
  const cancelled = trial.status === "cancelled" || trial.workStatus === "cancelled";
  const accepted = trial.workStatus === "completed";
  const latest = trial.submissions[0];
  const mode = WORK_MODES[trial.workMode];
  const status = WORK_STATUS_DISPLAY[trial.workStatus];
  const due = closed ? null : dueLabel(trial.projectDeadline);
  const overdue = due?.startsWith("Overdue") ?? false;
  const companyName = trial.companyName || "The startup";

  return (
    <div className="space-y-6">
      <MarkNotificationsRead scopes={[{ projectId: id }]} />
      <Link
        href={closed ? "/candidate/completed" : "/candidate/trials"}
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {closed ? "Completed work" : "Active work"}
      </Link>

      <header className="rounded-xl border border-line bg-surface">
        <div className="flex flex-col justify-between gap-5 p-5 lg:flex-row lg:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={status.tone} label={status.label} />
              <span className="rounded-md border border-line px-2 py-0.5 text-xs font-medium text-ink-600">
                {mode.label}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-ink-900">{trial.title}</h1>
            <Link
              href={companyProfilePath(trial.companyId)}
              className="mt-1 inline-block text-sm text-ink-500 hover:text-ink-900 hover:underline"
            >
              {companyName}
            </Link>
          </div>
          <dl className="grid shrink-0 grid-cols-3 gap-6 lg:text-right">
            <div>
              <dt className="text-xs text-ink-500">Fee</dt>
              <dd className="tabular mt-0.5 text-lg font-semibold text-emerald-700">
                {formatCurrency(trial.paymentAmount, trial.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">Deadline</dt>
              <dd
                className={cn(
                  "mt-0.5 text-lg font-semibold",
                  overdue ? "text-rose-700" : "text-ink-900"
                )}
              >
                {due ?? formatDate(trial.projectDeadline)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">Effort</dt>
              <dd className="tabular mt-0.5 text-lg font-semibold text-ink-900">
                {trial.expectedHours}h
              </dd>
            </div>
          </dl>
        </div>
        {!cancelled && (
          <div className="border-t border-line px-5 py-3.5">
            <WorkStepper status={trial.workStatus} />
          </div>
        )}
      </header>

      {cancelled && (
        <div className="rounded-xl border border-line bg-surface p-5 text-sm text-ink-600">
          <p className="font-semibold text-ink-900">Project cancelled</p>
          <p className="mt-1">
            The startup closed this project. Your submissions stay below for reference.
          </p>
        </div>
      )}

      {latest && (
        <DecisionPanel
          submission={latest}
          companyName={companyName}
          canResubmit={trial.canSubmit}
        />
      )}

      {evaluation.feedback ? (
        <EvaluationCard
          evaluation={evaluation}
          companyName={companyName}
          accepted={accepted}
        />
      ) : (
        accepted && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <CheckCircle2
              className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
              aria-hidden
            />
            <div className="text-sm">
              <p className="font-semibold text-emerald-900">
                Accepted — now on your verified work history
              </p>
              <p className="mt-0.5 text-emerald-900/80">
                The startup&apos;s structured evaluation will appear here if they record
                it.
              </p>
            </div>
          </div>
        )
      )}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {trial.requirements.length > 0 && !closed && (
            <SectionCard title="Requirements" icon={ListChecks}>
              <RequirementChecklist
                projectId={trial.projectId}
                requirements={trial.requirements}
                readOnly={!trial.canSubmit}
              />
            </SectionCard>
          )}

          <SectionCard title="The brief" icon={FileText}>
            <div className="space-y-6">
              <BriefSection title="Overview">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                  {trial.problemStatement}
                </p>
                {trial.context && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-500">
                    {trial.context}
                  </p>
                )}
              </BriefSection>
              {closed && trial.requirements.length > 0 && (
                <BriefSection title="Requirements" icon={ListChecks}>
                  <BriefList items={trial.requirements} numbered />
                </BriefSection>
              )}
              <BriefSection title="Deliverables" icon={Package}>
                <BriefList items={trial.deliverables} />
              </BriefSection>
              <BriefSection title="Acceptance criteria" icon={ClipboardCheck}>
                <BriefList items={trial.acceptanceCriteria} />
              </BriefSection>
              {trial.evaluationCriteria.length > 0 && (
                <BriefSection title="How you'll be evaluated" icon={Scale}>
                  <BriefList items={trial.evaluationCriteria} />
                </BriefSection>
              )}
            </div>
          </SectionCard>

          {!closed && (
            <SectionCard
              id="submit-work"
              title={latest ? "Submit a revision" : "Submit your work"}
              icon={Send}
            >
              {trial.canSubmit ? (
                <SubmitWorkForm
                  projectId={trial.projectId}
                  userId={user.id}
                  isResubmission={Boolean(latest)}
                />
              ) : (
                <p className="text-sm text-ink-500">
                  Your work is with the startup. You can submit again if they request a
                  revision.
                </p>
              )}
            </SectionCard>
          )}

          {trial.submissions.length > 0 && (
            <SectionCard
              title="Your submissions"
              icon={GitBranch}
              count={trial.submissions.length}
            >
              <ol className="space-y-3">
                {trial.submissions.map((submission, index) => (
                  <li
                    key={submission.id}
                    className="space-y-3 rounded-lg border border-line p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-ink-500">
                        <span className="font-medium text-ink-700">
                          Submission {trial.submissions.length - index}
                        </span>{" "}
                        · {formatDate(submission.submittedAt)}
                      </span>
                      <StatusBadge
                        size="sm"
                        tone={DECISION[submission.status].tone}
                        label={DECISION[submission.status].label}
                      />
                    </div>
                    <a
                      href={submission.repositoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block break-all font-mono text-xs text-brand-700 hover:underline"
                    >
                      {submission.repositoryUrl}
                    </a>
                    <p className="whitespace-pre-wrap text-sm text-ink-700">
                      {submission.submissionNotes}
                    </p>
                    <AttachmentList attachments={submission.attachments} />
                    {submission.reviewNote && (
                      <div className="rounded-md border border-line bg-ink-50 px-3 py-2.5">
                        <p className="text-xs font-medium text-ink-600">
                          {companyName}&apos;s message
                          {submission.reviewedAt &&
                            ` · ${formatDate(submission.reviewedAt)}`}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-ink-800">
                          {submission.reviewNote}
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </SectionCard>
          )}
        </div>

        <aside className="space-y-6">
          {!closed && (
            <div className="rounded-xl border border-line bg-surface p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <CalendarClock className="h-4 w-4 text-ink-400" aria-hidden />
                Due {formatDate(trial.projectDeadline)}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm text-ink-500">
                <Clock className="h-4 w-4 text-ink-400" aria-hidden />
                About {trial.expectedHours} hours of work
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {trial.canSubmit && (
                  <a href="#submit-work">
                    <Button className="w-full">
                      <Send className="h-4 w-4" aria-hidden />
                      {latest ? "Submit a revision" : "Submit your work"}
                    </Button>
                  </a>
                )}
                <a href="#clarifications">
                  <Button variant="outline" className="w-full">
                    <MessagesSquare className="h-4 w-4" aria-hidden />
                    Ask a question
                  </Button>
                </a>
              </div>
            </div>
          )}

          {!closed && (
            <section className="rounded-xl border border-line bg-surface p-5">
              <h2 className="text-sm font-semibold text-ink-900">How to work on this</h2>
              <ol className="mt-3 space-y-3">
                {LOCAL_STEPS.map((step) => {
                  const Icon = step.icon;
                  return (
                    <li key={step.text} className="flex gap-3 text-sm text-ink-600">
                      <Icon
                        className="mt-0.5 h-4 w-4 shrink-0 text-ink-400"
                        aria-hidden
                      />
                      {step.text}
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          <ProjectThread
            projectId={trial.projectId}
            messages={messages}
            viewer="candidate"
          />
        </aside>
      </div>
    </div>
  );
}
