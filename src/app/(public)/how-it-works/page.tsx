import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MarketingHero,
  StepList,
  type Step,
} from "@/components/marketing/marketing-page";

const STEPS: Step[] = [
  {
    title: "A company posts a scoped project",
    body: "A real, job-relevant piece of work with clear acceptance criteria, the skills it needs, and the fee stated upfront (e.g. ₹5,000).",
  },
  {
    title: "Candidates read the brief and apply",
    body: "Engineers find projects that match their stack and apply with their profile and how they'd approach the work.",
  },
  {
    title: "The company selects one candidate",
    body: "It reviews applicants and picks the best fit. Once the work is accepted, the company pays the candidate directly — Trialent never holds the money.",
  },
  {
    title: "The candidate builds and submits",
    body: "Within the deadline, with a visible trail: commits, clarifying questions, and a repository, live demo and documentation at the end.",
  },
  {
    title: "The company evaluates and decides",
    body: "The team reviews the actual code, tests and docs against the criteria it published, records structured feedback, and decides whether to interview or hire.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 py-16 sm:px-6 lg:py-20">
      <MarketingHero
        chip="How it works"
        title="Five steps from brief to decision."
        lead="The same loop for every project, so every candidate is judged on real work and the same criteria."
      />
      <StepList steps={STEPS} />
      <div className="flex justify-center">
        <Link href="/projects">
          <Button size="lg">
            Browse projects
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </Link>
      </div>
    </div>
  );
}
