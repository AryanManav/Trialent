import type {
  ApplicationStatus,
  AssessmentStatus,
  OpportunityType,
  ProjectOutcomeType,
  ProjectStatus,
  SelectionWorkStatus,
} from "@/lib/types/database.types";
import type { StatusTone } from "@/lib/status";
import { COMPANY_SETUP_MIN_DESCRIPTION } from "@/lib/constants";
import type { CompanyView } from "@/lib/types/domain";

/**
 * What candidates look at before applying, in the order they notice it. Each
 * missing item is one less reason to trust a paid project from an unknown
 * startup.
 */
const PROFILE_FIELDS: { key: keyof CompanyView; label: string }[] = [
  { key: "name", label: "Company name" },
  { key: "logoUrl", label: "Logo" },
  { key: "description", label: "What you build" },
  { key: "website", label: "Website" },
  { key: "industry", label: "Industry" },
  { key: "companySize", label: "Team size" },
  { key: "location", label: "Location" },
];

export function companyProfileCompleteness(company: CompanyView | null): {
  percent: number;
  missing: string[];
} {
  const missing = PROFILE_FIELDS.filter(({ key }) => {
    const value = company?.[key];
    return typeof value !== "string" || value.trim() === "";
  }).map(({ label }) => label);
  const done = PROFILE_FIELDS.length - missing.length;
  return { percent: Math.round((done / PROFILE_FIELDS.length) * 100), missing };
}

/** A company-facing label for each project status, plus whether it needs them. */
export const COMPANY_PROJECT_STATUS: Record<
  ProjectStatus,
  { label: string; tone: StatusTone }
> = {
  draft: { label: "Private", tone: "neutral" },
  pending_review: { label: "Pending review", tone: "neutral" },
  published: { label: "Open", tone: "success" },
  applications_open: { label: "Open", tone: "success" },
  candidate_selected: { label: "Candidate selected", tone: "active" },
  in_progress: { label: "In progress", tone: "active" },
  submitted: { label: "Work submitted", tone: "attention" },
  under_review: { label: "Under review", tone: "warning" },
  revision_requested: { label: "Revision requested", tone: "warning" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export const OUTCOME_LABEL: Record<ProjectOutcomeType, string> = {
  hire: "Hired",
  interview: "Moved to interview",
  talent_pool: "Added to talent pool",
  no_hire: "Not hired",
  candidate_withdrew: "Candidate withdrew",
  project_cancelled: "Project cancelled",
};

/**
 * True once a company has the basics candidates need — the same rule the
 * database enforces before it accepts a project (company_ready_to_post).
 */
export function isCompanyReadyToPost(
  company: Pick<
    CompanyView,
    "name" | "description" | "industry" | "companySize" | "location"
  > | null
): boolean {
  if (!company) return false;
  const filled = (value: string | null) => (value ?? "").trim().length > 0;
  return (
    company.name.trim().length >= 2 &&
    (company.description ?? "").trim().length >= COMPANY_SETUP_MIN_DESCRIPTION &&
    filled(company.industry) &&
    filled(company.companySize) &&
    filled(company.location)
  );
}

/**
 * Where one application stands in a company's hiring pipeline. Once a
 * candidate is selected, their own work status decides.
 */
export type PipelineStage =
  | "assessment"
  | "new"
  | "reviewing"
  | "shortlisted"
  | "interview"
  | "hired"
  | "building"
  | "to_evaluate"
  | "accepted"
  | "not_accepted"
  | "rejected"
  | "withdrawn"
  | "cancelled";

export function pipelineStage(
  applicationStatus: ApplicationStatus,
  workStatus: SelectionWorkStatus | null,
  opportunityType: OpportunityType = "build",
  /** Hire only: nothing is new to the company until the assessment is in. */
  assessment: AssessmentProgress = null
): PipelineStage {
  if (
    opportunityType === "hire" &&
    applicationStatus === "submitted" &&
    assessment !== null &&
    assessment !== "submitted"
  ) {
    return "assessment";
  }
  if (applicationStatus === "withdrawn") return "withdrawn";
  if (applicationStatus === "rejected") return "rejected";
  if (applicationStatus === "shortlisted") return "shortlisted";
  if (applicationStatus === "interview") return "interview";
  if (applicationStatus !== "selected") {
    return applicationStatus === "submitted" ? "new" : "reviewing";
  }
  // Hire only: selection is the hire — there's no work to follow.
  if (opportunityType === "hire") return "hired";
  switch (workStatus) {
    case "submitted":
    case "under_review":
      return "to_evaluate";
    case "completed":
      return "accepted";
    case "not_accepted":
      return "not_accepted";
    case "cancelled":
      return "cancelled";
    default:
      return "building";
  }
}

export const PIPELINE_DISPLAY: Record<
  PipelineStage,
  { label: string; tone: StatusTone; action: string }
> = {
  assessment: { label: "In assessment", tone: "neutral", action: "View application" },
  new: { label: "New application", tone: "attention", action: "Review application" },
  reviewing: { label: "Reviewing", tone: "warning", action: "Decide" },
  shortlisted: { label: "Shortlisted", tone: "active", action: "Review candidate" },
  interview: { label: "Interview", tone: "warning", action: "Decide" },
  hired: { label: "Hired", tone: "success", action: "View application" },
  building: { label: "Building", tone: "active", action: "Open evaluation" },
  to_evaluate: { label: "Work submitted", tone: "attention", action: "Evaluate work" },
  accepted: { label: "Accepted", tone: "success", action: "View evaluation" },
  not_accepted: { label: "Not accepted", tone: "danger", action: "View evaluation" },
  rejected: { label: "Not selected", tone: "neutral", action: "View application" },
  withdrawn: { label: "Withdrawn", tone: "neutral", action: "View application" },
  cancelled: { label: "Cancelled", tone: "neutral", action: "View evaluation" },
};

/** The pipeline views on the Candidates page, and the stages each holds. */
export const PIPELINE_VIEWS = {
  all: { label: "All", stages: null },
  review: {
    label: "To review",
    stages: ["assessment", "new", "reviewing", "shortlisted", "interview"],
  },
  evaluation: { label: "In evaluation", stages: ["building", "to_evaluate"] },
  decided: {
    label: "Decided",
    stages: ["hired", "accepted", "not_accepted", "rejected", "withdrawn", "cancelled"],
  },
} as const satisfies Record<string, { label: string; stages: PipelineStage[] | null }>;

export type PipelineView = keyof typeof PIPELINE_VIEWS;

/** Where an entry opens: the application before selection, the evaluation after. */
export function pipelineHref(entry: {
  projectId: string;
  applicationId: string;
  candidateId: string;
  applicationStatus: ApplicationStatus;
  opportunityType?: OpportunityType;
}): string {
  return entry.applicationStatus === "selected" && entry.opportunityType !== "hire"
    ? `/company/projects/${entry.projectId}/review/${entry.candidateId}`
    : `/company/projects/${entry.projectId}/applicants/${entry.applicationId}`;
}

/**
 * Where a candidate stands in a hire-only role, from their application and
 * their assessment together:
 *   Applied → Assessment in progress → Assessment submitted → Under review
 *   → Shortlisted → Interview → Selected (or Not selected / Withdrawn)
 * `assessment` is the submission's status, "not_started" when the role has an
 * assessment the candidate hasn't opened, and null when it has none.
 */
export type HireStage =
  | "applied"
  | "assessment_in_progress"
  | "assessment_submitted"
  | "under_review"
  | "shortlisted"
  | "interview"
  | "selected"
  | "not_selected"
  | "withdrawn";

export type AssessmentProgress = AssessmentStatus | "not_started" | null;

/** A pipeline entry's assessment progress, for pipelineStage and hireStage. */
export function entryAssessment(entry: {
  hasAssessment?: boolean;
  assessmentStatus?: AssessmentStatus | null;
}): AssessmentProgress {
  return entry.hasAssessment ? (entry.assessmentStatus ?? "not_started") : null;
}

export function hireStage(
  status: ApplicationStatus,
  assessment: AssessmentProgress
): HireStage {
  switch (status) {
    case "withdrawn":
      return "withdrawn";
    case "rejected":
      return "not_selected";
    case "selected":
      return "selected";
    case "interview":
      return "interview";
    case "shortlisted":
      return "shortlisted";
    case "reviewing":
      return "under_review";
    case "submitted":
      if (assessment === "submitted") return "assessment_submitted";
      if (assessment === "in_progress") return "assessment_in_progress";
      return "applied";
  }
}

/** A hire-only application as the company sees it in the hiring pipeline. */
export const HIRE_STAGE_DISPLAY: Record<HireStage, { label: string; tone: StatusTone }> =
  {
    applied: { label: "Applied", tone: "info" },
    assessment_in_progress: { label: "Assessment in progress", tone: "neutral" },
    assessment_submitted: { label: "Assessment submitted", tone: "attention" },
    under_review: { label: "Under review", tone: "warning" },
    shortlisted: { label: "Shortlisted", tone: "active" },
    interview: { label: "Interview", tone: "warning" },
    selected: { label: "Selected", tone: "success" },
    not_selected: { label: "Not selected", tone: "danger" },
    withdrawn: { label: "Withdrawn", tone: "neutral" },
  };

/** The hiring pipeline's tabs, and the stages each shows. */
export const HIRE_TABS = {
  all: { label: "All", stages: null },
  assessment: { label: "In assessment", stages: ["applied", "assessment_in_progress"] },
  submitted: { label: "Submitted", stages: ["assessment_submitted"] },
  review: { label: "Under review", stages: ["under_review"] },
  shortlisted: { label: "Shortlisted", stages: ["shortlisted"] },
  interview: { label: "Interview", stages: ["interview"] },
  selected: { label: "Selected", stages: ["selected"] },
  rejected: { label: "Not selected", stages: ["not_selected"] },
} as const satisfies Record<string, { label: string; stages: HireStage[] | null }>;

export type HireTab = keyof typeof HIRE_TABS;

export function inHireTab(tab: HireTab, stage: HireStage): boolean {
  const stages: readonly HireStage[] | null = HIRE_TABS[tab].stages;
  return stages === null || stages.includes(stage);
}

/**
 * Where a hire-only posting stands. Derived from database facts — the project
 * status, its deadline, active applications and hires — so it can't drift:
 * the database already refuses applications at the limit, frees a slot when
 * someone withdraws, and completes the posting when the last opening fills.
 *
 * - private:          hidden from Browse
 * - open:             taking applications, nobody hired yet
 * - applications_full: at the limit — visible, Apply disabled; a withdrawal reopens it
 * - partially_filled: some openings filled, still hiring
 * - hiring:           applications closed (deadline passed), candidates in review
 * - stalled:          applications closed and nobody left in the running —
 *                     nothing more can happen until the company closes it
 * - completed:        every opening filled — out of Browse, into history
 * - closed:           closed by the company before filling every opening
 */
export type HiringState =
  | "private"
  | "open"
  | "applications_full"
  | "partially_filled"
  | "hiring"
  | "stalled"
  | "completed"
  | "closed";

export function hiringState(
  posting: {
    status: ProjectStatus;
    applicationDeadline: string;
    maxApplicants: number | null;
    openings: number;
    /** Applications that aren't withdrawn — the ones holding a slot. */
    activeApplications: number;
    hired: number;
    /**
     * Applications still in the running (not rejected, withdrawn or hired).
     * When known and zero after the deadline, the posting has stalled.
     */
    inRunning?: number;
  },
  now: Date = new Date()
): HiringState {
  if (posting.status === "cancelled") return "closed";
  if (posting.status === "completed" || posting.hired >= posting.openings) {
    return "completed";
  }
  if (posting.status === "draft" || posting.status === "pending_review") return "private";

  const beforeDeadline = new Date(posting.applicationDeadline).getTime() > now.getTime();
  if (!beforeDeadline) {
    if (posting.inRunning === 0) return "stalled";
    return posting.hired > 0 ? "partially_filled" : "hiring";
  }
  if (
    posting.maxApplicants !== null &&
    posting.activeApplications >= posting.maxApplicants
  ) {
    return "applications_full";
  }
  return posting.hired > 0 ? "partially_filled" : "open";
}

export const HIRING_STATE_DISPLAY: Record<
  HiringState,
  { label: string; tone: StatusTone }
> = {
  private: { label: "Private", tone: "neutral" },
  open: { label: "Open", tone: "success" },
  applications_full: { label: "Applications full", tone: "warning" },
  partially_filled: { label: "Partially filled", tone: "active" },
  hiring: { label: "Hiring", tone: "active" },
  stalled: { label: "Needs closing", tone: "attention" },
  completed: { label: "Hiring complete", tone: "success" },
  closed: { label: "Closed", tone: "neutral" },
};

/** Still on the company's desk: not completed, not closed. */
/** Still being worked on. A stalled role isn't: it only needs closing. */
export function isActiveHiring(state: HiringState): boolean {
  return state !== "completed" && state !== "closed" && state !== "stalled";
}
