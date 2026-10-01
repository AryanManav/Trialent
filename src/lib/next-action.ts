import { ACTIVITY_TIME_ZONE } from "@/lib/activity";
import { isClosedWork, stageOf, workHref } from "@/lib/applications";
import type { StatusTone } from "@/lib/status";
import type { ApplicationSummaryView, TrialView } from "@/lib/types/domain";

/**
 * The one thing a candidate should do next, for the top of the dashboard.
 * Work the candidate owes beats work they're waiting on, which beats browsing.
 */
export interface NextAction {
  kind: "revise" | "submit" | "awaiting" | "pending" | "caught_up";
  eyebrow: string;
  title: string;
  /** The project it's about, when there is one. */
  trial: TrialView | null;
  detail: string;
  href: string;
  cta: string;
  tone: StatusTone;
}

const DAY = 86_400_000;

/** "Due tomorrow", "Due in 5 days", "Overdue by 2 days". */
export function dueLabel(deadline: string, now: Date = new Date()): string {
  const days = Math.ceil((new Date(deadline).getTime() - now.getTime()) / DAY);
  if (days < 0) return `Overdue by ${-days} day${days === -1 ? "" : "s"}`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

function byDeadline(a: TrialView, b: TrialView) {
  return new Date(a.projectDeadline).getTime() - new Date(b.projectDeadline).getTime();
}

export function nextActionFor(
  trials: TrialView[],
  applications: ApplicationSummaryView[],
  now: Date = new Date()
): NextAction {
  const open = trials.filter((trial) => !isClosedWork(trial)).sort(byDeadline);

  const revision = open.find((trial) => trial.workStatus === "revision_requested");
  if (revision) {
    return {
      kind: "revise",
      eyebrow: "Needs your action",
      title: "Revise and resubmit your work",
      trial: revision,
      detail: dueLabel(revision.projectDeadline, now),
      href: workHref(revision.projectId, revision.opportunityType),
      cta: "See what to change",
      tone: "attention",
    };
  }

  const building = open.find((trial) => trial.workStatus === "in_progress");
  if (building) {
    return {
      kind: "submit",
      eyebrow: "Next up",
      title:
        building.opportunityType === "freelance"
          ? "Keep your contract moving"
          : "Complete your project submission",
      trial: building,
      detail: dueLabel(building.projectDeadline, now),
      href: workHref(building.projectId, building.opportunityType),
      cta:
        building.opportunityType === "freelance" ? "Open contract" : "Continue project",
      tone: "active",
    };
  }

  const awaiting = open.find(
    (trial) => trial.workStatus === "submitted" || trial.workStatus === "under_review"
  );
  if (awaiting) {
    return {
      kind: "awaiting",
      eyebrow: "Waiting on the startup",
      title: "Your work is being evaluated",
      trial: awaiting,
      detail: "You'll be notified when they decide",
      href: workHref(awaiting.projectId, awaiting.opportunityType),
      cta: "View submission",
      tone: "warning",
    };
  }

  const pending = applications.filter((application) =>
    ["applied", "reviewing", "shortlisted"].includes(stageOf(application))
  ).length;
  if (pending > 0) {
    return {
      kind: "pending",
      eyebrow: "In review",
      title: `${pending} application${pending === 1 ? " is" : "s are"} with startups`,
      trial: null,
      detail: "Apply to more projects while you wait — each one is a separate chance.",
      href: "/projects",
      cta: "Browse projects",
      tone: "warning",
    };
  }

  return {
    kind: "caught_up",
    eyebrow: "You're all caught up",
    title: "Find your next paid project",
    trial: null,
    detail: "Every project you complete becomes verified evidence on your profile.",
    href: "/projects",
    cta: "Browse projects",
    tone: "neutral",
  };
}

/** "Good morning" / "Good afternoon" / "Good evening", on the Indian clock. */
export function greetingFor(now: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: ACTIVITY_TIME_ZONE,
    }).format(now)
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
