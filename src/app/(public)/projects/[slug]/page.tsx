import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  ChevronLeft,
  ClipboardCheck,
  Clock,
  Code2,
  FileText,
  Globe,
  ListChecks,
  Package,
  Scale,
  Users,
} from "lucide-react";
import { getBrowsableProjectBySlug } from "@/lib/data/project";
import {
  getCandidateApplicationForProject,
  getCandidateProfileId,
} from "@/lib/data/candidate";
import { purposeLabel, spotsLeft } from "@/lib/projects";
import { getCurrentUser } from "@/lib/auth/guards";
import { formatCurrency, formatDate } from "@/lib/utils";
import { WORK_MODES, companyProfilePath } from "@/lib/constants";
import { ApplicationForm } from "@/components/candidate/application-form";
import { HireOpportunityDetail } from "@/components/projects/hire-detail";
import { FreelanceDetail } from "@/components/projects/freelance-detail";
import { getMilestonePlan } from "@/lib/data/freelance";
import { OpportunityBadge } from "@/components/projects/opportunity-badge";
import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { Avatar } from "@/components/common/avatar";
import {
  BriefList,
  BriefSection,
  EVALUATION_DIMENSIONS,
  EVALUATION_FACTS,
  StackList,
} from "@/components/projects/brief";
import type { BrowseProjectView } from "@/lib/types/domain";
import { RoleBadge } from "@/components/profile/role-badge";

export const dynamic = "force-dynamic";

const AVAILABILITY: Record<
  BrowseProjectView["availability"],
  { label: string; tone: StatusTone; closedNote?: string }
> = {
  open: { label: "Applications open", tone: "success" },
  full: {
    label: "Full",
    tone: "warning",
    closedNote: "This project has reached its applicant limit.",
  },
  selected: {
    label: "In progress",
    tone: "active",
    closedNote: "The startup has selected a candidate and work is under way.",
  },
  closed: {
    label: "Closed",
    tone: "neutral",
    closedNote: "Applications for this project have closed.",
  },
};

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <dt className="flex items-center gap-2 text-ink-500">
        <Icon className="h-4 w-4 text-ink-400" aria-hidden />
        {label}
      </dt>
      <dd className="text-right font-medium text-ink-900">{value}</dd>
    </div>
  );
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const project = await getBrowsableProjectBySlug(slug);
  if (!project) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirect=/projects/${slug}`);

  const candidateId =
    user.role === "candidate" ? await getCandidateProfileId(user.id) : null;
  const existing = candidateId
    ? await getCandidateApplicationForProject(candidateId, project.id)
    : null;
  const spots = spotsLeft(project.maxApplicants, project.applicationCount);
  const availability = AVAILABILITY[project.availability];
  const canApply =
    user.role === "candidate" && !existing && project.availability === "open";
  const company = project.companyName || "the startup";

  // Hire only: a role, laid out as a role — no fee, deliverables or evaluation.
  if (project.opportunityType === "hire") {
    return (
      <HireOpportunityDetail
        project={project}
        viewerRole={user.role}
        existing={existing}
      />
    );
  }

  if (project.opportunityType === "freelance") {
    return (
      <FreelanceDetail
        project={project}
        plan={await getMilestonePlan(project.id)}
        viewerRole={user.role}
        existing={existing}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Browse projects
      </Link>

      <header className="mt-4 border-b border-line pb-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-500">
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
          {project.companyLocation && <span>· {project.companyLocation}</span>}
        </div>
        <h1 className="mt-2 max-w-3xl text-3xl font-semibold text-ink-900">
          {project.title}
        </h1>
        <p className="mt-3 max-w-3xl text-base text-ink-600">{project.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <OpportunityBadge type="build" />
          <StatusBadge tone={availability.tone} label={availability.label} />
          <span className="rounded-md border border-line bg-surface px-2 py-0.5 text-xs font-medium text-ink-600">
            {purposeLabel(project)}
          </span>
          <span className="rounded-md border border-line bg-surface px-2 py-0.5 text-xs font-medium text-ink-600">
            {WORK_MODES[project.workMode].label}
          </span>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <BriefSection id="overview" title="Overview" icon={FileText}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
              {project.problemStatement}
            </p>
            {project.context && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-500">
                {project.context}
              </p>
            )}
          </BriefSection>

          {project.requirements.length > 0 && (
            <BriefSection id="requirements" title="Requirements" icon={ListChecks}>
              <BriefList items={project.requirements} numbered />
            </BriefSection>
          )}

          <BriefSection id="deliverables" title="Deliverables" icon={Package}>
            <BriefList items={project.deliverables} />
          </BriefSection>

          <BriefSection
            id="stack"
            title="Tech stack"
            icon={Code2}
            description="Outlined skills are required; the rest are nice to have."
          >
            <StackList skills={project.skills} />
          </BriefSection>

          <BriefSection
            id="acceptance"
            title="Acceptance criteria"
            icon={ClipboardCheck}
            description="What the work must do to be accepted."
          >
            <BriefList items={project.acceptanceCriteria} />
          </BriefSection>

          <BriefSection
            id="evaluation"
            title="How you'll be evaluated"
            icon={Scale}
            description={`${company} published these criteria before anyone applied. Every submission is judged against them.`}
          >
            <div className="rounded-xl border border-line bg-surface">
              {project.evaluationCriteria.length > 0 && (
                <div className="border-b border-line p-4">
                  <p className="text-2xs font-semibold uppercase tracking-wider text-ink-500">
                    The startup&apos;s criteria
                  </p>
                  <div className="mt-2.5">
                    <BriefList items={project.evaluationCriteria} />
                  </div>
                </div>
              )}
              <div className="grid gap-4 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-wider text-ink-500">
                    Quality, in bands
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-ink-700">
                    {EVALUATION_DIMENSIONS.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-ink-500">
                    Below, meets or exceeds expectations — never a single score.
                  </p>
                </div>
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-wider text-ink-500">
                    Observable facts
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-ink-700">
                    {EVALUATION_FACTS.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-ink-500">
                    Plus a written message with every decision.
                  </p>
                </div>
              </div>
            </div>
          </BriefSection>

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

          <BriefSection id="apply" title="Apply to this project">
            {user.role !== "candidate" ? (
              <p className="text-sm text-ink-500">
                Only candidate accounts can apply to projects.
              </p>
            ) : existing ? (
              <p className="text-sm text-ink-600">
                You applied on {formatDate(existing.createdAt)}.{" "}
                <Link
                  href="/candidate/applications"
                  className="font-medium text-brand-700 hover:underline"
                >
                  Track it in My applications
                </Link>
              </p>
            ) : project.availability === "open" ? (
              <div className="rounded-xl border border-line bg-surface p-5">
                <ApplicationForm projectId={project.id} />
              </div>
            ) : (
              <p className="text-sm text-ink-600">
                {availability.closedNote}{" "}
                <Link
                  href="/projects"
                  className="font-medium text-brand-700 hover:underline"
                >
                  Browse other projects
                </Link>
              </p>
            )}
          </BriefSection>
        </div>

        <aside className="lg:sticky lg:top-20">
          <div className="rounded-xl border border-line bg-surface p-5">
            <p className="text-xs text-ink-500">Project fee</p>
            <p className="tabular mt-1 text-3xl font-semibold text-ink-900">
              {formatCurrency(project.paymentAmount, project.currency)}
            </p>
            <p className="mt-1 text-xs text-ink-500">Stated upfront by {company}</p>

            <dl className="mt-4 divide-y divide-line border-y border-line">
              <Fact
                icon={Clock}
                label="Effort"
                value={`${project.expectedHours} hours`}
              />
              <Fact icon={Users} label="Selected" value="1 candidate" />
              <Fact
                icon={CalendarClock}
                label="Apply by"
                value={formatDate(project.applicationDeadline)}
              />
              <Fact
                icon={CalendarClock}
                label="Work due"
                value={formatDate(project.projectDeadline)}
              />
              {spots !== null && (
                <Fact
                  icon={ListChecks}
                  label="Places left"
                  value={`${spots} of ${project.maxApplicants}`}
                />
              )}
            </dl>

            <div className="mt-4">
              {canApply ? (
                <a href="#apply" className="block">
                  <Button className="w-full" size="lg">
                    Apply to project
                  </Button>
                </a>
              ) : existing ? (
                <Link href="/candidate/applications" className="block">
                  <Button className="w-full" variant="outline">
                    View your application
                  </Button>
                </Link>
              ) : (
                <p className="text-center text-sm text-ink-500">
                  {user.role !== "candidate"
                    ? "Candidates apply from this page."
                    : availability.closedNote}
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
