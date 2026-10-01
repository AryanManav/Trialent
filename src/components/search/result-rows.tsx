import Link from "next/link";
import { BadgeCheck, Clock, MapPin } from "lucide-react";
import { Avatar } from "@/components/common/avatar";
import { CompanyMark } from "@/components/common/company-mark";
import { StatusBadge } from "@/components/ui/status-badge";
import { JOB_TYPES, WORK_ARRANGEMENTS, companyProfilePath } from "@/lib/constants";
import { OpportunityBadge } from "@/components/projects/opportunity-badge";

import type { BrowseProjectView, SearchResult } from "@/lib/types/domain";
import { RoleBadge } from "@/components/profile/role-badge";
import { listingTerms } from "@/lib/projects";

/** Up to `limit` skills as compact mono tags, plus "+n". */
export function SkillTags({
  skills,
  limit = 5,
  highlight,
}: {
  skills: string[];
  limit?: number;
  /** A search term to emphasise when a tag contains it. */
  highlight?: string;
}) {
  if (skills.length === 0) return null;
  const term = highlight?.trim().toLowerCase();
  const ordered = term
    ? [...skills].sort(
        (a, b) =>
          Number(b.toLowerCase().includes(term)) - Number(a.toLowerCase().includes(term))
      )
    : skills;
  const extra = ordered.length - limit;
  return (
    <ul className="flex flex-wrap gap-1" aria-label="Skills">
      {ordered.slice(0, limit).map((skill) => {
        const hit = term ? skill.toLowerCase().includes(term) : false;
        return (
          <li
            key={skill}
            className={
              hit
                ? "rounded border border-brand-200 bg-brand-50 px-1.5 py-px font-mono text-[11px] text-brand-800"
                : "rounded border border-line bg-ink-50 px-1.5 py-px font-mono text-[11px] text-ink-600"
            }
          >
            {skill}
          </li>
        );
      })}
      {extra > 0 && <li className="px-1 text-[11px] text-ink-400">+{extra}</li>}
    </ul>
  );
}

const rowClass =
  "group flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-ink-50 sm:flex-row sm:items-center";

export function ProjectResultRow({
  project,
  query,
}: {
  project: BrowseProjectView;
  query?: string;
}) {
  const open = project.availability === "open";
  const hire = project.opportunityType === "hire";
  return (
    <li>
      <Link href={`/projects/${project.slug}`} className={rowClass}>
        <div className="flex min-w-0 flex-1 gap-3">
          <CompanyMark name={project.companyName ?? "Startup"} />
          <div className="min-w-0 space-y-1.5">
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink-900 group-hover:text-brand-700">
              <span className="truncate">{project.title}</span>
              <OpportunityBadge type={project.opportunityType} size="sm" />
            </p>
            <p className="text-xs text-ink-500">
              {project.companyName ?? "Startup"}
              {hire &&
                project.jobType &&
                ` · ${JOB_TYPES[project.jobType]}${
                  project.workArrangement
                    ? ` · ${WORK_ARRANGEMENTS[project.workArrangement]}`
                    : ""
                }`}
            </p>
            <SkillTags skills={project.stack} highlight={query} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4 pl-12 sm:pl-0">
          {hire ? (
            <span className="tabular text-sm text-ink-600">
              {project.openings} opening{project.openings === 1 ? "" : "s"}
              {project.maxApplicants !== null &&
                ` · ${project.applicationCount} / ${project.maxApplicants} applications`}
            </span>
          ) : (
            <>
              <span className="tabular text-sm font-semibold text-emerald-700">
                {listingTerms(project).price}
              </span>
              <span className="flex items-center gap-1 text-sm text-ink-600">
                <Clock className="h-3.5 w-3.5 text-ink-400" aria-hidden />
                {project.freelance?.pricingModel === "hourly"
                  ? `${project.freelance.hoursPerWeek}h/wk`
                  : `${project.expectedHours}h`}
              </span>
            </>
          )}
          <StatusBadge
            size="sm"
            tone={
              open ? "success" : project.availability === "full" ? "warning" : "neutral"
            }
            label={
              open
                ? "Open"
                : project.availability === "full"
                  ? "Applications full"
                  : "Closed"
            }
          />
        </div>
      </Link>
    </li>
  );
}

export function CandidateResultRow({
  candidate,
  query,
}: {
  candidate: SearchResult;
  query?: string;
}) {
  return (
    <li>
      <Link href={`/candidates/${candidate.id}`} className={rowClass}>
        <div className="flex min-w-0 flex-1 gap-3">
          <Avatar
            name={candidate.title}
            src={candidate.imageUrl}
            className="h-10 w-10 rounded-full text-xs"
          />
          <div className="min-w-0 space-y-1.5">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-ink-900 group-hover:text-brand-700">
                <span className="truncate">{candidate.title}</span>
                <RoleBadge role="candidate" size="sm" />
              </p>
              <p className="truncate text-xs text-ink-500">
                {candidate.subtitle ?? "Candidate"}
              </p>
            </div>
            <SkillTags skills={candidate.skills} highlight={query} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4 pl-[3.25rem] text-sm sm:pl-0">
          {candidate.location && (
            <span className="flex items-center gap-1 text-ink-500">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {candidate.location}
            </span>
          )}
          {candidate.verifiedCount > 0 ? (
            <span className="flex items-center gap-1 font-medium text-emerald-700">
              <BadgeCheck className="h-4 w-4" aria-hidden />
              {candidate.verifiedCount} verified
            </span>
          ) : (
            <span className="text-ink-400">No verified work yet</span>
          )}
        </div>
      </Link>
    </li>
  );
}

export function CompanyResultRow({
  company,
  query,
}: {
  company: SearchResult;
  query?: string;
}) {
  const meta = [
    company.subtitle,
    company.location,
    company.companySize && `${company.companySize} people`,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li>
      <Link href={companyProfilePath(company.id)} className={rowClass}>
        <div className="flex min-w-0 flex-1 gap-3">
          <CompanyMark
            name={company.title}
            logoUrl={company.imageUrl}
            className="h-10 w-10"
          />
          <div className="min-w-0 space-y-1.5">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-ink-900 group-hover:text-brand-700">
                <span className="truncate">{company.title}</span>
                <RoleBadge role="company" size="sm" />
              </p>
              <p className="truncate text-xs text-ink-500">{meta || "Startup"}</p>
            </div>
            <SkillTags skills={company.skills} highlight={query} />
          </div>
        </div>
        <div className="shrink-0 pl-[3.25rem] text-sm sm:pl-0">
          {company.openProjects > 0 ? (
            <StatusBadge
              size="sm"
              tone="success"
              label={`${company.openProjects} open project${company.openProjects === 1 ? "" : "s"}`}
            />
          ) : (
            <span className="text-ink-400">No open projects</span>
          )}
        </div>
      </Link>
    </li>
  );
}
