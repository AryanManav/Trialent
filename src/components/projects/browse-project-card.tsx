import Link from "next/link";
import { ArrowRight, CalendarClock, Clock, MapPin, Users } from "lucide-react";
import { CompanyMark } from "@/components/common/company-mark";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { RoleBadge } from "@/components/profile/role-badge";
import { OpportunityBadge } from "@/components/projects/opportunity-badge";
import { JOB_TYPES, PRICING_MODELS, WORK_ARRANGEMENTS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { BrowseProjectView } from "@/lib/types/domain";

const AVAILABILITY: Record<
  BrowseProjectView["availability"],
  { label: string; tone: StatusTone }
> = {
  open: { label: "Open", tone: "success" },
  full: { label: "Applications full", tone: "warning" },
  selected: { label: "In progress", tone: "active" },
  closed: { label: "Closed", tone: "neutral" },
};

const STACK_SHOWN = 4;
const shortDate = (value: string) => formatDate(value).replace(/ \d{4}$/, "");

/**
 * One opportunity in Browse. Its type leads — HIRE ONLY (a role), BUILD ONLY
 * (a paid project) or FREELANCE (a paid contract) — and the facts shown follow
 * from it: openings and applications for a role; fee, effort and one selected
 * candidate for a build; the price and its basis for a contract.
 */
export function BrowseProjectCard({ project }: { project: BrowseProjectView }) {
  const hire = project.opportunityType === "hire";
  const terms = project.freelance;
  const hourly = terms?.pricingModel === "hourly" && terms.hourlyRate !== null;
  const status = AVAILABILITY[project.availability];
  const extra = project.stack.length - STACK_SHOWN;

  const facts = hire
    ? [
        {
          label: "Openings",
          value: `${project.openings}`,
          icon: Users,
        },
        {
          label: "Applications",
          value:
            project.maxApplicants !== null
              ? `${project.applicationCount} / ${project.maxApplicants}`
              : `${project.applicationCount}`,
          icon: null,
        },
        {
          label: "Apply by",
          value: shortDate(project.applicationDeadline),
          icon: CalendarClock,
        },
      ]
    : [
        {
          label: hourly ? "Rate" : terms ? "Contract" : "Fee",
          value: hourly
            ? `${formatCurrency(terms.hourlyRate ?? 0, project.currency)}/hr`
            : formatCurrency(project.paymentAmount, project.currency),
          icon: null,
          money: true,
        },
        hourly
          ? {
              label: "Commitment",
              value: `${terms.hoursPerWeek}h × ${terms.durationWeeks}w`,
              icon: Clock,
            }
          : { label: "Effort", value: `${project.expectedHours}h`, icon: Clock },
        {
          label: "Apply by",
          value: shortDate(project.applicationDeadline),
          icon: CalendarClock,
        },
      ];

  const roleLine = [
    project.jobType && JOB_TYPES[project.jobType],
    project.workArrangement && WORK_ARRANGEMENTS[project.workArrangement],
    project.jobLocation,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="group relative flex flex-col rounded-lg border border-line bg-surface p-4 transition-colors hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <OpportunityBadge type={project.opportunityType} size="sm" />
        <StatusBadge size="sm" tone={status.tone} label={status.label} />
      </div>

      <h3 className="mt-3 text-base font-semibold leading-snug text-ink-900">
        {/* Stretched over the card, so the whole card opens the opportunity. */}
        <Link
          href={`/projects/${project.slug}`}
          className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none group-hover:text-brand-700 group-hover:underline"
        >
          {project.title}
        </Link>
      </h3>
      <div className="mt-1.5 flex min-w-0 items-center gap-2">
        <CompanyMark
          name={project.companyName || "Startup"}
          className="h-5 w-5 rounded text-[9px]"
        />
        <span className="truncate text-sm text-ink-600">
          {project.companyName || "Startup"}
        </span>
        <RoleBadge role="company" size="sm" />
      </div>

      {hire && roleLine && (
        <p className="mt-2 flex items-center gap-1 text-xs text-ink-500">
          <MapPin className="h-3.5 w-3.5 text-ink-400" aria-hidden />
          {roleLine}
        </p>
      )}
      <p className="mt-2 line-clamp-2 text-sm text-ink-500">{project.description}</p>

      {project.stack.length > 0 && (
        <ul
          className="mt-3 flex flex-wrap gap-1.5"
          aria-label={hire ? "Skills" : "Tech stack"}
        >
          {project.stack.slice(0, STACK_SHOWN).map((skill) => (
            <li
              key={skill}
              className="rounded border border-line bg-ink-50 px-1.5 py-0.5 font-mono text-[11px] text-ink-600"
            >
              {skill}
            </li>
          ))}
          {extra > 0 && (
            <li className="px-1 py-0.5 text-[11px] text-ink-400">+{extra}</li>
          )}
        </ul>
      )}

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4">
        {facts.map((fact) => {
          const Icon = fact.icon;
          return (
            <div key={fact.label}>
              <dt className="text-2xs text-ink-500">{fact.label}</dt>
              <dd
                className={
                  "money" in fact && fact.money
                    ? "tabular text-sm font-semibold text-emerald-700"
                    : "tabular flex items-center gap-1 text-sm font-medium text-ink-800"
                }
              >
                {Icon && <Icon className="h-3.5 w-3.5 text-ink-400" aria-hidden />}
                {fact.value}
              </dd>
            </div>
          );
        })}
      </dl>

      {hire && project.assessmentTitle && (
        <div className="mt-3 rounded-md border border-line bg-ink-50 px-3 py-2">
          <p className="text-2xs text-ink-500">
            Assessment · about {project.expectedHours}h
          </p>
          <p className="truncate text-sm font-medium text-ink-800">
            {project.assessmentTitle}
          </p>
          {(project.assessmentTechnologies ?? []).length > 0 && (
            <p className="mt-0.5 truncate font-mono text-[11px] text-ink-500">
              {(project.assessmentTechnologies ?? []).slice(0, 4).join(" · ")}
            </p>
          )}
        </div>
      )}

      {project.availability === "full" && (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
          {hire
            ? "This opportunity has reached its application limit. If a place opens up, you can apply."
            : "This project has reached its applicant limit."}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-ink-500">
        <span>
          {hire
            ? (project.compensation ?? "Hired on an unpaid assessment")
            : terms
              ? `${PRICING_MODELS[terms.pricingModel].label} contract · 1 freelancer`
              : "Paid project · 1 candidate will be selected"}
        </span>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-700">
          {hire ? "View opportunity" : terms ? "View contract" : "View project"}
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </div>
    </article>
  );
}
