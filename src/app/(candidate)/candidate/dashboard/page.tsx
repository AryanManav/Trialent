import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Hammer,
  IndianRupee,
  Inbox,
  Search,
} from "lucide-react";
import { requireCandidate } from "@/lib/auth/guards";
import {
  getCandidateActivityDates,
  getCandidateApplications,
  getCandidateDashboardStats,
  getCandidateProfile,
  getGithubIdentity,
} from "@/lib/data/candidate";
import { getCandidateTrials } from "@/lib/data/trial";
import { getOpenProjects } from "@/lib/data/project";
import { getUnreadNotifications } from "@/lib/data/notifications";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/empty-state";
import { CompanyMark } from "@/components/common/company-mark";
import { ActivityStreak } from "@/components/candidate/activity-streak";
import { ApplicationList } from "@/components/candidate/application-list";
import { GitHubConnect } from "@/components/candidate/github-connect";
import { GithubLinkBanner } from "@/components/candidate/github-link-banner";
import { NextUpCard } from "@/components/candidate/next-up-card";
import { ProfileStrengthCard } from "@/components/candidate/profile-strength-card";
import { UpdatesPanel } from "@/components/notifications/updates-panel";
import { summarizeApplications } from "@/lib/applications";
import { greetingFor, nextActionFor } from "@/lib/next-action";
import { cn, formatCurrency } from "@/lib/utils";
import { listingTerms } from "@/lib/projects";
import { DEFAULT_CURRENCY } from "@/lib/constants";

export const dynamic = "force-dynamic";

function firstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? "";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/** Answers "what should I do next?" first, then the numbers behind it. */
export default async function CandidateDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ github?: string }>;
}) {
  const user = await requireCandidate();
  const { github } = await searchParams;
  const profile = await getCandidateProfile(user.id);

  const [
    applications,
    trials,
    activityDates,
    stats,
    openProjects,
    githubUsername,
    updates,
  ] = await Promise.all([
    profile ? getCandidateApplications(profile.id) : [],
    profile ? getCandidateTrials(profile.id) : [],
    profile ? getCandidateActivityDates(profile.id) : [],
    getCandidateDashboardStats(profile),
    getOpenProjects(4),
    getGithubIdentity(),
    getUnreadNotifications(user.id),
  ]);

  const summary = summarizeApplications(applications);
  const next = nextActionFor(trials, applications);

  return (
    <div className="space-y-6">
      <GithubLinkBanner status={github} />

      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">
            {greetingFor()}, {firstName(user.fullName)}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Here&apos;s what needs your attention.
          </p>
        </div>
        <Link href="/projects" className="shrink-0">
          <Button variant="outline">
            <Search className="h-4 w-4" aria-hidden />
            Browse projects
          </Button>
        </Link>
      </header>

      <NextUpCard action={next} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Applications"
          value={summary.pending}
          hint={`Pending review · ${summary.total} sent`}
          icon={FileText}
          href="/candidate/applications"
        />
        <StatCard
          label="Active work"
          value={summary.activeTrials}
          hint={summary.activeTrials > 0 ? "Currently in progress" : "None in progress"}
          icon={Hammer}
          tone={summary.activeTrials > 0 ? "attention" : "default"}
          href="/candidate/trials"
        />
        <StatCard
          label="Completed projects"
          value={summary.completed}
          hint="Work accepted by the startup"
          icon={CheckCircle2}
          href="/candidate/completed"
        />
        <StatCard
          label="Project earnings"
          value={formatCurrency(summary.completedValue, DEFAULT_CURRENCY)}
          hint="Agreed fees of accepted work"
          icon={IndianRupee}
          tone="positive"
        />
      </div>

      {updates.length > 0 && (
        <UpdatesPanel
          items={updates}
          emptyText="When a startup reviews your application, selects you, messages you or evaluates your work, it shows up here."
        />
      )}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section aria-labelledby="recent-applications" className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h2
                id="recent-applications"
                className="text-base font-semibold text-ink-900"
              >
                Recent applications
              </h2>
              {applications.length > 0 && (
                <Link
                  href="/candidate/applications"
                  className="text-sm font-medium text-brand-700 hover:underline"
                >
                  View all ({applications.length})
                </Link>
              )}
            </div>
            {applications.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No applications yet"
                description="Apply to a paid project that matches your skills. Every one you complete becomes verified evidence."
                actionText="Browse projects"
                actionHref="/projects"
              />
            ) : (
              <ApplicationList applications={applications.slice(0, 5)} />
            )}
          </section>

          <section aria-labelledby="recommended" className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h2 id="recommended" className="text-base font-semibold text-ink-900">
                Open projects
              </h2>
              <Link
                href="/projects"
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                Browse all
              </Link>
            </div>
            {openProjects.length === 0 ? (
              <EmptyState
                compact
                icon={Search}
                title="No open projects right now"
                description="Startups post new paid projects regularly. Check back soon."
              />
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                {openProjects.map((project) => {
                  const terms = listingTerms(project);
                  return (
                    <li key={project.id}>
                      <Link
                        href={`/projects/${project.slug}`}
                        className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ink-50"
                      >
                        <CompanyMark name={project.companyName ?? "Startup"} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink-900">
                            {project.title}
                          </p>
                          <p className="truncate text-xs text-ink-500">
                            {project.companyName ?? "Startup"} · {terms.effort}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "tabular shrink-0 text-sm font-medium",
                            project.opportunityType === "hire"
                              ? "text-ink-700"
                              : "text-emerald-700"
                          )}
                        >
                          {terms.price}
                        </span>
                        <ArrowRight
                          aria-hidden
                          className="hidden h-4 w-4 text-ink-300 group-hover:text-ink-600 sm:block"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <ProfileStrengthCard
            value={stats.profileStrength}
            checklist={stats.checklist}
          />
          <ActivityStreak activityDates={activityDates} />
          <GitHubConnect
            verifiedUsername={githubUsername}
            reportedUrl={profile?.githubUrl ?? null}
          />
        </aside>
      </div>
    </div>
  );
}
