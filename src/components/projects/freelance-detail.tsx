import Link from "next/link";
import {
  BadgeCheck,
  CalendarClock,
  ChevronLeft,
  Clock,
  Code2,
  FileText,
  HandCoins,
  ListChecks,
  Package,
  Users,
} from "lucide-react";
import { PRICING_MODELS, companyProfilePath } from "@/lib/constants";
import { describeTerms } from "@/lib/freelance";
import { spotsLeft } from "@/lib/projects";
import { ApplicationForm } from "@/components/candidate/application-form";
import { OpportunityBadge } from "@/components/projects/opportunity-badge";
import { BriefList, BriefSection, StackList } from "@/components/projects/brief";
import { MilestonePlan } from "@/components/freelance/contract-parts";
import { RoleBadge } from "@/components/profile/role-badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { MilestonePlanItem, ProjectDetailView } from "@/lib/types/domain";
import type { UserRole } from "@/lib/types/database.types";

const AVAILABILITY = {
  open: { label: "Applications open", tone: "success", note: "" },
  full: {
    label: "Full",
    tone: "warning",
    note: "This contract has reached its applicant limit.",
  },
  selected: {
    label: "In progress",
    tone: "active",
    note: "The company has selected a freelancer and work is under way.",
  },
  closed: {
    label: "Closed",
    tone: "neutral",
    note: "Applications for this contract have closed.",
  },
} as const;

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
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

/**
 * A freelance contract's public brief: the work, the price and how it's paid
 * — the milestone plan for a fixed price, or the rate and commitment for an
 * hourly contract — and how to apply.
 */
export function FreelanceDetail({
  project,
  plan,
  viewerRole,
  existing,
}: {
  project: ProjectDetailView;
  plan: MilestonePlanItem[];
  viewerRole: UserRole;
  existing: { createdAt: string } | null;
}) {
  const terms = project.freelance;
  if (!terms) return null;
  const hourly = terms.pricingModel === "hourly";
  const availability = AVAILABILITY[project.availability];
  const open = project.availability === "open";
  const canApply = viewerRole === "candidate" && !existing && open;
  const company = project.companyName || "the company";
  const spots = spotsLeft(project.maxApplicants, project.applicationCount);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link
        href="/projects?kind=freelance"
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Freelance contracts
      </Link>

      <header className="mt-4 border-b border-line pb-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-500">
          <Link
            href={companyProfilePath(project.companyId)}
            className="font-medium text-ink-700 hover:text-brand-700 hover:underline"
          >
            {project.companyName || "Company"}
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
          <OpportunityBadge type="freelance" />
          <StatusBadge tone={availability.tone} label={availability.label} />
          <span className="rounded-md border border-line bg-surface px-2 py-0.5 text-xs font-medium text-ink-600">
            {PRICING_MODELS[terms.pricingModel].label}
          </span>
        </div>
      </header>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <BriefSection id="overview" title="What needs doing" icon={FileText}>
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
              <BriefList items={project.requirements} />
            </BriefSection>
          )}

          <BriefSection id="deliverables" title="Deliverables" icon={Package}>
            <BriefList items={project.deliverables} />
          </BriefSection>

          {project.skills.length > 0 && (
            <BriefSection id="stack" title="Skills" icon={Code2}>
              <StackList skills={project.skills} />
            </BriefSection>
          )}

          <BriefSection
            id="payment"
            title={hourly ? "Rate and hours" : "Milestones"}
            icon={HandCoins}
            description={
              hourly
                ? `You log your hours each week; ${company} approves them and pays you for the approved hours.`
                : `You deliver each milestone; ${company} approves it and pays you that milestone's amount.`
            }
          >
            {hourly ? (
              <p className="text-sm text-ink-700">
                {describeTerms(terms, project.paymentAmount, project.currency)} ·
                estimated {formatCurrency(project.paymentAmount, project.currency)} in
                total.
              </p>
            ) : (
              <MilestonePlan plan={plan} currency={project.currency} />
            )}
            <p className="mt-3 text-xs text-ink-500">
              {company} pays you directly. Trialent records what was agreed, approved and
              paid, and never holds the money.
            </p>
          </BriefSection>

          <BriefSection id="apply" title="Apply to this contract">
            {viewerRole !== "candidate" ? (
              <p className="text-sm text-ink-500">Only candidate accounts can apply.</p>
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
            ) : open ? (
              <div className="rounded-xl border border-line bg-surface p-5">
                <ApplicationForm projectId={project.id} kind="freelance" />
              </div>
            ) : (
              <p className="text-sm text-ink-600">{availability.note}</p>
            )}
          </BriefSection>
        </div>

        <aside className="lg:sticky lg:top-20">
          <div className="rounded-xl border border-line bg-surface p-5">
            <p className="text-xs text-ink-500">
              {hourly ? "Hourly rate" : "Contract total"}
            </p>
            <p className="tabular mt-1 text-3xl font-semibold text-ink-900">
              {hourly
                ? `${formatCurrency(terms.hourlyRate ?? 0, project.currency)}/hr`
                : formatCurrency(project.paymentAmount, project.currency)}
            </p>
            <p className="mt-1 text-xs text-ink-500">
              {hourly
                ? `About ${formatCurrency(project.paymentAmount, project.currency)} in total`
                : `${plan.length} milestone${plan.length === 1 ? "" : "s"}, paid as approved`}
            </p>

            <dl className="mt-4 divide-y divide-line border-y border-line">
              <Fact
                icon={Clock}
                label={hourly ? "Commitment" : "Estimated effort"}
                value={
                  hourly
                    ? `${terms.hoursPerWeek} h/week · ${terms.durationWeeks} weeks`
                    : `${project.expectedHours} hours`
                }
              />
              <Fact icon={Users} label="Selected" value="1 freelancer" />
              <Fact
                icon={CalendarClock}
                label="Apply by"
                value={formatDate(project.applicationDeadline)}
              />
              <Fact
                icon={CalendarClock}
                label={hourly ? "Ends around" : "Last milestone due"}
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
                    Apply to contract
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
                  {viewerRole !== "candidate"
                    ? "Candidates apply from this page."
                    : availability.note}
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
