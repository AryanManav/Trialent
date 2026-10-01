import {
  BROWSABLE_PROJECT_STATUSES,
  CLOSED_PROJECT_STATUSES,
  CLOSED_WORK_STATUSES,
} from "@/lib/constants";
import type {
  ApplicationStatus,
  AssessmentStatus,
  OpportunityType,
  ProjectStatus,
  SelectionWorkStatus,
} from "@/lib/types/database.types";
import type { ApplicationSummaryView } from "@/lib/types/domain";
import type { StatusTone } from "@/lib/status";

/**
 * Where an application stands from the candidate's side. The application
 * status stops at "selected"; after that the project's own status says what is
 * happening, so the two are combined here once instead of in every page.
 */
export type ApplicationStage =
  | "applied"
  | "assessment_todo"
  | "assessment_in_progress"
  | "assessment_submitted"
  | "reviewing"
  | "shortlisted"
  | "interview"
  | "hired"
  | "building"
  | "awaiting_review"
  | "revision_requested"
  | "completed"
  | "work_not_accepted"
  | "cancelled"
  | "not_selected"
  | "withdrawn";

/** A selected candidate's work is over: done, or the project was withdrawn. */
export function isClosedWork(trial: {
  workStatus: SelectionWorkStatus;
  status: ProjectStatus;
}): boolean {
  return (
    trial.status === "cancelled" ||
    (CLOSED_WORK_STATUSES as readonly SelectionWorkStatus[]).includes(trial.workStatus)
  );
}

export function isClosedProject(status: ProjectStatus | null | undefined): boolean {
  return (
    !!status && (CLOSED_PROJECT_STATUSES as readonly ProjectStatus[]).includes(status)
  );
}

export function applicationStage(
  applicationStatus: ApplicationStatus,
  projectStatus: ProjectStatus | null | undefined,
  /** The candidate's own selection status; wins over the project's once selected. */
  workStatus?: SelectionWorkStatus | null,
  /** Hire-only applications have their own pipeline and never become work. */
  opportunityType: OpportunityType = "build",
  /**
   * Hire only: the assessment's status — "not_started" when the role has one
   * the candidate hasn't opened, null when it has none.
   */
  assessment: AssessmentStatus | "not_started" | null = null
): ApplicationStage {
  // A posting cancelled before any decision (e.g. its company left) closes
  // every application still waiting on it.
  if (
    projectStatus === "cancelled" &&
    (applicationStatus === "submitted" ||
      applicationStatus === "reviewing" ||
      applicationStatus === "shortlisted" ||
      applicationStatus === "interview")
  ) {
    return "cancelled";
  }

  switch (applicationStatus) {
    case "withdrawn":
      return "withdrawn";
    case "rejected":
      return "not_selected";
    case "reviewing":
      return "reviewing";
    case "shortlisted":
      return "shortlisted";
    case "interview":
      return "interview";
    case "submitted":
      if (opportunityType === "hire" && assessment === "not_started") {
        return "assessment_todo";
      }
      if (opportunityType === "hire" && assessment === "in_progress") {
        return "assessment_in_progress";
      }
      if (opportunityType === "hire" && assessment === "submitted") {
        return "assessment_submitted";
      }
      return "applied";
    case "selected":
      // Hire only: selected is the end — a hire, with no project to build.
      if (opportunityType === "hire") return "hired";
      // Several candidates can work on one project, so their own cycle decides.
      if (workStatus) {
        if (workStatus === "completed") return "completed";
        if (workStatus === "not_accepted") return "work_not_accepted";
        if (workStatus === "cancelled") return "cancelled";
        if (workStatus === "revision_requested") return "revision_requested";
        if (workStatus === "submitted" || workStatus === "under_review") {
          return "awaiting_review";
        }
        return projectStatus === "cancelled" ? "cancelled" : "building";
      }
      if (projectStatus === "completed") return "completed";
      if (projectStatus === "cancelled") return "cancelled";
      if (projectStatus === "revision_requested") return "revision_requested";
      if (projectStatus === "submitted" || projectStatus === "under_review") {
        return "awaiting_review";
      }
      return "building";
  }
}

/** An application's stage, from its own status and the candidate's work status. */
export function stageOf(application: ApplicationSummaryView): ApplicationStage {
  return applicationStage(
    application.status,
    application.project?.status,
    application.workStatus,
    application.project?.opportunityType,
    application.project?.hasAssessment
      ? (application.assessmentStatus ?? "not_started")
      : null
  );
}

/**
 * Selected candidates go to their workspace. Everyone else goes to the public
 * brief — which exists while Browse can list the project, so once it's
 * finished or cancelled there is nothing to link to.
 */
/** Where a selected candidate does the work: a trial workspace, or a contract. */
export function workHref(projectId: string, type: OpportunityType): string {
  return type === "freelance"
    ? `/candidate/contracts/${projectId}`
    : `/candidate/trials/${projectId}`;
}

export function applicationHref(application: ApplicationSummaryView): string | null {
  const project = application.project;
  if (!project) return null;
  if (application.status === "selected" && project.opportunityType !== "hire") {
    return workHref(project.id, project.opportunityType);
  }
  // Hire only: the assessment workspace, which stays readable after a decision.
  if (project.opportunityType === "hire" && project.hasAssessment) {
    return `/candidate/assessments/${project.id}`;
  }
  return (BROWSABLE_PROJECT_STATUSES as readonly ProjectStatus[]).includes(project.status)
    ? `/projects/${project.slug}`
    : null;
}

export const STAGE_DISPLAY: Record<
  ApplicationStage,
  {
    label: string;
    tone: StatusTone;
    action: string;
  }
> = {
  applied: { label: "Applied", tone: "info", action: "View brief" },
  assessment_todo: {
    label: "Assessment to do",
    tone: "attention",
    action: "Start assessment",
  },
  assessment_in_progress: {
    label: "Assessment in progress",
    tone: "active",
    action: "Continue assessment",
  },
  assessment_submitted: {
    label: "Assessment submitted",
    tone: "warning",
    action: "View submission",
  },
  reviewing: { label: "Under review", tone: "warning", action: "View brief" },
  shortlisted: { label: "Shortlisted", tone: "active", action: "View role" },
  interview: { label: "Interview", tone: "attention", action: "View role" },
  hired: { label: "Selected", tone: "success", action: "View role" },
  building: { label: "Active", tone: "active", action: "Continue project" },
  awaiting_review: { label: "Submitted", tone: "warning", action: "Track evaluation" },
  revision_requested: {
    label: "Revision requested",
    tone: "attention",
    action: "See what to change",
  },
  completed: { label: "Completed", tone: "success", action: "View evaluation" },
  work_not_accepted: {
    label: "Not accepted",
    tone: "danger",
    action: "See their feedback",
  },
  cancelled: { label: "Cancelled", tone: "neutral", action: "View workspace" },
  not_selected: { label: "Not selected", tone: "danger", action: "View brief" },
  withdrawn: { label: "Withdrawn", tone: "neutral", action: "View brief" },
};

/** A selected candidate's own work status, in the shared status language. */
export const WORK_STATUS_DISPLAY: Record<
  SelectionWorkStatus,
  { label: string; tone: StatusTone }
> = {
  in_progress: { label: "Active", tone: "active" },
  submitted: { label: "Submitted", tone: "warning" },
  under_review: { label: "Under review", tone: "warning" },
  revision_requested: { label: "Revision requested", tone: "attention" },
  completed: { label: "Accepted", tone: "success" },
  not_accepted: { label: "Not accepted", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const PENDING_STAGES: ApplicationStage[] = [
  "applied",
  "assessment_todo",
  "assessment_in_progress",
  "assessment_submitted",
  "reviewing",
  "shortlisted",
  "interview",
];
const ACTIVE_TRIAL_STAGES: ApplicationStage[] = [
  "building",
  "awaiting_review",
  "revision_requested",
];

export interface ApplicationSummary {
  /** Every application ever sent, withdrawn ones included. */
  total: number;
  /** Waiting on the startup's decision. */
  pending: number;
  /** Selected and not yet finished — the Trial Projects list. */
  activeTrials: number;
  /** Accepted by the startup — "Project completed" in My Applications. */
  completed: number;
  /** Sum of the agreed fees of completed projects. */
  completedValue: number;
}

/**
 * Dashboard counts, derived from the same list and the same stage rules as
 * My Applications and Trial Projects, so the numbers always agree and move
 * as statuses change.
 */
export function summarizeApplications(
  applications: ApplicationSummaryView[]
): ApplicationSummary {
  const summary: ApplicationSummary = {
    total: applications.length,
    pending: 0,
    activeTrials: 0,
    completed: 0,
    completedValue: 0,
  };
  for (const application of applications) {
    const stage = stageOf(application);
    if (PENDING_STAGES.includes(stage)) summary.pending += 1;
    if (ACTIVE_TRIAL_STAGES.includes(stage)) summary.activeTrials += 1;
    if (stage === "completed") {
      summary.completed += 1;
      summary.completedValue += application.project?.paymentAmount ?? 0;
    }
  }
  return summary;
}
