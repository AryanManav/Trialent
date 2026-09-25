import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ClipboardList,
  FileSearch,
  Hammer,
  IndianRupee,
  Minus,
  Scale,
  Send,
  ShieldCheck,
  Target,
  UserCheck,
  Users,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/guards";
import { homeFor } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { StatusBanner } from "@/components/common/status-banner";
import { SectionHeading } from "@/components/marketing/section-heading";
import { HeroWorkflow } from "@/components/marketing/hero-workflow";

const HERO_POINTS = ["Real projects", "Paid work", "Evidence-based evaluation"];

const ROLES = [
  "Frontend",
  "Backend",
  "Full-stack",
  "Mobile",
  "QA & testing",
  "Data analysis",
  "Data engineering",
  "AI / ML",
  "DevOps",
];

const COMPARISON = {
  traditional: [
    "Resume screening on keywords",
    "Generic, timed assessments",
    "Several rounds of interviews",
    "Little evidence of real output",
  ],
  trialent: [
    "Real requirements from the startup",
    "Scoped work, with the terms stated upfront",
    "Observable execution: commits, questions, delivery",
    "Structured evaluation against stated criteria",
  ],
};

const STEPS = [
  {
    icon: ClipboardList,
    title: "Company posts a project",
    body: "A scoped brief: requirements, deliverables, the fee, and exactly how the work will be evaluated.",
  },
  {
    icon: Send,
    title: "Candidates apply",
    body: "Candidates read the full brief first and apply to the projects that fit their skills.",
  },
  {
    icon: Hammer,
    title: "The selected candidate builds",
    body: "Paid work with a visible trail — commits, clarifying questions, and a submission against the brief.",
  },
  {
    icon: Scale,
    title: "The company evaluates",
    body: "Against the criteria it published. Then it decides: interview, hire, or pass — with evidence.",
  },
];

const FOR_CANDIDATES = [
  "Discover real projects from startups",
  "Paid projects, with the fee stated upfront",
  "Build a verified history of accepted work",
  "Receive structured, written evaluation",
  "Get in front of teams that are hiring",
];

const FOR_STARTUPS = [
  "Test real skills on your own problem",
  "Reduce hiring uncertainty before interviews",
  "Standardize how every candidate is evaluated",
  "See actual engineering work, not claims",
  "Identify who is worth interviewing",
];

const EVIDENCE = [
  { label: "Requirements met", value: "4 of 4" },
  { label: "Code quality", value: "Exceeds expectations" },
  { label: "Testing", value: "Meets expectations" },
  { label: "Documentation", value: "Meets expectations" },
  { label: "Delivered on time", value: "Yes" },
  { label: "Revisions required", value: "1" },
];

function CheckList({
  items,
  tone = "brand",
}: {
  items: string[];
  tone?: "brand" | "muted";
}) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-sm text-ink-700">
          {tone === "brand" ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />
          ) : (
            <Minus className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden />
          )}
          {item}
        </li>
      ))}
    </ul>
  );
}

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const { account } = await searchParams;
  // Signed-in users skip the marketing page and land on their dashboard.
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));

  return (
    <div>
      {account === "deleted" && (
        <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
          <StatusBanner tone="success">
            Your account has been deleted. Thanks for trying Trialent.
          </StatusBanner>
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden
          className="absolute inset-0 bg-line-grid opacity-40 mask-radial"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 hidden h-[34rem] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgb(var(--brand-600)/0.14),transparent)] dark:block"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">
              Project-based talent evaluation
            </p>
            <h1 className="mt-4 text-balance text-4xl font-semibold text-ink-950 sm:text-5xl lg:text-6xl">
              Evaluate talent through real work.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-600">
              Startups evaluate engineers through standardized, paid micro-projects —
              giving both sides real evidence before a hiring decision.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/projects">
                <Button size="lg">
                  Browse projects
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button size="lg" variant="outline">
                  How it works
                </Button>
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
              {HERO_POINTS.map((point) => (
                <li key={point} className="flex items-center gap-2 text-sm text-ink-600">
                  <Check className="h-4 w-4 text-emerald-700" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <HeroWorkflow />
        </div>
      </section>

      {/* Roles band */}
      <section className="border-b border-line bg-canvas">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:gap-10">
          <p className="shrink-0 text-sm font-medium text-ink-600">
            Built for companies that value demonstrated ability — across
          </p>
          <ul className="flex flex-wrap gap-2">
            {ROLES.map((role) => (
              <li
                key={role}
                className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-600"
              >
                {role}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <SectionHeading
          chip="Why Trialent"
          title="Resumes tell you what someone claims."
          trailing="Real projects show you how they work."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface p-6">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-md border border-line bg-ink-50 text-ink-500">
                <FileSearch className="h-4 w-4" aria-hidden />
              </span>
              <h3 className="text-base font-semibold text-ink-900">Traditional hiring</h3>
            </div>
            <div className="mt-5">
              <CheckList items={COMPARISON.traditional} tone="muted" />
            </div>
          </div>
          <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-6">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-md border border-brand-200 bg-surface text-brand-700">
                <Target className="h-4 w-4" aria-hidden />
              </span>
              <h3 className="text-base font-semibold text-ink-900">
                The Trialent approach
              </h3>
            </div>
            <div className="mt-5">
              <CheckList items={COMPARISON.trialent} />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-line bg-canvas">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
          <SectionHeading
            chip="How it works"
            title="Four steps from brief to decision."
            subtitle="The same loop for every project, so every candidate is judged the same way."
          />
          <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.title}
                  className="rounded-xl border border-line bg-surface p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="tabular font-mono text-xs font-medium text-ink-400">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <Icon className="h-4 w-4 text-brand-700" aria-hidden />
                  </div>
                  <h3 className="mt-6 text-sm font-semibold text-ink-900">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-ink-500">{step.body}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Audiences */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col rounded-xl border border-line bg-surface p-8">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-ink-50 text-ink-600">
              <Users className="h-4 w-4" aria-hidden />
            </span>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">
              For candidates
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-ink-900">
              Prove what you can do, and get paid for it.
            </h3>
            <div className="mt-6 flex-1">
              <CheckList items={FOR_CANDIDATES} />
            </div>
            <Link href="/projects" className="mt-8">
              <Button>
                Explore projects
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
          </div>
          <div className="flex flex-col rounded-xl border border-night-line bg-night p-8 text-white">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 bg-white/5 text-white/80">
              <ShieldCheck className="h-4 w-4" aria-hidden />
            </span>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.08em] text-white/55">
              For startups
            </p>
            <h3 className="mt-2 text-2xl font-semibold">
              See the work before you spend a round on the interview.
            </h3>
            <ul className="mt-6 flex-1 space-y-2.5">
              {FOR_STARTUPS.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-white/80">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/signup?role=company" className="mt-8">
              <Button className="bg-white text-night hover:bg-white/90 active:bg-white/80">
                Post a project
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Evidence */}
      <section className="border-y border-line bg-canvas">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <SectionHeading
              align="left"
              chip="Evidence"
              title="An evaluation you can act on."
              subtitle="Companies evaluate against the criteria they published before anyone applied. Quality is recorded in clear bands next to observable facts — not a single opaque score."
            />
            <ul className="mt-6 space-y-3 text-sm text-ink-600">
              <li className="flex gap-2.5">
                <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
                Accepted work becomes verified history on the candidate&apos;s profile.
              </li>
              <li className="flex gap-2.5">
                <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
                Candidates see every decision, with any note the company adds.
              </li>
            </ul>
          </div>
          <article
            aria-label="Example evaluation"
            className="rounded-xl border border-line bg-surface shadow-md"
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-ink-500">
                  Project evaluation · Example
                </p>
                <p className="mt-0.5 text-sm font-semibold text-ink-900">
                  Real-time collaborative Kanban board
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                <Check className="h-3.5 w-3.5" aria-hidden />
                Accepted
              </span>
            </header>
            <dl className="divide-y divide-line">
              {EVIDENCE.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-4 px-5 py-2.5 text-sm"
                >
                  <dt className="text-ink-500">{row.label}</dt>
                  <dd className="font-medium text-ink-900">{row.value}</dd>
                </div>
              ))}
            </dl>
            <div className="border-t border-line px-5 py-4">
              <p className="text-2xs font-semibold uppercase tracking-wider text-ink-500">
                Company feedback
              </p>
              <p className="mt-1.5 text-sm text-ink-700">
                &ldquo;Clear component structure and sensible state handling. Sync logic
                was well tested; the README made review quick.&rdquo;
              </p>
            </div>
            <footer className="flex items-center justify-between rounded-b-xl border-t border-line bg-ink-50 px-5 py-3">
              <span className="text-sm text-ink-600">Hiring signal</span>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                <UserCheck className="h-4 w-4" aria-hidden />
                Would interview
              </span>
            </footer>
          </article>
        </div>
      </section>

      {/* Payment */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div className="order-2 lg:order-1">
          <div className="rounded-xl border border-line bg-surface p-6 shadow-md">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700">
                <IndianRupee className="h-4 w-4" aria-hidden />
              </span>
              <p className="text-sm font-semibold text-ink-900">
                Project terms · Example
              </p>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-line pt-5">
              <div>
                <dt className="text-xs text-ink-500">Project value</dt>
                <dd className="tabular mt-1 text-xl font-semibold text-ink-900">
                  ₹5,000
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-500">Scope</dt>
                <dd className="tabular mt-1 text-xl font-semibold text-ink-900">
                  8 hours
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-500">Fee</dt>
                <dd className="mt-1 text-xl font-semibold text-emerald-700">
                  Stated upfront
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <SectionHeading
            align="left"
            chip="Clear terms"
            title="The terms are on the brief before you apply."
            subtitle="Build projects state their fee and scope upfront, and the company pays the candidate directly. Hiring roles may ask for a short unpaid assessment — at most 8 hours, and labelled on every listing."
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-night-line bg-night px-6 py-14 text-center sm:px-12">
          <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold text-white sm:text-4xl">
            Stop guessing. See how candidates actually work.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/70">
            Post a paid project, or find one that shows what you can build.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/projects">
              <Button size="lg" className="bg-white text-night hover:bg-white/90">
                Browse projects
              </Button>
            </Link>
            <Link href="/for-companies">
              <Button
                size="lg"
                variant="outline"
                className="border-white/25 bg-transparent text-white hover:border-white/40 hover:bg-white/10"
              >
                For startups
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
