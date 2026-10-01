import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  Hammer,
  Handshake,
} from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { OPPORTUNITY_TYPES } from "@/lib/constants";
import { PageHeader } from "@/components/common/page-header";
import { StatusBanner } from "@/components/common/status-banner";
import { OpportunityBadge } from "@/components/projects/opportunity-badge";
import { CreateBuildForm } from "@/components/company/create-build-form";
import { CreateHireForm } from "@/components/company/create-hire-form";
import { CreateFreelanceForm } from "@/components/company/create-freelance-form";
import type { OpportunityType } from "@/lib/types/database.types";

const CHOICES: {
  type: OpportunityType;
  icon: typeof Hammer;
  cta: string;
  points: string[];
}[] = [
  {
    type: "hire",
    icon: BriefcaseBusiness,
    cta: "Create hiring opportunity",
    points: [
      "Set how many people you'll hire",
      "Cap how many can apply",
      "Shortlist, interview and select",
    ],
  },
  {
    type: "build",
    icon: Hammer,
    cta: "Create build project",
    points: [
      "Requirements, deliverables and a fee",
      "One selected candidate builds it",
      "Evaluate the delivered work",
    ],
  },
  {
    type: "freelance",
    icon: Handshake,
    cta: "Create freelance contract",
    points: [
      "Fixed-price milestones or an hourly rate",
      "One freelancer delivers the work",
      "Approve each delivery, then pay directly",
    ],
  },
];

const ICON_TINT: Record<OpportunityType, string> = {
  hire: "border-sky-200 bg-sky-50 text-sky-700",
  build: "border-brand-200 bg-brand-50 text-brand-700",
  freelance: "border-ink-300 bg-ink-100 text-ink-700",
};

const PRICE_LINE: Record<OpportunityType, string> = {
  hire: "Free",
  build: "Paid project",
  freelance: "Paid contract",
};

const CREATE_TITLE: Record<OpportunityType, string> = {
  hire: "Create a hiring opportunity",
  build: "Create a build project",
  freelance: "Create a freelance contract",
};

/**
 * Posting starts by choosing what you need — a hire, a build or a freelance
 * contract — before any type-specific field appears.
 */
export default async function CreateOpportunityPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; error?: string }>;
}) {
  await requireRole(["company", "admin"]);
  const { type, error } = await searchParams;
  const chosen: OpportunityType | null =
    type === "hire" || type === "build" || type === "freelance" ? type : null;

  if (!chosen) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={
            <Link
              href="/company/projects"
              className="inline-flex items-center gap-1 hover:text-ink-900"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              Opportunities
            </Link>
          }
          title="What are you looking to do?"
          description="Hire for an open role, get a project built by one selected candidate, or bring in a freelancer on a paid contract."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {CHOICES.map(({ type: value, icon: Icon, cta, points }) => {
            const info = OPPORTUNITY_TYPES[value];
            const free = value === "hire";
            return (
              <Link
                key={value}
                href={`/company/projects/create?type=${value}`}
                className="group flex flex-col rounded-xl border border-line bg-surface p-6 transition-colors hover:border-ink-300 focus-visible:border-brand-400"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-lg border ${ICON_TINT[value]}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <OpportunityBadge type={value} />
                </div>
                <h2 className="mt-5 text-lg font-semibold text-ink-900">{info.title}</h2>
                <p className="mt-1 text-sm text-ink-600">{info.summary}</p>
                <ul className="mt-4 flex-1 space-y-2">
                  {points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-2 text-sm text-ink-700"
                    >
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-ink-400"
                        aria-hidden
                      />
                      {point}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line pt-4">
                  <span
                    className={
                      free
                        ? "whitespace-nowrap text-sm font-semibold text-emerald-700"
                        : "whitespace-nowrap text-sm font-medium text-ink-700"
                    }
                  >
                    {PRICE_LINE[value]}
                  </span>
                  <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium text-brand-700">
                    {cta}
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  const info = OPPORTUNITY_TYPES[chosen];
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href="/company/projects/create"
            className="inline-flex items-center gap-1 hover:text-ink-900"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            Change type
          </Link>
        }
        title={CREATE_TITLE[chosen]}
        description={`${info.summary} ${info.price}.`}
        actions={<OpportunityBadge type={chosen} />}
      />
      {error && <StatusBanner tone="error">{error}</StatusBanner>}
      {chosen === "hire" ? (
        <CreateHireForm />
      ) : chosen === "freelance" ? (
        <CreateFreelanceForm />
      ) : (
        <CreateBuildForm />
      )}
    </div>
  );
}
