import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SignedOutCta } from "@/components/layout/signed-out-cta";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ForCandidatesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900">
          Prove What You Can Build. Get Paid. Get Hired.
        </h1>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Tired of sending 100+ resumes and being rejected for having &quot;no
          experience&quot;? Trialent gives you a direct path to show your engineering
          skills through real paid projects for real startups.
        </p>
        <div>
          <SignedOutCta>
            <Link href="/signup?role=candidate">
              <Button size="lg">Join as a Candidate</Button>
            </Link>
          </SignedOutCta>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Terms stated upfront</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Build projects state their fee (e.g. ₹5,000) on the brief, before you apply.
            Hiring roles may include an unpaid assessment — at most 8 hours, and always
            labelled.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Verified Work History</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Every accepted project becomes part of your verified work history, showing who
            evaluated it and against which criteria.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
