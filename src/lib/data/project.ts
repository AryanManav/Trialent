import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/data/utils";
import { toAssessment, type RawAssessmentColumns } from "@/lib/data/assessment";
import {
  BROWSABLE_PROJECT_STATUSES,
  DEFAULT_CURRENCY,
  OPEN_PROJECT_STATUSES,
} from "@/lib/constants";
import { projectAvailability } from "@/lib/projects";
import {
  FREELANCE_COLUMNS,
  toFreelanceTerms,
  type RawFreelanceColumns,
} from "@/lib/freelance";
import type {
  BrowseProjectView,
  ProjectDetailView,
  ProjectSummaryView,
} from "@/lib/types/domain";
import type {
  ExperienceLevel,
  JobType,
  OpportunityType,
  WorkArrangement,
  ProjectCategory,
  ProjectPurpose,
  ProjectStatus,
  ProjectWorkMode,
} from "@/lib/types/database.types";

const SUMMARY_COLUMNS =
  "id, slug, title, description, status, expected_hours, payment_amount, currency, application_deadline, company_id, max_applicants, purpose, openings, category, opportunity_type, job_type, work_arrangement, job_location, experience_level, compensation, created_at, assessment_title, assessment_technologies, companies(name), project_skills(skill_name, is_required), " +
  FREELANCE_COLUMNS;

interface RawProjectSummary extends RawFreelanceColumns {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: ProjectStatus;
  expected_hours: number;
  payment_amount: number;
  currency: string;
  application_deadline: string;
  company_id: string;
  max_applicants: number | null;
  purpose: ProjectPurpose;
  openings: number;
  category: ProjectCategory;
  companies: { name: string | null } | { name: string | null }[] | null;
  project_skills?: { skill_name: string; is_required: boolean }[] | null;
  opportunity_type?: OpportunityType | null;
  job_type?: JobType | null;
  work_arrangement?: WorkArrangement | null;
  job_location?: string | null;
  experience_level?: ExperienceLevel | null;
  compensation?: string | null;
  created_at?: string;
  assessment_title?: string | null;
  assessment_technologies?: string[] | null;
}

function toSummary(row: RawProjectSummary): ProjectSummaryView {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    status: row.status,
    expectedHours: row.expected_hours,
    paymentAmount: row.payment_amount,
    currency: row.currency || DEFAULT_CURRENCY,
    applicationDeadline: row.application_deadline,
    companyId: row.company_id,
    companyName: one(row.companies)?.name ?? null,
    maxApplicants: row.max_applicants ?? null,
    purpose: row.purpose ?? "hire",
    openings: row.openings ?? 1,
    category: row.category ?? "other",
    // Required skills first: they're the stack the brief is built on.
    stack: [...(row.project_skills ?? [])]
      .sort((a, b) => Number(b.is_required) - Number(a.is_required))
      .map((skill) => skill.skill_name),
    opportunityType: row.opportunity_type ?? "build",
    freelance: toFreelanceTerms(row),
    jobType: row.job_type ?? null,
    workArrangement: row.work_arrangement ?? null,
    jobLocation: row.job_location ?? null,
    experienceLevel: row.experience_level ?? null,
    compensation: row.compensation ?? null,
    postedAt: row.created_at,
    assessmentTitle: row.assessment_title ?? null,
    assessmentTechnologies: row.assessment_technologies ?? [],
  };
}

/** Places taken per project (withdrawn applications don't count). */
export async function getApplicationCounts(
  projectIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (projectIds.length === 0) return counts;
  const supabase = await createClient();
  const { data } = await supabase.rpc("project_application_counts", {
    project_ids: projectIds,
  });
  for (const row of data ?? []) counts.set(row.project_id, row.applications);
  return counts;
}

/**
 * Browse: every project still before its application deadline — open ones and
 * ones where a candidate is already working — with its availability.
 */
export async function getBrowseProjects(
  companyId?: string
): Promise<BrowseProjectView[]> {
  const supabase = await createClient();
  let query = supabase
    .from("projects")
    .select(SUMMARY_COLUMNS)
    .in("status", [...BROWSABLE_PROJECT_STATUSES])
    .gt("application_deadline", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (companyId) query = query.eq("company_id", companyId);

  const { data } = await query;
  const projects = ((data ?? []) as unknown as RawProjectSummary[]).map(toSummary);
  const counts = await getApplicationCounts(projects.map((project) => project.id));

  return projects.map((project) => {
    const applicationCount = counts.get(project.id) ?? 0;
    return {
      ...project,
      applicationCount,
      availability: projectAvailability({ ...project, applicationCount }),
    };
  });
}

/** Projects a candidate can apply to right now, for recommendations. */
export async function getOpenProjects(
  limit?: number,
  companyId?: string
): Promise<BrowseProjectView[]> {
  const open = (await getBrowseProjects(companyId)).filter(
    (project) => project.availability === "open"
  );
  return limit ? open.slice(0, limit) : open;
}

interface RawProjectDetail
  extends
    RawProjectSummary,
    Omit<
      RawAssessmentColumns,
      "deliverables" | "evaluation_criteria" | "project_deadline" | "expected_hours"
    > {
  work_mode: ProjectWorkMode;
  problem_statement: string;
  context: string;
  requirements: string[];
  deliverables: string[];
  acceptance_criteria: string[];
  evaluation_criteria: string[];
  project_deadline: string;
  responsibilities?: string[] | null;
  nice_to_have?: string[] | null;
  companies: RawDetailCompany | RawDetailCompany[] | null;
  project_skills: { skill_name: string; is_required: boolean }[] | null;
}

interface RawDetailCompany {
  name: string | null;
  location: string | null;
  description: string | null;
  website: string | null;
  industry: string | null;
  company_size: string | null;
  logo_url: string | null;
  verified: boolean | null;
}

/**
 * The public brief, for any project Browse can list. `availability` says
 * whether the Apply form should show.
 */
export async function getBrowsableProjectBySlug(
  slug: string
): Promise<ProjectDetailView | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select(
      "id, slug, title, description, status, expected_hours, payment_amount, currency, application_deadline, company_id, max_applicants, purpose, openings, category, opportunity_type, job_type, work_arrangement, job_location, experience_level, compensation, responsibilities, nice_to_have, created_at, assessment_title, assessment_type, assessment_description, assessment_requirements, assessment_technologies, project_deadline, work_mode, problem_statement, context, requirements, deliverables, acceptance_criteria, evaluation_criteria, pricing_model, hourly_rate, hours_per_week, duration_weeks, companies(name, location, description, website, industry, company_size, logo_url, verified), project_skills(skill_name, is_required)"
    )
    .eq("slug", slug)
    .in("status", [...BROWSABLE_PROJECT_STATUSES])
    .maybeSingle();

  if (!data) return null;

  const row = data as unknown as RawProjectDetail;
  const company = one(row.companies);
  const summary = toSummary(row);
  const applicationCount = (await getApplicationCounts([row.id])).get(row.id) ?? 0;

  return {
    ...summary,
    applicationCount,
    availability: projectAvailability({ ...summary, applicationCount }),
    workMode: row.work_mode ?? "local",
    companyLocation: company?.location ?? null,
    company: {
      description: company?.description ?? null,
      website: company?.website ?? null,
      industry: company?.industry ?? null,
      size: company?.company_size ?? null,
      logoUrl: company?.logo_url ?? null,
      verified: company?.verified === true,
    },
    problemStatement: row.problem_statement,
    context: row.context,
    requirements: row.requirements ?? [],
    deliverables: row.deliverables ?? [],
    acceptanceCriteria: row.acceptance_criteria ?? [],
    evaluationCriteria: row.evaluation_criteria ?? [],
    projectDeadline: row.project_deadline,
    skills: (row.project_skills ?? []).map((skill) => ({
      name: skill.skill_name,
      required: skill.is_required,
    })),
    responsibilities: row.responsibilities ?? [],
    niceToHave: row.nice_to_have ?? [],
    assessment: summary.opportunityType === "hire" ? toAssessment(row) : null,
  };
}

export async function getProjectIdBySlug(slug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  return data?.id ?? null;
}

/**
 * True when the project still accepts applications: open status and before its
 * deadline. The cap is enforced by the database trigger, atomically.
 */
export async function isProjectOpen(projectId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("status, application_deadline")
    .eq("id", projectId)
    .maybeSingle();

  if (!data) return false;
  return (
    (OPEN_PROJECT_STATUSES as readonly ProjectStatus[]).includes(data.status) &&
    new Date(data.application_deadline).getTime() > Date.now()
  );
}
