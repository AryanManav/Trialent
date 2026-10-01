import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import { CompanyMark } from "@/components/common/company-mark";
import { StatusBadge } from "@/components/ui/status-badge";
import { WORK_STATUS_DISPLAY, isClosedWork, workHref } from "@/lib/applications";
import { dueLabel } from "@/lib/next-action";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { TrialView } from "@/lib/types/domain";

const ACTION: Record<TrialView["workStatus"], string> = {
  in_progress: "Continue project",
  revision_requested: "Revise work",
  submitted: "View submission",
  under_review: "View submission",
  completed: "View evaluation",
  not_accepted: "View feedback",
  cancelled: "View workspace",
};

/** Selected projects, one row each, with the deadline and the next step. */
export function TrialList({
  trials,
  updates = {},
}: {
  trials: TrialView[];
  /** Unread notification count per project id. */
  updates?: Record<string, number>;
}) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {trials.map((trial) => {
        const status = WORK_STATUS_DISPLAY[trial.workStatus];
        const closed = isClosedWork(trial);
        const due = closed ? null : dueLabel(trial.projectDeadline);
        const overdue = due?.startsWith("Overdue") ?? false;
        const fresh = (updates[trial.projectId] ?? 0) > 0;
        return (
          <li key={trial.projectId} className={cn(fresh && "bg-accent-50/40")}>
            <Link
              href={workHref(trial.projectId, trial.opportunityType)}
              className="group flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-ink-50 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <CompanyMark name={trial.companyName ?? "Startup"} />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-ink-900">
                    <span className="truncate">{trial.title}</span>
                    {fresh && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500">
                        <span className="sr-only">New update</span>
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-500">
                    <span>{trial.companyName ?? "Startup"}</span>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" aria-hidden />
                      {due ?? `Deadline ${formatDate(trial.projectDeadline)}`}
                    </span>
                    <span aria-hidden>·</span>
                    <span>{trial.expectedHours}h</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 pl-12 sm:pl-0">
                <span className="tabular text-sm font-medium text-emerald-700">
                  {formatCurrency(trial.paymentAmount, trial.currency)}
                </span>
                <StatusBadge
                  size="sm"
                  tone={overdue ? "danger" : status.tone}
                  label={overdue ? "Overdue" : status.label}
                />
                <span className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-brand-700 sm:ml-2">
                  {trial.opportunityType === "freelance"
                    ? "Open contract"
                    : ACTION[trial.workStatus]}
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
