import Link from "next/link";
import { Plus, Search, SearchX } from "lucide-react";
import { getBrowseProjects } from "@/lib/data/project";
import { getCurrentUser } from "@/lib/auth/guards";
import { JOB_TYPES, PROJECT_CATEGORIES, WORK_ARRANGEMENTS } from "@/lib/constants";
import { FilterChips } from "@/components/ui/filter-chips";
import {
  HOURS_FILTERS,
  PAY_FILTERS,
  filterProjects,
  hasActiveFilters,
  parseProjectFilters,
} from "@/lib/projects";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { BrowseProjectCard } from "@/components/projects/browse-project-card";
import { cn } from "@/lib/utils";
import type { ProjectCategory } from "@/lib/types/database.types";
import type { BrowseProjectView } from "@/lib/types/domain";

export const dynamic = "force-dynamic";

const CATEGORY_ORDER = Object.keys(PROJECT_CATEGORIES) as ProjectCategory[];

const selectClass =
  "h-9 rounded-lg border border-line bg-surface px-2.5 text-sm text-ink-800 shadow-xs outline-none transition-colors hover:border-ink-300 focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100";

/** A URL for the current filters with one value changed. */
function hrefWith(
  params: Record<string, string | undefined>,
  changes: Record<string, string | null>
): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...changes })) {
    if (value) next.set(key, value);
  }
  const query = next.toString();
  return query ? `/projects?${query}` : "/projects";
}

/**
 * The project marketplace. With no search or filter it's sectioned by topic;
 * any filter switches to one ranked result list.
 */
export default async function ProjectsDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseProjectFilters(params, CATEGORY_ORDER);
  const [projects, user] = await Promise.all([getBrowseProjects(), getCurrentUser()]);

  // Posting is for startups and visitors; candidates only browse here.
  const postHref =
    user?.role === "company" || user?.role === "admin"
      ? "/company/projects/create"
      : user
        ? null
        : "/signup?role=company";

  const filtered = filterProjects(projects, filters);
  const flat = hasActiveFilters(filters);
  const byCategory = new Map<ProjectCategory, BrowseProjectView[]>();
  for (const project of filtered) {
    const list = byCategory.get(project.category) ?? [];
    list.push(project);
    byCategory.set(project.category, list);
  }
  const countByCategory = new Map<ProjectCategory, number>();
  for (const project of projects) {
    countByCategory.set(
      project.category,
      (countByCategory.get(project.category) ?? 0) + 1
    );
  }
  const sections = CATEGORY_ORDER.filter((key) => (byCategory.get(key)?.length ?? 0) > 0);
  const openCount = projects.filter((project) => project.availability === "open").length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold text-ink-900">Browse opportunities</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Roles startups are hiring for, and paid projects that show what you can build.{" "}
            <span className="text-ink-700">{openCount} open right now.</span>
          </p>
        </div>
        {postHref && (
          <Link href={postHref} className="shrink-0">
            <Button variant="outline">
              <Plus className="h-4 w-4" aria-hidden />
              Create opportunity
            </Button>
          </Link>
        )}
      </header>

      {projects.length > 0 && (
        <div className="space-y-3">
          <form
            action="/projects"
            role="search"
            className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-2 sm:flex-row sm:items-center"
          >
            {filters.category && (
              <input type="hidden" name="category" value={filters.category} />
            )}
            {filters.type && <input type="hidden" name="kind" value={filters.type} />}
            <label className="relative flex-1">
              <span className="sr-only">Search projects</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
                aria-hidden
              />
              <input
                type="search"
                name="q"
                defaultValue={filters.q}
                placeholder="Search by title, company or skill"
                className="h-9 w-full rounded-lg bg-transparent pl-9 pr-3 text-sm text-ink-900 outline-none placeholder:text-ink-400"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {filters.type === "hire" ? (
                <>
                  <label>
                    <span className="sr-only">Job type</span>
                    <select
                      name="job"
                      defaultValue={filters.jobType ?? ""}
                      className={selectClass}
                    >
                      <option value="">Any job type</option>
                      {Object.entries(JOB_TYPES).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="sr-only">Work arrangement</span>
                    <select
                      name="where"
                      defaultValue={filters.workArrangement ?? ""}
                      className={selectClass}
                    >
                      <option value="">Remote, hybrid or on-site</option>
                      {Object.entries(WORK_ARRANGEMENTS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : filters.type === "build" ? (
                <>
                  <label>
                    <span className="sr-only">Minimum fee</span>
                    <select
                      name="pay"
                      defaultValue={filters.minPay ? String(filters.minPay) : ""}
                      className={selectClass}
                    >
                      <option value="">Any fee</option>
                      {PAY_FILTERS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="sr-only">Effort</span>
                    <select
                      name="hours"
                      defaultValue={filters.maxHours ? String(filters.maxHours) : ""}
                      className={selectClass}
                    >
                      <option value="">Any effort</option>
                      {HOURS_FILTERS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}
              <label className="flex h-9 items-center gap-2 rounded-lg border border-line px-2.5 text-sm text-ink-700">
                <input
                  type="checkbox"
                  name="open"
                  value="1"
                  defaultChecked={filters.openOnly}
                  className="h-4 w-4 accent-brand-600"
                />
                Open only
              </label>
              <Button type="submit">Search</Button>
            </div>
          </form>

          <FilterChips
            label="Opportunity type"
            active={filters.type ?? "all"}
            chips={[
              {
                id: "all",
                label: "All",
                href: hrefWith(params, {
                  kind: null,
                  job: null,
                  where: null,
                  pay: null,
                  hours: null,
                }),
                count: projects.length,
              },
              {
                id: "hire",
                label: "Hire only",
                href: hrefWith(params, { kind: "hire", pay: null, hours: null }),
                count: projects.filter((project) => project.opportunityType === "hire")
                  .length,
              },
              {
                id: "build",
                label: "Build only",
                href: hrefWith(params, { kind: "build", job: null, where: null }),
                count: projects.filter((project) => project.opportunityType === "build")
                  .length,
              },
              {
                id: "freelance",
                label: "Freelance",
                href: hrefWith(params, {
                  kind: "freelance",
                  job: null,
                  where: null,
                  hours: null,
                }),
                count: projects.filter(
                  (project) => project.opportunityType === "freelance"
                ).length,
              },
            ]}
          />

          <nav
            aria-label="Topics"
            className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
          >
            <Link
              href={hrefWith(params, { category: null })}
              aria-current={!filters.category ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-md border px-2.5 py-1 text-sm transition-colors",
                !filters.category
                  ? "border-inverse bg-inverse font-medium text-inverse-fg"
                  : "border-line bg-surface text-ink-600 hover:border-ink-300 hover:text-ink-900"
              )}
            >
              All <span className="tabular opacity-70">{projects.length}</span>
            </Link>
            {CATEGORY_ORDER.filter((key) => countByCategory.has(key)).map((key) => (
              <Link
                key={key}
                href={hrefWith(params, { category: key })}
                aria-current={filters.category === key ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-md border px-2.5 py-1 text-sm transition-colors",
                  filters.category === key
                    ? "border-inverse bg-inverse font-medium text-inverse-fg"
                    : "border-line bg-surface text-ink-600 hover:border-ink-300 hover:text-ink-900"
                )}
              >
                {PROJECT_CATEGORIES[key].label}{" "}
                <span className="tabular opacity-70">{countByCategory.get(key)}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}

      {projects.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No open projects right now"
          description="Startups post new paid projects regularly. Every open project is listed here."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={
            filters.type === "hire"
              ? "No open roles match these filters"
              : filters.type === "build"
                ? "No projects match these filters"
                : "No opportunities match these filters"
          }
          description={
            filters.type === "hire"
              ? "Try fewer words, a different topic, job type or work arrangement."
              : "Try fewer words, a different topic, or a wider fee and effort range."
          }
          actionText="Clear filters"
          actionHref="/projects"
        />
      ) : flat || filters.category ? (
        <section aria-label="Results" className="space-y-3">
          <p className="text-sm text-ink-500">
            {filtered.length} project{filtered.length === 1 ? "" : "s"}
            {filters.category && ` in ${PROJECT_CATEGORIES[filters.category].label}`}
            {flat && (
              <>
                {" · "}
                <Link
                  href={hrefWith({}, { category: filters.category })}
                  className="font-medium text-brand-700 hover:underline"
                >
                  Clear filters
                </Link>
              </>
            )}
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project) => (
              <BrowseProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>
      ) : (
        sections.map((key) => (
          <section key={key} className="space-y-3" aria-labelledby={`topic-${key}`}>
            <div className="flex items-end justify-between gap-4 border-b border-line pb-2">
              <div>
                <h2 id={`topic-${key}`} className="text-base font-semibold text-ink-900">
                  {PROJECT_CATEGORIES[key].label}
                </h2>
                <p className="text-sm text-ink-500">{PROJECT_CATEGORIES[key].blurb}</p>
              </div>
              <Link
                href={hrefWith(params, { category: key })}
                className="shrink-0 text-sm font-medium text-brand-700 hover:underline"
              >
                View {byCategory.get(key)?.length}
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {byCategory.get(key)?.map((project) => (
                <BrowseProjectCard key={project.id} project={project} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
