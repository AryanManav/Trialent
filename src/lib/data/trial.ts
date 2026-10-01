import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/data/utils";
import {
  DEFAULT_CURRENCY,
  SUBMISSION_FILES_BUCKET,
  SUBMITTABLE_WORK_STATUSES,
} from "@/lib/constants";
import type {
  AttachmentView,
  SubmissionView,
  TrialDetailView,
  TrialView,
} from "@/lib/types/domain";
import type {
  OpportunityType,
  ProjectStatus,
  ProjectWorkMode,
  SelectionWorkStatus,
  SubmissionStatus,
} from "@/lib/types/database.types";

interface RawTrialProject {
  id: string;
  slug: string;
  title: string;
  status: ProjectStatus;
  payment_amount: number;
  currency: string;
  expected_hours: number;
  project_deadline: string;
  company_id: string;
  opportunity_type: OpportunityType | null;
  companies: { name: string | null } | { name: string | null }[] | null;
}

interface RawSelection {
  selected_at: string;
  status: SelectionWorkStatus;
  projects: RawTrialProject | RawTrialProject[] | null;
}

interface RawTrialDetailProject extends RawTrialProject {
  work_mode: ProjectWorkMode;
  problem_statement: string;
  context: string;
  requirements: string[];
  deliverables: string[];
  acceptance_criteria: string[];
  evaluation_criteria: string[];
}

interface RawSelectionDetail {
  selected_at: string;
  status: SelectionWorkStatus;
  projects: RawTrialDetailProject | RawTrialDetailProject[] | null;
}

interface RawAttachment {
  id: string;
  storage_path: string;
  file_name: string;
  size_bytes: number;
}

interface RawSubmission {
  id: string;
  repository_url: string;
  deployment_url: string | null;
  submission_notes: string;
  submitted_at: string;
  status: SubmissionStatus;
  review_note: string | null;
  reviewed_at: string | null;
  submission_attachments: RawAttachment[] | null;
}

/** Signed URLs expire, so a stale page can't be shared as a permanent link. */
const ATTACHMENT_URL_TTL_SECONDS = 60 * 15;

const TRIAL_PROJECT_COLUMNS =
  "id, slug, title, status, payment_amount, currency, expected_hours, project_deadline, company_id, opportunity_type, companies(name)";

function toTrial(
  selectedAt: string,
  workStatus: SelectionWorkStatus,
  project: RawTrialProject
): TrialView {
  return {
    projectId: project.id,
    workStatus,
    title: project.title,
    slug: project.slug,
    companyId: project.company_id,
    companyName: one(project.companies)?.name ?? null,
    status: project.status,
    paymentAmount: project.payment_amount,
    currency: project.currency || DEFAULT_CURRENCY,
    expectedHours: project.expected_hours,
    projectDeadline: project.project_deadline,
    selectedAt,
    opportunityType: project.opportunity_type ?? "build",
  };
}

function toSubmission(row: RawSubmission, urls: Map<string, string>): SubmissionView {
  const attachments: AttachmentView[] = (row.submission_attachments ?? []).map(
    (file) => ({
      id: file.id,
      fileName: file.file_name,
      sizeBytes: file.size_bytes,
      url: urls.get(file.storage_path) ?? null,
    })
  );

  return {
    id: row.id,
    repositoryUrl: row.repository_url,
    deploymentUrl: row.deployment_url,
    submissionNotes: row.submission_notes,
    submittedAt: row.submitted_at,
    status: row.status,
    reviewNote: row.review_note,
    reviewedAt: row.reviewed_at,
    attachments,
  };
}

/** Projects this candidate was selected to work on. */
export async function getCandidateTrials(candidateId: string): Promise<TrialView[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_selections")
    .select(`selected_at, status, projects(${TRIAL_PROJECT_COLUMNS})`)
    .eq("candidate_id", candidateId)
    .order("selected_at", { ascending: false });

  const rows = (data ?? []) as unknown as RawSelection[];

  return rows.flatMap((row) => {
    const project = one(row.projects);
    return project ? [toTrial(row.selected_at, row.status, project)] : [];
  });
}

export async function getCandidateTrial(
  candidateId: string,
  projectId: string
): Promise<TrialDetailView | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_selections")
    .select(
      `selected_at, status, projects(${TRIAL_PROJECT_COLUMNS}, work_mode, problem_statement, context, requirements, deliverables, acceptance_criteria, evaluation_criteria)`
    )
    .eq("candidate_id", candidateId)
    .eq("project_id", projectId)
    .maybeSingle();

  const selection = data as unknown as RawSelectionDetail | null;
  const project = one(selection?.projects);
  if (!selection || !project) return null;

  const submissions = await getSubmissions(projectId, candidateId);

  return {
    ...toTrial(selection.selected_at, selection.status, project),
    workMode: project.work_mode ?? "local",
    problemStatement: project.problem_statement,
    context: project.context,
    requirements: project.requirements ?? [],
    deliverables: project.deliverables ?? [],
    acceptanceCriteria: project.acceptance_criteria ?? [],
    evaluationCriteria: project.evaluation_criteria ?? [],
    submissions,
    // The candidate's own cycle decides (apply_project_submission enforces it).
    canSubmit:
      project.status !== "cancelled" &&
      (SUBMITTABLE_WORK_STATUSES as readonly SelectionWorkStatus[]).includes(
        selection.status
      ),
  };
}

export async function getSubmissions(
  projectId: string,
  candidateId: string
): Promise<SubmissionView[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_submissions")
    .select(
      "id, repository_url, deployment_url, submission_notes, submitted_at, status, review_note, reviewed_at, submission_attachments(id, storage_path, file_name, size_bytes)"
    )
    .eq("project_id", projectId)
    .eq("candidate_id", candidateId)
    .order("submitted_at", { ascending: false });

  const rows = (data ?? []) as unknown as RawSubmission[];
  const paths = rows.flatMap((row) =>
    (row.submission_attachments ?? []).map((file) => file.storage_path)
  );

  const urls = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage
      .from(SUBMISSION_FILES_BUCKET)
      .createSignedUrls(paths, ATTACHMENT_URL_TTL_SECONDS, { download: true });
    for (const entry of signed ?? []) {
      if (entry.path && entry.signedUrl) urls.set(entry.path, entry.signedUrl);
    }
  }

  return rows.map((row) => toSubmission(row, urls));
}
