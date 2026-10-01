import Link from "next/link";
import { ArrowRight, BadgeCheck, IndianRupee, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignedOutCta } from "@/components/layout/signed-out-cta";
import { FeatureGrid, MarketingHero } from "@/components/marketing/marketing-page";

export default function ForCandidatesPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 py-16 sm:px-6 lg:py-20">
      <MarketingHero
        chip="For candidates"
        title="Prove what you can build, and get paid for it."
        lead={
          <>
            Tired of sending 100+ resumes and hearing &ldquo;no experience&rdquo;?
            Trialent lets you show your skills through real, paid projects for real
            startups.
          </>
        }
      >
        <SignedOutCta>
          <Link href="/signup?role=candidate">
            <Button size="lg">
              Join as a candidate
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
        </SignedOutCta>
        <Link href="/projects">
          <Button size="lg" variant="outline">
            Browse projects
          </Button>
        </Link>
      </MarketingHero>

      <FeatureGrid
        features={[
          {
            icon: IndianRupee,
            title: "Terms stated upfront",
            body: "Build projects state their fee (e.g. ₹5,000) on the brief, before you apply. Hiring roles may include an unpaid assessment — at most 8 hours, and always labelled.",
          },
          {
            icon: BadgeCheck,
            title: "Verified work history",
            body: "Every accepted project joins your verified history, showing who evaluated it and against which criteria.",
          },
          {
            icon: MessagesSquare,
            title: "Feedback you can use",
            body: "Companies evaluate in clear bands against the criteria they published, and you see every decision with any note they add.",
          },
        ]}
      />
    </div>
  );
}
