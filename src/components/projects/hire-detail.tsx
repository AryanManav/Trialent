import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  CalendarClock,
  ChevronLeft,
  Code2,
  FileText,
  Globe,
  GraduationCap,
  ListChecks,
  MapPin,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { ApplicationForm } from "@/components/candidate/application-form";
import { Avatar } from "@/components/common/avatar";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { RoleBadge } from "@/components/profile/role-badge";
import { OpportunityBadge } from "@/components/projects/opportunity-badge";
import { BriefList, BriefSection, StackList } from "@/components/projects/brief";
import { AssessmentBrief } from "@/components/assessment/assessment-brief";
import {
  EXPERIENCE_LEVELS,
  JOB_TYPES,
  WORK_ARRANGEMENTS,
  companyProfilePath,
} from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { ProjectDetailView } from "@/lib/types/domain";
import type { UserRole } from "@/lib/types/database.types";

const CLOSED_NOTE = {
  full: "Applications for this role are currently full. If a candidate withdraws, a place opens and you can apply.",
  selected: "Applications for this role have closed.",
  closed: "Applications for this role have closed.",
} as const;

/**
 * A hire-only opportunity: a role with several openings, filled on the work
 * candidates submit for its (unpaid) hiring assessment — the role, the
 * assessment, how many are being hired, and how many have applied.
 */
export function HireOpportunityDetail({
  project,
  viewerRole,
  existing,
}: {
  project: ProjectDetailView;
  viewerRole: UserRole;
  existing: { createdAt: string } | null;
}) {
  const open = project.availability === "open";
  const canApply = viewerRole === "candidate" && !existing && open;
  const company = project.companyName || "the startup";
  const tags = [
    project.jobType && JOB_TYPES[project.jobType],
    project.workArrangement && WORK_ARRANGEMENTS[project.workArrangement],
    project.jobLocation,
  ].filter((tag): tag is string => Boolean(tag));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link
        href="/projects?kind=hire"
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Hiring opportunities
      </Link>

      <header className="mt-4 border-b border-line pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <OpportunityBadge type="hire" />
          <StatusBadge
            tone={
              open ? "success" : project.availability === "full" ? "warning" : "neutral"
            }
            label={
              open
                ? "Open"
                : project.availability === "full"
                  ? "Applications full"
                  : "Applications closed"
            }
          />
        </div>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold text-ink-900">
          {project.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-500">
          <Link
            href={companyProfilePath(project.companyId)}
            className="font-medium text-ink-700 hover:text-brand-700 hover:underline"
          >
            {project.companyName || "Startup"}
          </Link>
          <RoleBadge role="company" size="sm" />
          {project.company.verified && (
            <BadgeCheck
              className="h-4 w-4 text-emerald-700"
              aria-label="Verified company"
            />
          )}
        </div>
        {tags.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li
                key={tag}
                className="rounded-md border border-line bg-surface px-2 py-0.5 text-xs font-medium text-ink-600"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 max-w-3xl text-base text-ink-600">{project.description}</p>
      </header>

      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <BriefSection id="role" title="About the role" icon={FileText}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
              {project.problemStatement}
            </p>
          </BriefSection>

          {project.responsibilities.length > 0 && (
            <BriefSection
              id="responsibilities"
              title="Responsibilities"
              icon={ListChecks}
            >
              <BriefList items={project.responsibilities} />
            </BriefSection>
          )}

          <BriefSection id="requirements" title="Requirements" icon={BriefcaseBusiness}>
            <BriefList items={project.requirements} />
          </BriefSection>

          {project.niceToHave.length > 0 && (
            <BriefSection id="nice" title="Nice to have" icon={Sparkles}>
              <BriefList items={project.niceToHave} />
            </BriefSection>
          )}

          {project.assessment && (
            <BriefSection
              id="assessment"
              title="Hiring assessment"
              icon={ClipboardList}
              description="Every candidate completes this. It's how the company decides who to hire."
            >
              <div className="rounded-lg border border-line bg-surface p-4">
                <AssessmentBrief assessment={project.assessment} />
              </div>
            </BriefSection>
          )}

          {project.skills.length > 0 && (
            <BriefSection id="skills" title="Skills" icon={Code2}>
              <StackList skills={project.skills} />
            </BriefSection>
          )}

          <BriefSection id="company" title={`About ${company}`} icon={Building2}>
            <div className="flex gap-4">
              <Avatar
                name={project.companyName || "Startup"}
                src={project.company.logoUrl}
                className="h-11 w-11 shrink-0 rounded-lg text-sm"
              />
              <div className="min-w-0 space-y-2">
                <p className="text-sm text-ink-500">
                  {[
                    project.company.industry,
                    project.company.size && `${project.company.size} people`,
                    project.companyLocation,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Early-stage startup"}
                </p>
                {project.company.description && (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                    {project.company.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-5 gap-y-1">
                  <Link
                    href={companyProfilePath(project.companyId)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
                  >
                    Profile &amp; track record
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                  {project.company.website && (
                    <a
                      href={project.company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" aria-hidden />
                      Website
                    </a>
                  )}
                </div>
              </div>
            </div>
          </BriefSection>

          <BriefSection id="apply" title="Apply for this role">
            {viewerRole !== "candidate" ? (
              <p className="text-sm text-ink-500">Only candidate accounts can apply.</p>
            ) : existing ? (
              <p className="text-sm text-ink-600">
                You applied on {formatDate(existing.createdAt)}.{" "}
                <Link
                  href={
                    project.assessment
                      ? `/candidate/assessments/${project.id}`
                      : "/candidate/applications"
                  }
                  className="font-medium text-brand-700 hover:underline"
                >
                  {project.assessment ? "Open your assessment" : "Track it in My work"}
                </Link>
              </p>
            ) : open ? (
              <div className="rounded-xl border border-line bg-surface p-5">
                {project.assessment && (
                  <p className="mb-4 text-sm text-ink-600">
                    After you apply, you&apos;ll complete the hiring assessment:{" "}
                    <span className="font-medium text-ink-900">
                      {project.assessment.title}
                    </span>
                    .
                  </p>
                )}
                <ApplicationForm
                  projectId={project.id}
                  kind="hire"
                  hasAssessment={project.assessment !== null}
                />
              </div>
            ) : (
              <p className="text-sm text-ink-600">
                {CLOSED_NOTE[project.availability as keyof typeof CLOSED_NOTE] ??
                  CLOSED_NOTE.closed}{" "}
                <Link
                  href="/projects?kind=hire"
                  className="font-medium text-brand-700 hover:underline"
                >
                  See other roles
                </Link>
              </p>
            )}
          </BriefSection>
        </div>

        <aside className="lg:sticky lg:top-20">
          <div className="rounded-xl border border-line bg-surface p-5">
            <p className="text-xs text-ink-500">Hiring</p>
            <p className="mt-1 text-3xl font-semibold text-ink-900">
              {project.openings} opening{project.openings === 1 ? "" : "s"}
            </p>

            {project.maxApplicants !== null && (
              <div className="mt-4">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-ink-500">Applications</span>
                  <span className="tabular font-medium text-ink-900">
                    {project.applicationCount} of {project.maxApplicants}
                  </span>
                </div>
                <ProgressBar
                  size="sm"
                  value={(project.applicationCount / project.maxApplicants) * 100}
                  label="Applications received"
                  className="mt-1.5"
                />
              </div>
            )}

            <dl className="mt-4 divide-y divide-line border-y border-line text-sm">
              {[
                project.jobType && {
                  icon: Users,
                  label: "Job type",
                  value: JOB_TYPES[project.jobType],
                },
                project.workArrangement && {
                  icon: MapPin,
                  label: "Work",
                  value: [WORK_ARRANGEMENTS[project.workArrangement], project.jobLocation]
                    .filter(Boolean)
                    .join(" · "),
                },
                project.experienceLevel && {
                  icon: GraduationCap,
                  label: "Experience",
                  value: EXPERIENCE_LEVELS[project.experienceLevel],
                },
                project.compensation && {
                  icon: Wallet,
                  label: "Compensation",
                  value: project.compensation,
                },
                {
                  icon: CalendarClock,
                  label: "Apply by",
                  value: formatDate(project.applicationDeadline),
                },
              ]
                .filter(
                  (fact): fact is { icon: typeof Users; label: string; value: string } =>
                    Boolean(fact)
                )
                .map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <dt className="flex items-center gap-2 text-ink-500">
                      <Icon className="h-4 w-4 text-ink-400" aria-hidden />
                      {label}
                    </dt>
                    <dd className="text-right font-medium text-ink-900">{value}</dd>
                  </div>
                ))}
            </dl>

            <div className="mt-4">
              {canApply ? (
                <a href="#apply" className="block">
                  <Button className="w-full" size="lg">
                    Apply now
                  </Button>
                </a>
              ) : existing ? (
                <Link
                  href={
                    project.assessment
                      ? `/candidate/assessments/${project.id}`
                      : "/candidate/applications"
                  }
                  className="block"
                >
                  <Button className="w-full" variant="outline">
                    {project.assessment
                      ? "Open your assessment"
                      : "View your application"}
                  </Button>
                </Link>
              ) : viewerRole !== "candidate" ? (
                <p className="text-center text-sm text-ink-500">
                  Candidates apply from this page.
                </p>
              ) : (
                <div className="space-y-2">
                  <Button className="w-full" variant="outline" disabled>
                    {project.availability === "full"
                      ? "Applications full"
                      : "Applications closed"}
                  </Button>
                  <p className="text-center text-xs text-ink-500">
                    {CLOSED_NOTE[project.availability as keyof typeof CLOSED_NOTE] ??
                      CLOSED_NOTE.closed}
                  </p>
                </div>
              )}
            </div>
            {project.assessment ? (
              <a
                href="#assessment"
                className="mt-4 block rounded-md border border-line bg-ink-50 p-3 hover:border-line-strong"
              >
                <span className="block text-xs text-ink-500">Hiring assessment</span>
                <span className="mt-0.5 block text-sm font-medium text-ink-900">
                  {project.assessment.title}
                </span>
                <span className="mt-1 block text-xs text-ink-500">
                  About {project.assessment.expectedHours} hours · unpaid, part of hiring
                </span>
                <span className="mt-1.5 block text-xs font-medium text-brand-700">
                  View assessment
                </span>
              </a>
            ) : (
              <p className="mt-3 text-xs text-ink-500">Free to apply.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
