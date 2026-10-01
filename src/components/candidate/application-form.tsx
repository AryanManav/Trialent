"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { createApplicationAction } from "@/lib/actions/candidate";
import { Button } from "@/components/ui/button";
import type { OpportunityType } from "@/lib/types/database.types";

const COPY: Record<
  OpportunityType,
  { why: string; whyHint: string; experience: string; experienceHint: string }
> = {
  build: {
    why: "Why are you a strong fit?",
    whyHint:
      "Describe your proposed approach and the experience most relevant to this project.",
    experience: "Relevant experience",
    experienceHint: "Mention a similar project, repository, or technical challenge.",
  },
  hire: {
    why: "Why are you interested in this role?",
    whyHint: "What draws you to the role and the team, and what you'd bring to it.",
    experience: "What relevant project have you worked on?",
    experienceHint:
      "A project, repository or piece of work that shows the skills this role needs.",
  },
  freelance: {
    why: "How would you approach this contract?",
    whyHint: "Your plan for the milestones or the weekly work, and when you could start.",
    experience: "Similar work you've delivered",
    experienceHint: "A client project, repository or portfolio piece like this one.",
  },
};

/**
 * Applying to a role or a project. Either way the startup also sees the
 * candidate's profile — skills, projects, links and verified Trialent work.
 */
export function ApplicationForm({
  projectId,
  kind = "build",
  hasAssessment = false,
}: {
  projectId: string;
  kind?: OpportunityType;
  /** Hire only: after applying, the candidate goes on to the assessment. */
  hasAssessment?: boolean;
}) {
  const [state, action, pending] = useActionState(createApplicationAction, null);
  const copy = COPY[kind];

  if (state?.success && kind === "hire" && hasAssessment)
    return (
      <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <p className="font-semibold">Application submitted</p>
        <p>You are now taking part in the hiring assessment.</p>
        <Link href={`/candidate/assessments/${projectId}`} className="inline-block">
          <Button size="sm">Start assessment</Button>
        </Link>
      </div>
    );
  if (state?.success)
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        Application submitted. You can follow its progress from My work.
      </div>
    );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      {state?.error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor="coverMessage" className="text-sm font-medium text-ink-800">
          {copy.why}
        </label>
        <textarea
          id="coverMessage"
          name="coverMessage"
          required
          minLength={20}
          rows={5}
          className="mt-1.5 w-full rounded-lg border border-line bg-surface p-3 text-sm text-ink-900"
          placeholder={copy.whyHint}
        />
      </div>
      <div>
        <label htmlFor="relevantExperience" className="text-sm font-medium text-ink-800">
          {copy.experience} <span className="font-normal text-ink-400">optional</span>
        </label>
        <textarea
          id="relevantExperience"
          name="relevantExperience"
          rows={3}
          className="mt-1.5 w-full rounded-lg border border-line bg-surface p-3 text-sm text-ink-900"
          placeholder={copy.experienceHint}
        />
      </div>
      <p className="text-xs text-ink-500">
        The startup also sees your profile: skills, projects, links and any verified
        Trialent work.
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit application"}
      </Button>
    </form>
  );
}
