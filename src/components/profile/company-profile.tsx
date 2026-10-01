import Link from "next/link";
import {
  Activity,
  ArrowDown,
  BadgeCheck,
  Building2,
  CalendarDays,
  FolderKanban,
  MapPin,
  Pencil,
  Users,
} from "lucide-react";
import { COMPANY_WORK_STYLES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { FollowButton } from "@/components/common/follow-button";
import { SectionCard } from "@/components/common/section-card";
import { EmptyState } from "@/components/common/empty-state";
import { ProfileHeader, type ProfileLink } from "@/components/profile/profile-header";
import { ProfileStats } from "@/components/profile/profile-stats";
import { ProjectResultRow, SkillTags } from "@/components/search/result-rows";
import { HistoryList, historyGroup } from "@/components/company/history-list";
import { OpportunityBadge } from "@/components/projects/opportunity-badge";
import { formatDate } from "@/lib/utils";
import type { CompanyPublicView, ProfileSocial } from "@/lib/types/domain";
import type { UserRole } from "@/lib/types/database.types";

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * A startup's public identity: that it's a company, who follows it, what it
 * builds with, what it's offering now, and how its past evaluations went
 * (counts only).
 */
export function CompanyProfile({
  company,
  social,
  ownCompany,
  viewerRole,
}: {
  company: CompanyPublicView;
  social: ProfileSocial;
  ownCompany: boolean;
  viewerRole: UserRole;
}) {
  const { trackRecord: record } = company;

  const links = [
    company.website && { href: company.website, label: hostname(company.website) },
    company.linkedinUrl && { href: company.linkedinUrl, label: "LinkedIn" },
    company.githubUrl && { href: company.githubUrl, label: "GitHub" },
    company.careersUrl && { href: company.careersUrl, label: "Careers" },
  ].filter((link): link is ProfileLink => Boolean(link));

  const facts = [
    company.size && { icon: Users, text: `${company.size} people` },
    company.location && { icon: MapPin, text: company.location },
    company.foundedYear && { icon: CalendarDays, text: `Founded ${company.foundedYear}` },
  ].filter((fact): fact is { icon: typeof Users; text: string } => Boolean(fact));

  const history = company.history;
  const filledRoles = history.filter((entry) => historyGroup(entry) === "hires");
  const completedProjects = history.filter((entry) => historyGroup(entry) === "projects");
  const postedByType = {
    hire:
      company.openProjects.filter((p) => p.opportunityType === "hire").length +
      history.filter((entry) => entry.opportunityType === "hire").length,
    build:
      company.openProjects.filter((p) => p.opportunityType !== "hire").length +
      history.filter((entry) => entry.opportunityType !== "hire").length,
  };

  const track = [
    {
      label: "Candidates hired",
      value: record.hires,
      hint: "Through hire-only roles and paid projects",
    },
    {
      label: "Roles filled",
      value: filledRoles.length,
      hint: "Hire-only roles with every opening filled",
    },
    {
      label: "Projects completed",
      value: completedProjects.length,
      hint: "Build projects with the delivered work accepted",
    },
    {
      label: "Evaluations completed",
      value: record.completedEvaluations,
      hint: "Paid projects taken to a decision",
    },
    {
      label: "Withdrawn or closed",
      value: record.cancelledProjects,
      hint: "Stopped before finishing",
    },
  ];

  // Factual activity: every opportunity posted, filled, completed or closed.
  const activity = [
    ...company.openProjects
      .filter((project) => project.postedAt)
      .map((project) => ({
        key: `${project.id}:posted`,
        at: project.postedAt as string,
        type: project.opportunityType,
        text:
          project.opportunityType === "hire"
            ? `Started hiring for ${project.title}`
            : `Posted the project ${project.title}`,
      })),
    ...history.flatMap((entry) => [
      {
        key: `${entry.projectId}:closed`,
        at: entry.closedAt,
        type: entry.opportunityType,
        text:
          entry.status === "cancelled"
            ? `Closed ${entry.title}`
            : entry.opportunityType === "hire"
              ? `Filled ${entry.hired} opening${entry.hired === 1 ? "" : "s"} for ${entry.title}`
              : `Completed the project ${entry.title}`,
      },
      {
        key: `${entry.projectId}:posted`,
        at: entry.postedAt,
        type: entry.opportunityType,
        text:
          entry.opportunityType === "hire"
            ? `Started hiring for ${entry.title}`
            : `Posted the project ${entry.title}`,
      },
    ]),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <ProfileHeader
        role="company"
        name={company.name}
        imageUrl={company.logoUrl}
        shape="square"
        headline={company.industry}
        badges={
          company.verified && (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-800">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
              Verified company
            </span>
          )
        }
        social={
          <ProfileStats
            items={[
              {
                value: social.followers,
                label: social.followers === 1 ? "Follower" : "Followers",
                href: `/companies/${company.id}/followers`,
              },
              ...(record.projectsPosted !== null
                ? [{ value: record.projectsPosted, label: "Opportunities posted" }]
                : []),
              { value: record.completedEvaluations, label: "Candidates evaluated" },
            ]}
          />
        }
        facts={facts}
        links={links}
        stats={[
          { label: "open opportunities", value: company.openProjects.length },
          { label: "hires through Trialent", value: record.hires },
          { label: "on Trialent since", value: formatDate(company.memberSince) },
        ]}
        actions={
          ownCompany ? (
            <Link href="/company/profile">
              <Button variant="outline" size="sm">
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Edit company profile
              </Button>
            </Link>
          ) : (
            <>
              {company.openProjects.length > 0 && (
                <a href="#projects">
                  <Button variant="outline" size="sm">
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                    View open opportunities
                  </Button>
                </a>
              )}
              <FollowButton
                target={{ companyId: company.id }}
                following={social.viewerFollows}
                name={company.name}
              />
            </>
          )
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="About" icon={Building2}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
              {company.description || `${company.name} hasn't written about itself yet.`}
            </p>
          </SectionCard>

          <section
            id="projects"
            aria-labelledby="projects-title"
            className="scroll-mt-20 space-y-3"
          >
            <h2
              id="projects-title"
              className="flex items-center gap-2 text-base font-semibold text-ink-900"
            >
              <FolderKanban className="h-4 w-4 text-ink-400" aria-hidden />
              Open opportunities
              <span className="tabular rounded bg-ink-100 px-1.5 text-2xs font-medium text-ink-500">
                {company.openProjects.length}
              </span>
            </h2>
            {company.openProjects.length === 0 ? (
              <EmptyState
                compact
                icon={FolderKanban}
                title="No open opportunities right now"
                description={
                  ownCompany
                    ? "Post a role or a paid project to start receiving candidates."
                    : `Follow ${company.name} to be notified when they post one.`
                }
                actionText={ownCompany ? "Create opportunity" : undefined}
                actionHref={ownCompany ? "/company/projects/create" : undefined}
              />
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                {company.openProjects.map((project) => (
                  <ProjectResultRow key={project.id} project={project} />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="hires-title" className="space-y-3">
            <h2
              id="hires-title"
              className="flex items-center gap-2 text-base font-semibold text-ink-900"
            >
              Successful hires
              <span className="tabular rounded bg-ink-100 px-1.5 text-2xs font-medium text-ink-500">
                {filledRoles.length}
              </span>
            </h2>
            <HistoryList group="hires" entries={filledRoles} limit={5} />
          </section>

          <section aria-labelledby="completed-title" className="space-y-3">
            <h2
              id="completed-title"
              className="flex items-center gap-2 text-base font-semibold text-ink-900"
            >
              Completed projects
              <span className="tabular rounded bg-ink-100 px-1.5 text-2xs font-medium text-ink-500">
                {completedProjects.length}
              </span>
            </h2>
            <HistoryList group="projects" entries={completedProjects} limit={5} />
          </section>

          <SectionCard title="Company activity" icon={Activity}>
            {activity.length === 0 ? (
              <p className="text-sm text-ink-500">
                Nothing yet — posting, hiring and completed projects appear here.
              </p>
            ) : (
              <ol className="-my-1 divide-y divide-line">
                {activity.map((item) => (
                  <li
                    key={item.key}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-sm text-ink-700">
                      <OpportunityBadge type={item.type} size="sm" />
                      <span className="min-w-0 truncate">{item.text}</span>
                    </span>
                    <time dateTime={item.at} className="text-xs text-ink-500">
                      {formatDate(item.at)}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>

          {company.hiringProcess && (
            <SectionCard title="How they hire">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                {company.hiringProcess}
              </p>
            </SectionCard>
          )}
          {company.perks && (
            <SectionCard title="Perks and benefits">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                {company.perks}
              </p>
            </SectionCard>
          )}
        </div>

        <aside className="space-y-6">
          {(company.techStack.length > 0 || company.workStyle) && (
            <SectionCard title="Tech and ways of working">
              <div className="space-y-3">
                {company.techStack.length > 0 && (
                  <SkillTags skills={company.techStack} limit={20} />
                )}
                {company.workStyle && (
                  <p className="text-sm text-ink-600">
                    Works{" "}
                    <span className="font-medium text-ink-900">
                      {COMPANY_WORK_STYLES[company.workStyle].toLowerCase()}
                    </span>
                  </p>
                )}
              </div>
            </SectionCard>
          )}

          <SectionCard
            title="Track record"
            description="Counted from real postings and outcomes. Who was hired stays private."
          >
            <dl className="-my-1 divide-y divide-line">
              {track.map((item) => (
                <div
                  key={item.label}
                  className="flex items-baseline justify-between gap-3 py-2"
                >
                  <dt>
                    <span className="block text-sm text-ink-700">{item.label}</span>
                    <span className="block text-xs text-ink-400">{item.hint}</span>
                  </dt>
                  <dd className="tabular text-base font-semibold text-ink-900">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
            {(postedByType.hire > 0 || postedByType.build > 0) && (
              <p className="mt-3 text-xs text-ink-500">
                Posts{" "}
                <span className="font-medium text-ink-700">
                  {postedByType.hire} hiring role{postedByType.hire === 1 ? "" : "s"}
                </span>{" "}
                and{" "}
                <span className="font-medium text-ink-700">
                  {postedByType.build} build project{postedByType.build === 1 ? "" : "s"}
                </span>
                .
              </p>
            )}
            {record.completedEvaluations === 0 && history.length === 0 && (
              <p className="mt-3 rounded-md bg-ink-50 px-3 py-2 text-xs text-ink-600">
                New to Trialent — nothing finished yet. Use the brief and the
                clarification thread to judge an opportunity before committing your time.
              </p>
            )}
          </SectionCard>

          {viewerRole === "candidate" && (
            <p className="px-1 text-xs text-ink-500">
              Applying doesn&apos;t commit you — you can withdraw any time before
              you&apos;re selected.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
