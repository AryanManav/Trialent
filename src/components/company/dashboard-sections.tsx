import Link from "next/link";
import { BriefcaseBusiness, Hammer, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { RoleBadge } from "@/components/profile/role-badge";
import { OpportunityBadge } from "@/components/projects/opportunity-badge";
import {
  COMPANY_PROJECT_STATUS,
  HIRING_STATE_DISPLAY,
  PIPELINE_DISPLAY,
  hiringState,
  pipelineStage,
} from "@/lib/company";
import { JOB_TYPES, WORK_ARRANGEMENTS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { CompanyProjectView, PipelineEntry } from "@/lib/types/domain";
import { listingTerms } from "@/lib/projects";

/** A section title with an optional "see all" link, GitHub-style: small and quiet. */
export function SectionHeading({
  id,
  title,
  count,
  href,
  linkLabel = "View all",
}: {
  id: string;
  title: string;
  count?: number;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 id={id} className="flex items-center gap-2 text-sm font-semibold text-ink-900">
        {title}
        {count !== undefined && (
          <span className="tabular rounded-full border border-line bg-ink-50 px-1.5 text-2xs font-medium text-ink-600">
            {count}
          </span>
        )}
      </h2>
      {href && (
        <Link href={href} className="text-xs font-medium text-brand-700 hover:underline">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

function EmptyRow({
  icon: Icon,
  text,
  href,
  cta,
}: {
  icon: typeof Hammer;
  text: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-line bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-center gap-2 text-sm text-ink-500">
        <Icon className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
        {text}
      </p>
      <Link href={href} className="shrink-0">
        <Button variant="outline" size="sm">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {cta}
        </Button>
      </Link>
    </div>
  );
}

/** Hire-only postings still on the desk: openings, fills, applications, state. */
export function ActiveHiringList({ postings }: { postings: CompanyProjectView[] }) {
  if (postings.length === 0) {
    return (
      <EmptyRow
        icon={BriefcaseBusiness}
        text="No active hiring opportunities. Post a role to start receiving candidates."
        href="/company/projects/create?type=hire"
        cta="Create hiring opportunity"
      />
    );
  }
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {postings.map((posting) => {
        const state = HIRING_STATE_DISPLAY[hiringState(posting)];
        return (
          <li
            key={posting.id}
            className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/company/projects/${posting.id}`}
                  className="truncate text-sm font-semibold text-ink-900 hover:text-brand-700 hover:underline"
                >
                  {posting.title}
                </Link>
                <OpportunityBadge type="hire" size="sm" />
                <StatusBadge size="sm" tone={state.tone} label={state.label} />
              </div>
              <p className="text-xs text-ink-500">
                {[
                  `${posting.openings} opening${posting.openings === 1 ? "" : "s"}`,
                  `${posting.hired} / ${posting.openings} selected`,
                  posting.maxApplicants !== null
                    ? `${posting.activeApplications} / ${posting.maxApplicants} applications`
                    : `${posting.activeApplications} applications`,
                  posting.jobType && JOB_TYPES[posting.jobType],
                  posting.workArrangement && WORK_ARRANGEMENTS[posting.workArrangement],
                ]
                  .filter(Boolean)
                  .join(" · ")}
                {posting.awaitingReview > 0 && (
                  <span className="font-medium text-accent-700">
                    {" "}
                    · {posting.awaitingReview} new
                  </span>
                )}
              </p>
            </div>
            <Link href={`/company/projects/${posting.id}`} className="shrink-0">
              <Button variant="outline" size="sm">
                Manage applicants
              </Button>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Build-only projects still live: the fee, who is building it and where their
 * work stands, and the deadline. No progress percentage — Trialent doesn't
 * measure one, so it doesn't show one.
 */
export function ActiveBuildList({
  projects,
  pipeline,
}: {
  projects: CompanyProjectView[];
  pipeline: PipelineEntry[];
}) {
  if (projects.length === 0) {
    return (
      <EmptyRow
        icon={Hammer}
        text="No active build projects. Create a project and find a candidate to complete it."
        href="/company/projects/create?type=build"
        cta="Create build project"
      />
    );
  }
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {projects.map((project) => {
        const builders = pipeline.filter(
          (entry) =>
            entry.projectId === project.id && entry.applicationStatus === "selected"
        );
        const status = COMPANY_PROJECT_STATUS[project.status];
        return (
          <li
            key={project.id}
            className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={
                    project.freelance
                      ? `/company/projects/${project.id}/contract`
                      : `/company/projects/${project.id}`
                  }
                  className="truncate text-sm font-semibold text-ink-900 hover:text-brand-700 hover:underline"
                >
                  {project.title}
                </Link>
                <OpportunityBadge type={project.opportunityType} size="sm" />
                <StatusBadge size="sm" tone={status.tone} label={status.label} />
              </div>
              <p className="text-xs text-ink-500">
                <span className="tabular font-medium text-ink-700">
                  {listingTerms(project).price}
                </span>
                {builders.length === 0
                  ? ` · ${project.activeApplications} applicant${project.activeApplications === 1 ? "" : "s"} · Apply by ${formatDate(project.applicationDeadline)}`
                  : ` · Due ${formatDate(builders[0].projectDeadline)}`}
              </p>
              {builders.map((builder) => {
                const stage =
                  PIPELINE_DISPLAY[
                    pipelineStage(builder.applicationStatus, builder.workStatus, "build")
                  ];
                return (
                  <p
                    key={builder.applicationId}
                    className="flex flex-wrap items-center gap-1.5 text-xs text-ink-600"
                  >
                    <span className="text-ink-500">Candidate</span>
                    <span className="font-medium text-ink-900">
                      {builder.candidateName}
                    </span>
                    <RoleBadge role="candidate" size="sm" />
                    <span aria-hidden>·</span>
                    <span>{stage.label}</span>
                  </p>
                );
              })}
            </div>
            <Link href={`/company/projects/${project.id}`} className="shrink-0">
              <Button variant="outline" size="sm">
                View project
              </Button>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
