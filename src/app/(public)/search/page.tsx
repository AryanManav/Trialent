import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Search, SearchX, SlidersHorizontal } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/guards";
import { getFollowing, MIN_SEARCH_LENGTH } from "@/lib/data/directory";
import { searchEverything } from "@/lib/data/search";
import {
  HOURS_FILTERS,
  PAY_FILTERS,
  filterProjects,
  parseProjectFilters,
} from "@/lib/projects";
import {
  filterCandidates,
  filterCompanies,
  parseDirectoryFilters,
  parseSearchType,
  type SearchType,
} from "@/lib/search";
import { PROJECT_CATEGORIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { LinkTabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/common/empty-state";
import {
  CandidateResultRow,
  CompanyResultRow,
  ProjectResultRow,
} from "@/components/search/result-rows";
import { SEARCH_SUGGESTIONS, searchHref } from "@/components/search/search-history";
import type { ProjectCategory } from "@/lib/types/database.types";

export const dynamic = "force-dynamic";

const CATEGORY_ORDER = Object.keys(PROJECT_CATEGORIES) as ProjectCategory[];
const PREVIEW = 3;

const fieldClass =
  "h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-sm text-ink-800 outline-none transition-colors placeholder:text-ink-400 hover:border-ink-300 focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-ink-600">{label}</span>
      {children}
    </label>
  );
}

function Check({
  name,
  checked,
  label,
}: {
  name: string;
  checked: boolean;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink-700">
      <input
        type="checkbox"
        name={name}
        value="1"
        defaultChecked={checked}
        className="h-4 w-4 accent-brand-600"
      />
      {label}
    </label>
  );
}

function ResultGroup({
  title,
  total,
  moreHref,
  children,
}: {
  title: string;
  total: number;
  moreHref?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink-900">
          {title} <span className="tabular font-normal text-ink-400">{total}</span>
        </h2>
        {moreHref && total > PREVIEW && (
          <Link
            href={moreHref}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
          >
            See all {total}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {children}
      </ul>
    </section>
  );
}

/**
 * Search across projects, candidates and companies. Tabs narrow the kind;
 * each kind has its own filters (a drawer on phones). With no query, a kind's
 * tab lists what exists — that's what "Discover talent" opens.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) {
    const next = `/search${params.q ? `?q=${encodeURIComponent(params.q)}` : ""}`;
    redirect(`/login?redirect=${encodeURIComponent(next)}`);
  }

  const query = (params.q ?? "").trim();
  const type = parseSearchType(params.type);
  const searching = query.length >= MIN_SEARCH_LENGTH;
  const browsing = !searching && type !== "all";

  const projectFilters = parseProjectFilters(params, CATEGORY_ORDER);
  const directoryFilters = parseDirectoryFilters(params);

  const [results, following] = await Promise.all([
    searchEverything(query, { browse: browsing }),
    !searching && type === "all" ? getFollowing(user.id) : Promise.resolve([]),
  ]);

  const projects = filterProjects(results.projects, { ...projectFilters, q: "" });
  const candidates = filterCandidates(results.candidates, directoryFilters);
  const companies = filterCompanies(results.companies, directoryFilters);
  const total = projects.length + candidates.length + companies.length;

  const hrefFor = (next: SearchType) => {
    const url = new URLSearchParams();
    if (query) url.set("q", query);
    if (next !== "all") url.set("type", next);
    const qs = url.toString();
    return qs ? `/search?${qs}` : "/search";
  };

  const tabs = [
    {
      id: "all",
      label: "All",
      href: hrefFor("all"),
      count: searching ? total : undefined,
    },
    {
      id: "projects",
      label: "Projects",
      href: hrefFor("projects"),
      count: searching || type === "projects" ? projects.length : undefined,
    },
    {
      id: "candidates",
      label: "Candidates",
      href: hrefFor("candidates"),
      count: searching || type === "candidates" ? candidates.length : undefined,
    },
    {
      id: "companies",
      label: "Companies",
      href: hrefFor("companies"),
      count: searching || type === "companies" ? companies.length : undefined,
    },
  ];

  const heading = searching
    ? `Results for “${query}”`
    : type === "candidates"
      ? "Discover talent"
      : type === "companies"
        ? "Companies"
        : type === "projects"
          ? "Projects"
          : "Search";

  const filters =
    type === "projects" ? (
      <>
        <Field label="Topic">
          <select
            name="category"
            defaultValue={projectFilters.category ?? ""}
            className={fieldClass}
          >
            <option value="">Any topic</option>
            {CATEGORY_ORDER.map((key) => (
              <option key={key} value={key}>
                {PROJECT_CATEGORIES[key].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fee">
          <select
            name="pay"
            defaultValue={projectFilters.minPay ? String(projectFilters.minPay) : ""}
            className={fieldClass}
          >
            <option value="">Any fee</option>
            {PAY_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Effort">
          <select
            name="hours"
            defaultValue={projectFilters.maxHours ? String(projectFilters.maxHours) : ""}
            className={fieldClass}
          >
            <option value="">Any effort</option>
            {HOURS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Check
          name="open"
          checked={projectFilters.openOnly}
          label="Open to applications"
        />
      </>
    ) : type === "candidates" || type === "companies" ? (
      <>
        <Field label={type === "candidates" ? "Skill" : "Tech stack"}>
          <input
            name="skill"
            defaultValue={directoryFilters.skill}
            placeholder="e.g. React"
            className={fieldClass}
          />
        </Field>
        <Field label="Location">
          <input
            name="location"
            defaultValue={directoryFilters.location}
            placeholder="e.g. Delhi"
            className={fieldClass}
          />
        </Field>
        {type === "candidates" ? (
          <Check
            name="verified"
            checked={directoryFilters.verifiedOnly}
            label="Has verified work"
          />
        ) : (
          <Check name="hiring" checked={directoryFilters.hiringOnly} label="Hiring now" />
        )}
      </>
    ) : null;

  const noResults = total === 0 && (searching || browsing);

  return (
    <div className="bg-canvas">
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-6">
        <form action="/search" role="search" className="space-y-4">
          {type !== "all" && <input type="hidden" name="type" value={type} />}
          <div className="flex gap-2">
            <label className="relative flex-1">
              <span className="sr-only">Search Trialent</span>
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400"
                aria-hidden
              />
              <input
                type="search"
                name="q"
                defaultValue={query}
                autoFocus={!searching && !browsing}
                placeholder="Search projects, candidates, companies or skills"
                className="h-11 w-full rounded-xl border border-line bg-surface pl-11 pr-4 text-base text-ink-900 shadow-xs outline-none placeholder:text-ink-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              />
            </label>
            <Button type="submit" size="lg">
              Search
            </Button>
          </div>

          <div>
            <h1 className="text-xl font-semibold text-ink-900">{heading}</h1>
            {type === "candidates" && !searching && (
              <p className="mt-0.5 text-sm text-ink-500">
                Candidates who show their profile in search, most verified work first.
              </p>
            )}
          </div>

          <LinkTabs tabs={tabs} active={type} label="Result types" />

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
            {filters && (
              <aside>
                {/*
                  One set of fields (so nothing is submitted twice): a drawer
                  on phones, toggled by an unnamed checkbox; a column on desktop.
                */}
                <input
                  type="checkbox"
                  id="filters-toggle"
                  className="peer sr-only"
                  aria-label="Show filters"
                />
                <label
                  htmlFor="filters-toggle"
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-medium text-ink-800 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 lg:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4 text-ink-400" aria-hidden />
                  Filters
                </label>
                <div className="mt-2 hidden space-y-4 rounded-xl border border-line bg-surface p-4 peer-checked:block lg:mt-0 lg:block">
                  <p className="hidden text-sm font-semibold text-ink-900 lg:block">
                    Filters
                  </p>
                  {filters}
                  <div className="flex gap-2 pt-1">
                    <Button type="submit" size="sm" className="flex-1">
                      Apply filters
                    </Button>
                    <Link href={hrefFor(type)}>
                      <Button type="button" size="sm" variant="ghost">
                        Reset
                      </Button>
                    </Link>
                  </div>
                </div>
              </aside>
            )}

            <div className={filters ? "space-y-6" : "space-y-6 lg:col-span-2"}>
              {!searching && type === "all" ? (
                <div className="space-y-6">
                  <section className="rounded-xl border border-line bg-surface p-5">
                    <p className="text-sm font-semibold text-ink-900">Try a search</p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {SEARCH_SUGGESTIONS[user.role].map((term) => (
                        <li key={term}>
                          <Link
                            href={searchHref(term)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-sm text-ink-700 hover:border-ink-300 hover:bg-ink-50"
                          >
                            <Search className="h-3.5 w-3.5 text-ink-400" aria-hidden />
                            {term}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-4 text-sm">
                      <Link
                        href="/search?type=projects"
                        className="font-medium text-brand-700 hover:underline"
                      >
                        Browse projects
                      </Link>
                      <Link
                        href="/search?type=candidates"
                        className="font-medium text-brand-700 hover:underline"
                      >
                        Discover talent
                      </Link>
                      <Link
                        href="/search?type=companies"
                        className="font-medium text-brand-700 hover:underline"
                      >
                        All companies
                      </Link>
                    </div>
                  </section>
                  {following.length > 0 && (
                    <ResultGroup title="You follow" total={following.length}>
                      {following.map((result) =>
                        result.kind === "company" ? (
                          <CompanyResultRow key={`c-${result.id}`} company={result} />
                        ) : (
                          <CandidateResultRow key={`p-${result.id}`} candidate={result} />
                        )
                      )}
                    </ResultGroup>
                  )}
                </div>
              ) : noResults ? (
                <EmptyState
                  icon={SearchX}
                  title={searching ? `Nothing matches “${query}”` : "Nothing to show yet"}
                  description={
                    searching
                      ? "Try a skill like “React”, a company name, a role, or fewer filters."
                      : "Try a different filter, or check back soon."
                  }
                  actionText={
                    searching && type !== "all" ? "Search everything" : undefined
                  }
                  actionHref={searching && type !== "all" ? hrefFor("all") : undefined}
                />
              ) : (
                <>
                  {(type === "all" || type === "projects") && projects.length > 0 && (
                    <ResultGroup
                      title="Projects"
                      total={projects.length}
                      moreHref={type === "all" ? hrefFor("projects") : undefined}
                    >
                      {(type === "all" ? projects.slice(0, PREVIEW) : projects).map(
                        (project) => (
                          <ProjectResultRow
                            key={project.id}
                            project={project}
                            query={query}
                          />
                        )
                      )}
                    </ResultGroup>
                  )}
                  {(type === "all" || type === "candidates") && candidates.length > 0 && (
                    <ResultGroup
                      title="Candidates"
                      total={candidates.length}
                      moreHref={type === "all" ? hrefFor("candidates") : undefined}
                    >
                      {(type === "all" ? candidates.slice(0, PREVIEW) : candidates).map(
                        (candidate) => (
                          <CandidateResultRow
                            key={candidate.id}
                            candidate={candidate}
                            query={query}
                          />
                        )
                      )}
                    </ResultGroup>
                  )}
                  {(type === "all" || type === "companies") && companies.length > 0 && (
                    <ResultGroup
                      title="Companies"
                      total={companies.length}
                      moreHref={type === "all" ? hrefFor("companies") : undefined}
                    >
                      {(type === "all" ? companies.slice(0, PREVIEW) : companies).map(
                        (company) => (
                          <CompanyResultRow
                            key={company.id}
                            company={company}
                            query={query}
                          />
                        )
                      )}
                    </ResultGroup>
                  )}
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
