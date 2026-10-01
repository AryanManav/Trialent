import Link from "next/link";
import { ArrowRight, Clock, GitCommitHorizontal, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignedOutCta } from "@/components/layout/signed-out-cta";
import { FeatureGrid, MarketingHero } from "@/components/marketing/marketing-page";

export default function ForCompaniesPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 py-16 sm:px-6 lg:py-20">
      <MarketingHero
        chip="For startups"
        title="See the work before you make the hire."
        lead={
          <>
            Hiring early-career engineers is one of the highest-variance decisions a
            startup makes. Standardize it with a short, scoped paid project — or an
            assessment of at most 8 hours for a role you&apos;re hiring for.
          </>
        }
      >
        <SignedOutCta>
          <Link href="/signup?role=company">
            <Button size="lg">
              Post a project
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
        </SignedOutCta>
        <Link href="/how-it-works">
          <Button size="lg" variant="outline">
            How it works
          </Button>
        </Link>
      </MarketingHero>

      <FeatureGrid
        features={[
          {
            icon: GitCommitHorizontal,
            title: "Observe real craft",
            body: "See actual commits, schema design, error handling and documentation before extending a full-time offer.",
          },
          {
            icon: Clock,
            title: "Save engineering hours",
            body: "Replace rounds of panel interviews with one review of real, asynchronous work.",
          },
          {
            icon: Scale,
            title: "A standard rubric",
            body: "Judge on observable evidence: what was required, what was delivered, what was missing — in bands, never a single opaque score.",
          },
        ]}
      />
    </div>
  );
}
