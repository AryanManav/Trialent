import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Avatar } from "@/components/common/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  PIPELINE_DISPLAY,
  pipelineHref,
  entryAssessment,
  pipelineStage,
} from "@/lib/company";
import { dueLabel } from "@/lib/next-action";
import { cn, formatDate } from "@/lib/utils";
import type { PipelineEntry } from "@/lib/types/domain";

/**
 * Candidates across projects, one row each: who, for what, where they stand,
 * and the one action that moves them on. `detail` picks the date that matters
 * — when they applied, or when their work is due.
 */
export function PipelineList({
  entries,
  detail = "applied",
  showProject = true,
}: {
  entries: PipelineEntry[];
  detail?: "applied" | "deadline";
  showProject?: boolean;
}) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {entries.map((entry) => {
        const stage = pipelineStage(
          entry.applicationStatus,
          entry.workStatus,
          entry.opportunityType,
          entryAssessment(entry)
        );
        const display = PIPELINE_DISPLAY[stage];
        const urgent = stage === "new" || stage === "to_evaluate";
        // Hire postings have no work deadline — build projects and contracts do.
        const due =
          detail === "deadline" && entry.opportunityType !== "hire"
            ? dueLabel(entry.projectDeadline)
            : null;
        return (
          <li key={entry.applicationId}>
            <Link
              href={pipelineHref(entry)}
              className="group flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-ink-50 md:flex-row md:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar
                  name={entry.candidateName}
                  src={entry.candidateAvatarUrl}
                  className="h-9 w-9 rounded-full text-2xs"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">
                    {entry.candidateName}
                    {entry.candidateHeadline && (
                      <span className="font-normal text-ink-500">
                        {" "}
                        · {entry.candidateHeadline}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-ink-500">
                    {showProject && <>{entry.projectTitle} · </>}
                    {due ?? `Applied ${formatDate(entry.appliedAt)}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 pl-12 md:pl-0">
                <StatusBadge size="sm" tone={display.tone} label={display.label} />
                <span
                  className={cn(
                    "ml-auto inline-flex w-36 items-center justify-end gap-1 text-sm font-medium md:ml-0",
                    urgent ? "text-brand-700" : "text-ink-500 group-hover:text-ink-800"
                  )}
                >
                  {display.action}
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
