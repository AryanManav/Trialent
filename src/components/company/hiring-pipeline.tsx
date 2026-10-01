import Link from "next/link";
import { ExternalLink, GitBranch, Users } from "lucide-react";
import { Avatar } from "@/components/common/avatar";
import { EmptyState } from "@/components/common/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { LinkTabs } from "@/components/ui/tabs";
import { RoleBadge } from "@/components/profile/role-badge";
import { SkillTags } from "@/components/search/result-rows";
import { HiringDecision } from "@/components/company/hiring-decision";
import {
  HIRE_STAGE_DISPLAY,
  HIRE_TABS,
  HIRING_STATE_DISPLAY,
  hireStage,
  hiringState,
  inHireTab,
  type HireTab,
  type HiringState,
} from "@/lib/company";
import { cn, formatDate } from "@/lib/utils";
import type { ApplicantView } from "@/lib/types/domain";
import type { ProjectStatus } from "@/lib/types/database.types";

const STATE_NOTE: Record<HiringState, string> = {
  private: "Private — hidden from Browse. Make it public to take applications.",
  open: "Open — listed in Browse and taking applications.",
  applications_full:
    "Applications full — still listed, but Apply is disabled. If a candidate withdraws, it reopens automatically.",
  partially_filled: "Partially filled — keep hiring until every opening is filled.",
  hiring:
    "Applications closed — the deadline has passed. Review and select from those received.",
  stalled:
    "Nobody is left in the running and the deadline has passed. Close hiring to move this role to your history.",
  completed:
    "Hiring complete — every opening is filled. It has left Browse and is in your history.",
  closed:
    "Closed — hiring stopped before every opening was filled. It's in your history.",
};

/**
 * A hire-only posting's applicants: where the posting stands, how many of the
 * openings are filled, how close it is to its application limit, when things
 * happened, and each candidate moving through
 * Applied → Assessment → Under review → Shortlisted → Interview → Selected,
 * as a dense table with their assessment and submitted work alongside.
 */
export function HiringPipeline({
  project,
  applicants,
  tab,
  unreadApplicants,
}: {
  project: {
    id: string;
    status: ProjectStatus;
    openings: number;
    maxApplicants: number | null;
    applicationDeadline: string;
    createdAt: string;
    closedAt: string | null;
    /** Candidates complete an assessment before they can move forward. */
    hasAssessment: boolean;
    /** How many requirements the assessment lists, for "3 / 5 done". */
    requirementCount: number;
  };
  applicants: ApplicantView[];
  tab: HireTab;
  /** Application ids with an unread notification. */
  unreadApplicants: Set<string>;
}) {
  const projectPath = `/company/projects/${project.id}`;
  const hires = applicants
    .filter((a) => a.status === "selected")
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  // Withdrawn applications give their place back; everything else holds one.
  const active = applicants.filter((a) => a.status !== "withdrawn").length;
  const state = hiringState({
    ...project,
    activeApplications: active,
    hired: hires.length,
    inRunning: applicants.filter(
      (a) =>
        a.status !== "withdrawn" && a.status !== "rejected" && a.status !== "selected"
    ).length,
  });
  const display = HIRING_STATE_DISPLAY[state];
  const filled = hires.length >= project.openings;
  const finished = state === "completed" || state === "closed";
  const stageOf = (a: ApplicantView) =>
    hireStage(
      a.status,
      project.hasAssessment ? (a.assessment?.status ?? "not_started") : null
    );
  const shown = applicants.filter((a) => inHireTab(tab, stageOf(a)));

  const timeline = [
    { label: "Posted", value: formatDate(project.createdAt) },
    {
      label: finished ? "Applications closed" : "Apply by",
      value: formatDate(project.applicationDeadline),
    },
    ...(project.closedAt
      ? [
          {
            label: state === "completed" ? "Hiring completed" : "Closed",
            value: formatDate(project.closedAt),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-5">
      <section
        aria-label="Hiring status"
        className="rounded-lg border border-line bg-surface"
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <StatusBadge tone={display.tone} label={display.label} />
          <p className="text-sm text-ink-600">{STATE_NOTE[state]}</p>
        </div>

        <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-ink-900">Positions filled</p>
              <p className="tabular text-sm text-ink-700">
                <span className="font-semibold text-ink-900">{hires.length}</span> /{" "}
                {project.openings}
              </p>
            </div>
            <ProgressBar
              value={(hires.length / project.openings) * 100}
              label="Positions filled"
              tone={filled ? "success" : "brand"}
              className="mt-2"
            />
            <p className="mt-1.5 text-xs text-ink-500">
              {filled
                ? "All openings filled"
                : `${project.openings - hires.length} position${project.openings - hires.length === 1 ? "" : "s"} remaining`}
            </p>
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-ink-900">Active applications</p>
              <p className="tabular text-sm text-ink-700">
                <span className="font-semibold text-ink-900">{active}</span>
                {project.maxApplicants !== null && <> / {project.maxApplicants}</>}
              </p>
            </div>
            {project.maxApplicants !== null && (
              <ProgressBar
                value={(active / project.maxApplicants) * 100}
                label="Active applications"
                tone={state === "applications_full" ? "warning" : "brand"}
                className="mt-2"
              />
            )}
            <p className="mt-1.5 text-xs text-ink-500">
              Withdrawn applications don&apos;t count toward the limit.
            </p>
          </div>
        </div>

        <dl className="flex flex-wrap gap-x-6 gap-y-1 border-t border-line px-4 py-3 text-xs">
          {timeline.map((item) => (
            <div key={item.label} className="flex gap-1.5">
              <dt className="text-ink-500">{item.label}</dt>
              <dd className="font-medium text-ink-900">{item.value}</dd>
            </div>
          ))}
          {hires.length > 0 && (
            <div className="flex basis-full flex-wrap gap-x-4 gap-y-1">
              <dt className="text-ink-500">Hired</dt>
              {hires.map((hire) => (
                <dd key={hire.id} className="text-ink-900">
                  <Link
                    href={`${projectPath}/applicants/${hire.id}`}
                    className="font-medium hover:text-brand-700 hover:underline"
                  >
                    {hire.candidateName}
                  </Link>
                  <span className="text-ink-500"> · {formatDate(hire.updatedAt)}</span>
                </dd>
              ))}
            </div>
          )}
        </dl>
      </section>

      <LinkTabs
        label="Hiring stage"
        active={tab}
        tabs={(Object.keys(HIRE_TABS) as HireTab[]).map((id) => ({
          id,
          label: HIRE_TABS[id].label,
          href: id === "all" ? projectPath : `${projectPath}?stage=${id}`,
          count: applicants.filter((a) => inHireTab(id, stageOf(a))).length,
        }))}
      />

      {applicants.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No applications yet"
          description="Candidates who apply appear here with their profile, skills and verified work."
        />
      ) : shown.length === 0 ? (
        <EmptyState
          compact
          icon={Users}
          title={`No one is ${HIRE_TABS[tab].label.toLowerCase()} yet`}
          description="Candidates move here as you progress them through hiring."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="hidden border-b border-line bg-ink-50 text-xs text-ink-500 lg:table-header-group">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">
                  Candidate
                </th>
                {project.hasAssessment && (
                  <>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Assessment
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Submission
                    </th>
                  </>
                )}
                <th scope="col" className="px-3 py-2 font-medium">
                  Skills
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Applied
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((applicant) => {
                const stage = HIRE_STAGE_DISPLAY[stageOf(applicant)];
                const applicantPath = `${projectPath}/applicants/${applicant.id}`;
                const work = applicant.assessment;
                const awaiting = project.hasAssessment && work?.status !== "submitted";
                return (
                  <tr
                    key={applicant.id}
                    className={cn(
                      "flex flex-col gap-2 px-4 py-3 align-middle lg:table-row lg:px-0 lg:py-0",
                      unreadApplicants.has(applicant.id) && "bg-accent-50/40"
                    )}
                  >
                    <td className="lg:px-4 lg:py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar
                          name={applicant.candidateName}
                          src={applicant.candidateAvatarUrl}
                          className="h-8 w-8 shrink-0 rounded-full text-[10px]"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Link
                              href={applicantPath}
                              className="font-medium text-ink-900 hover:text-brand-700 hover:underline"
                            >
                              {applicant.candidateName}
                            </Link>
                            <RoleBadge role="candidate" size="sm" />
                          </div>
                          <p className="max-w-[14rem] truncate text-xs text-ink-500">
                            {applicant.candidateHeadline ?? "Candidate"}
                          </p>
                        </div>
                      </div>
                    </td>
                    {project.hasAssessment && (
                      <>
                        <td className="text-xs text-ink-600 lg:px-3 lg:py-2.5">
                          {!work ? (
                            <span className="text-ink-500">Not started</span>
                          ) : work.status === "submitted" ? (
                            <span className="font-medium text-ink-900">
                              Submitted
                              {work.submittedAt && (
                                <span className="font-normal text-ink-500">
                                  {" "}
                                  · {formatDate(work.submittedAt)}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span>
                              In progress
                              {project.requirementCount > 0 && (
                                <span className="tabular text-ink-500">
                                  {" "}
                                  · {work.completedRequirements.length} /{" "}
                                  {project.requirementCount}
                                </span>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="text-xs lg:px-3 lg:py-2.5">
                          {work?.status === "submitted" &&
                          (work.repositoryUrl || work.liveUrl) ? (
                            <span className="flex flex-wrap gap-x-3 gap-y-1">
                              {work.repositoryUrl && (
                                <a
                                  href={work.repositoryUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
                                >
                                  <GitBranch className="h-3.5 w-3.5" aria-hidden />
                                  Repository
                                </a>
                              )}
                              {work.liveUrl && (
                                <a
                                  href={work.liveUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                                  Live
                                </a>
                              )}
                            </span>
                          ) : (
                            <span className="text-ink-400">—</span>
                          )}
                        </td>
                      </>
                    )}
                    <td className="lg:px-3 lg:py-2.5">
                      {applicant.candidateSkills.length > 0 ? (
                        <SkillTags skills={applicant.candidateSkills} limit={3} />
                      ) : (
                        <span className="text-xs text-ink-400">No skills listed</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-xs text-ink-600 lg:px-3 lg:py-2.5">
                      <span className="lg:hidden">Applied </span>
                      {formatDate(applicant.appliedAt)}
                    </td>
                    <td className="lg:px-3 lg:py-2.5">
                      <StatusBadge size="sm" tone={stage.tone} label={stage.label} />
                    </td>
                    <td className="lg:px-4 lg:py-2.5">
                      <div className="flex flex-col items-start gap-1 lg:items-end">
                        <HiringDecision
                          applicationId={applicant.id}
                          status={applicant.status}
                          openingsFilled={filled || state === "closed"}
                          awaitingAssessment={awaiting}
                          stage={tab === "all" ? undefined : tab}
                          align="end"
                        />
                        <Link
                          href={applicantPath}
                          className="text-xs font-medium text-brand-700 hover:underline"
                        >
                          {work?.status === "submitted"
                            ? "View assessment"
                            : "View application"}
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
