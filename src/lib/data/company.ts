import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { toFreelanceTerms } from "@/lib/freelance";
import { one } from "@/lib/data/utils";
import {
  ASSESSMENT_COLUMNS,
  SUBMISSION_COLUMNS,
  toAssessment,
  toSubmission,
  type RawAssessmentColumns,
  type RawSubmission,
} from "@/lib/data/assessment";
import { getBrowseProjects } from "@/lib/data/project";
import {
  getCandidateProfileById,
  getCandidateProjects,
  getCandidateSkills,
  getCandidateVerifiedTrials,
} from "@/lib/data/candidate";
import { DEFAULT_CURRENCY, OPEN_PROJECT_STATUSES } from "@/lib/constants";
import type {
  ApplicantProfileView,
  ApplicantView,
  CompanyProjectResult,
  CompanyProjectView,
  CompanyPublicView,
  CompanyDirectoryEntry,
  CompanyHistoryEntry,
  HiringAssessmentView,
  CompanyTeamMember,
  CompanyView,
  PipelineEntry,
} from "@/lib/types/domain";
import type {
  ApplicationStatus,
  AssessmentStatus,
  ExperienceLevel,
  JobType,
  OpportunityType,
  WorkArrangement,
  ProjectOutcomeType,
  CompanyWorkStyle,
  ProjectCategory,
  ProjectPurpose,
  ProjectStatus,
  SelectionWorkStatus,
} from "@/lib/types/database.types";

const COMPANY_COLUMNS =
  "id, name, website, description, industry, company_size, location, logo_url, verified, tech_stack, work_style, perks, hiring_process, founded_year, linkedin_url, github_url, careers_url";

interface RawCompanyRow {
  id: string;
  name: string;
  website: string | null;
  description: string | null;
  industry: string | null;
  company_size: string | null;
  location: string | null;
  logo_url: string | null;
  verified: boolean;
  tech_stack: string[] | null;
  work_style: CompanyWorkStyle | null;
  perks: string | null;
  hiring_process: string | null;
  founded_year: number | null;
  linkedin_url: string | null;
  github_url: string | null;
  careers_url: string | null;
}

/** The culture, stack and link fields shared by the private and public views. */
function toCompanyExtras(row: RawCompanyRow) {
  return {
    techStack: row.tech_stack ?? [],
    workStyle: row.work_style,
    perks: row.perks,
    hiringProcess: row.hiring_process,
    foundedYear: row.founded_year,
    linkedinUrl: row.linkedin_url,
    githubUrl: row.github_url,
    careersUrl: row.careers_url,
  };
}

interface RawMembership {
  company_id: string;
  companies: RawCompanyRow | RawCompanyRow[] | null;
}

interface RawApplicantUser {
  full_name: string;
  email: string;
  avatar_url?: string | null;
}

interface RawApplicantProfile {
  headline: string | null;
  users: RawApplicantUser | RawApplicantUser[] | null;
  candidate_skills?: { skill_name: string }[] | null;
}

interface RawApplicant {
  id: string;
  candidate_id: string;
  status: ApplicationStatus;
  cover_message: string;
  relevant_experience: string | null;
  created_at: string;
  updated_at: string;
  candidate_profiles: RawApplicantProfile | RawApplicantProfile[] | null;
  assessment_submissions?: RawSubmission | RawSubmission[] | null;
}

/**
 * The company the user belongs to, or null if they haven't created one yet. Cached per request: the company layout, the
 * profile layout and most pages all ask, and each ask was a round trip.
 */
export const getCompanyForUser = cache(async function getCompanyForUser(
  userId: string
): Promise<CompanyView | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_members")
    .select(`company_id, companies(${COMPANY_COLUMNS})`)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  const company = one((data as unknown as RawMembership | null)?.companies);
  if (!company) return null;

  return {
    id: company.id,
    name: company.name,
    website: company.website,
    description: company.description,
    industry: company.industry,
    companySize: company.company_size,
    location: company.location,
    logoUrl: company.logo_url,
    verified: company.verified,
    ...toCompanyExtras(company),
  };
});

/** The user's company id — shares the cached getCompanyForUser query. */
export async function getCompanyIdForUser(userId: string): Promise<string | null> {
  return (await getCompanyForUser(userId))?.id ?? null;
}

/** Applications the company hasn't acted on, per project id. */
interface ApplicationTally {
  awaitingReview: number;
  active: number;
  activeBuild: number;
  hired: number;
  inRunning: number;
}

/** Per project: new, active and hired applications, counted from one read. */
async function tallyApplications(
  projectIds: string[]
): Promise<Map<string, ApplicationTally>> {
  const tallies = new Map<string, ApplicationTally>();
  if (projectIds.length === 0) return tallies;

  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select("project_id, status")
    .in("project_id", projectIds);

  for (const row of data ?? []) {
    const tally = tallies.get(row.project_id) ?? {
      awaitingReview: 0,
      active: 0,
      activeBuild: 0,
      hired: 0,
      inRunning: 0,
    };
    const status = row.status as ApplicationStatus;
    if (status === "submitted") tally.awaitingReview += 1;
    if (status !== "withdrawn") tally.active += 1;
    if (status !== "withdrawn" && status !== "rejected") tally.activeBuild += 1;
    if (status === "selected") tally.hired += 1;
    if (status !== "withdrawn" && status !== "rejected" && status !== "selected") {
      tally.inRunning += 1;
    }
    tallies.set(row.project_id, tally);
  }
  return tallies;
}

export async function getCompanyProjects(
  companyId: string
): Promise<CompanyProjectView[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select(
      "id, slug, title, description, status, expected_hours, payment_amount, currency, application_deadline, max_applicants, purpose, openings, category, opportunity_type, job_type, work_arrangement, job_location, experience_level, compensation, created_at, closed_at, pricing_model, hourly_rate, hours_per_week, duration_weeks"
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  const rows = data ?? [];
  const tallies = await tallyApplications(rows.map((row) => row.id));

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    status: row.status as ProjectStatus,
    expectedHours: row.expected_hours,
    paymentAmount: row.payment_amount,
    currency: row.currency || DEFAULT_CURRENCY,
    applicationDeadline: row.application_deadline,
    companyId,
    companyName: null,
    freelance: toFreelanceTerms(row),
    maxApplicants: row.max_applicants ?? null,
    purpose: (row.purpose ?? "hire") as ProjectPurpose,
    openings: row.openings ?? 1,
    category: (row.category ?? "other") as ProjectCategory,
    stack: [],
    opportunityType: (row.opportunity_type ?? "build") as OpportunityType,
    jobType: (row.job_type ?? null) as JobType | null,
    workArrangement: (row.work_arrangement ?? null) as WorkArrangement | null,
    jobLocation: row.job_location ?? null,
    experienceLevel: (row.experience_level ?? null) as ExperienceLevel | null,
    compensation: row.compensation ?? null,
    awaitingReview: tallies.get(row.id)?.awaitingReview ?? 0,
    activeApplications:
      row.opportunity_type === "hire"
        ? (tallies.get(row.id)?.active ?? 0)
        : (tallies.get(row.id)?.activeBuild ?? 0),
    hired: row.opportunity_type === "hire" ? (tallies.get(row.id)?.hired ?? 0) : 0,
    inRunning: tallies.get(row.id)?.inRunning ?? 0,
    createdAt: row.created_at,
    closedAt: row.closed_at ?? null,
  }));
}

interface RawSelectionResult {
  project_id: string;
  candidate_id: string;
  candidate_profiles:
    | { users: { full_name: string } | { full_name: string }[] | null }
    | { users: { full_name: string } | { full_name: string }[] | null }[]
    | null;
}

/**
 * For finished projects: every selected candidate and the outcome recorded for
 * each, keyed by project. Callers pass ids already scoped to the company.
 */
export async function getCompanyProjectResults(
  projectIds: string[]
): Promise<Map<string, CompanyProjectResult>> {
  const results = new Map<string, CompanyProjectResult>();
  if (projectIds.length === 0) return results;

  const supabase = await createClient();
  const [selections, outcomes] = await Promise.all([
    supabase
      .from("project_selections")
      .select("project_id, candidate_id, candidate_profiles(users(full_name))")
      .in("project_id", projectIds)
      .order("selected_at", { ascending: true }),
    supabase
      .from("project_outcomes")
      .select("project_id, candidate_id, outcome")
      .in("project_id", projectIds),
  ]);

  const outcomeOf = new Map(
    (outcomes.data ?? []).map((row) => [
      `${row.project_id}:${row.candidate_id}`,
      row.outcome as ProjectOutcomeType,
    ])
  );

  for (const row of (selections.data ?? []) as unknown as RawSelectionResult[]) {
    const entry = results.get(row.project_id) ?? { candidates: [] };
    entry.candidates.push({
      name: one(one(row.candidate_profiles)?.users)?.full_name ?? "Candidate",
      outcome: outcomeOf.get(`${row.project_id}:${row.candidate_id}`) ?? null,
    });
    results.set(row.project_id, entry);
  }
  return results;
}

export async function getProjectApplicants(projectId: string): Promise<ApplicantView[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select(
      `id, candidate_id, status, cover_message, relevant_experience, created_at, updated_at, candidate_profiles(headline, users(full_name, email, avatar_url), candidate_skills(skill_name)), assessment_submissions(${SUBMISSION_COLUMNS})`
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as RawApplicant[];
  const { data: selections } = await supabase
    .from("project_selections")
    .select("candidate_id, status")
    .eq("project_id", projectId);
  const workByCandidate = new Map(
    (selections ?? []).map((row) => [row.candidate_id, row.status as SelectionWorkStatus])
  );

  return rows.map((row) => {
    const candidate = one(row.candidate_profiles);
    const account = one(candidate?.users);
    return {
      id: row.id,
      candidateId: row.candidate_id,
      status: row.status,
      workStatus: workByCandidate.get(row.candidate_id) ?? null,
      coverMessage: row.cover_message,
      relevantExperience: row.relevant_experience,
      candidateName: account?.full_name ?? "Candidate",
      candidateHeadline: candidate?.headline ?? null,
      candidateEmail: account?.email ?? null,
      candidateAvatarUrl: account?.avatar_url ?? null,
      candidateSkills: (candidate?.candidate_skills ?? []).map(
        (skill) => skill.skill_name
      ),
      appliedAt: row.created_at,
      updatedAt: row.updated_at,
      assessment: toSubmission(one(row.assessment_submissions)),
    };
  });
}

interface RawPipelineApplication {
  id: string;
  project_id: string;
  candidate_id: string;
  status: ApplicationStatus;
  created_at: string;
  candidate_profiles:
    | {
        headline: string | null;
        users:
          | { full_name: string; avatar_url: string | null }
          | { full_name: string; avatar_url: string | null }[]
          | null;
      }
    | {
        headline: string | null;
        users:
          | { full_name: string; avatar_url: string | null }
          | { full_name: string; avatar_url: string | null }[]
          | null;
      }[]
    | null;
  assessment_submissions?:
    { status: AssessmentStatus } | { status: AssessmentStatus }[] | null;
}

/**
 * Every application across the company's projects, newest first, with each
 * selected candidate's work status — the Candidates page and the dashboard's
 * attention queue are both views of this.
 */
export async function getCompanyPipeline(companyId: string): Promise<PipelineEntry[]> {
  const supabase = await createClient();
  const { data: projectRows } = await supabase
    .from("projects")
    .select("id, title, project_deadline, opportunity_type, assessment_title")
    .eq("company_id", companyId);
  const projects = new Map((projectRows ?? []).map((row) => [row.id, row]));
  if (projects.size === 0) return [];
  const ids = [...projects.keys()];

  const [{ data: applicationRows }, { data: selectionRows }] = await Promise.all([
    supabase
      .from("applications")
      .select(
        "id, project_id, candidate_id, status, created_at, assessment_submissions(status), candidate_profiles(headline, users(full_name, avatar_url))"
      )
      .in("project_id", ids)
      .order("created_at", { ascending: false }),
    supabase
      .from("project_selections")
      .select("project_id, candidate_id, status")
      .in("project_id", ids),
  ]);

  const work = new Map(
    (selectionRows ?? []).map((row) => [
      `${row.project_id}:${row.candidate_id}`,
      row.status as SelectionWorkStatus,
    ])
  );

  return ((applicationRows ?? []) as unknown as RawPipelineApplication[]).flatMap(
    (row) => {
      const project = projects.get(row.project_id);
      if (!project) return [];
      const profile = one(row.candidate_profiles);
      const account = one(profile?.users);
      return [
        {
          applicationId: row.id,
          applicationStatus: row.status,
          workStatus: work.get(`${row.project_id}:${row.candidate_id}`) ?? null,
          projectId: row.project_id,
          projectTitle: project.title,
          projectDeadline: project.project_deadline,
          opportunityType: (project.opportunity_type ?? "build") as OpportunityType,
          candidateId: row.candidate_id,
          candidateName: account?.full_name ?? "Candidate",
          candidateHeadline: profile?.headline ?? null,
          candidateAvatarUrl: account?.avatar_url ?? null,
          appliedAt: row.created_at,
          assessmentStatus: one(row.assessment_submissions)?.status ?? null,
          hasAssessment:
            project.opportunity_type === "hire" && !!project.assessment_title?.trim(),
        },
      ];
    }
  );
}

/** Title + owning company for a project, used to authorize company screens. */
export async function getProjectHeader(projectId: string): Promise<{
  id: string;
  title: string;
  slug: string;
  status: ProjectStatus;
  companyId: string;
  maxApplicants: number | null;
  applicationDeadline: string;
  purpose: ProjectPurpose;
  openings: number;
  opportunityType: OpportunityType;
  createdAt: string;
  closedAt: string | null;
  /** Hire only: candidates complete an assessment before they can move forward. */
  hasAssessment: boolean;
  assessment: HiringAssessmentView | null;
} | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select(
      `id, title, slug, status, company_id, max_applicants, application_deadline, purpose, openings, opportunity_type, created_at, closed_at, ${ASSESSMENT_COLUMNS}`
    )
    .eq("id", projectId)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    status: data.status as ProjectStatus,
    companyId: data.company_id,
    maxApplicants: data.max_applicants ?? null,
    applicationDeadline: data.application_deadline,
    purpose: (data.purpose ?? "hire") as ProjectPurpose,
    openings: data.openings ?? 1,
    opportunityType: (data.opportunity_type ?? "build") as OpportunityType,
    createdAt: data.created_at,
    closedAt: data.closed_at ?? null,
    hasAssessment: data.opportunity_type === "hire" && !!data.assessment_title?.trim(),
    assessment:
      data.opportunity_type === "hire"
        ? toAssessment(data as unknown as RawAssessmentColumns)
        : null,
  };
}

export interface CompanyDashboardStats {
  totalProjects: number;
  activeProjects: number;
  applicants: number;
  inProgress: number;
  hires: number;
  awaitingReview: number;
}

/** Projects that have a candidate working but are not yet evaluated. */
const IN_FLIGHT: readonly ProjectStatus[] = [
  "candidate_selected",
  "in_progress",
  "submitted",
  "under_review",
  "revision_requested",
];

export async function getCompanyDashboardStats(
  companyId: string
): Promise<CompanyDashboardStats> {
  const supabase = await createClient();

  const { data: projectRows } = await supabase
    .from("projects")
    .select("id, status")
    .eq("company_id", companyId);

  const projects = (projectRows ?? []) as { id: string; status: ProjectStatus }[];
  const empty = {
    totalProjects: 0,
    activeProjects: 0,
    applicants: 0,
    inProgress: 0,
    hires: 0,
    awaitingReview: 0,
  };
  if (projects.length === 0) return empty;

  const ids = projects.map((project) => project.id);

  const [{ count: applicants }, { data: outcomeRows }, awaiting] = await Promise.all([
    supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .in("project_id", ids),
    supabase.from("project_outcomes").select("outcome").in("project_id", ids),
    tallyApplications(ids),
  ]);

  return {
    totalProjects: projects.length,
    activeProjects: projects.filter((project) =>
      (OPEN_PROJECT_STATUSES as readonly ProjectStatus[]).includes(project.status)
    ).length,
    applicants: applicants ?? 0,
    inProgress: projects.filter((project) => IN_FLIGHT.includes(project.status)).length,
    hires: (outcomeRows ?? []).filter((row) => row.outcome === "hire").length,
    awaitingReview: [...awaiting.values()].reduce(
      (sum, tally) => sum + tally.awaitingReview,
      0
    ),
  };
}

interface RawApplicationForReview {
  id: string;
  project_id: string;
  candidate_id: string;
  status: ApplicationStatus;
  cover_message: string;
  relevant_experience: string | null;
  created_at: string;
}

/**
 * Everything a company needs to decide on one applicant. RLS only returns the
 * application to members of the company that owns the project; the page still
 * checks ownership explicitly before rendering.
 */
export async function getApplicantProfile(
  applicationId: string
): Promise<ApplicantProfileView | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select(
      "id, project_id, candidate_id, status, cover_message, relevant_experience, created_at"
    )
    .eq("id", applicationId)
    .maybeSingle();

  const application = data as RawApplicationForReview | null;
  if (!application) return null;

  const profile = await getCandidateProfileById(application.candidate_id);
  if (!profile) return null;

  const [{ data: account }, skills, projects, verifiedTrials, { data: githubUsername }] =
    await Promise.all([
      supabase
        .from("users")
        .select("id, full_name, email, avatar_url")
        .eq("id", profile.userId)
        .maybeSingle(),
      getCandidateSkills(profile.id),
      getCandidateProjects(profile.id),
      getCandidateVerifiedTrials(profile.id),
      supabase.rpc("candidate_github_username", { target_candidate_id: profile.id }),
    ]);

  return {
    applicationId: application.id,
    projectId: application.project_id,
    status: application.status,
    coverMessage: application.cover_message,
    relevantExperience: application.relevant_experience,
    appliedAt: application.created_at,
    account: {
      id: profile.userId,
      fullName: account?.full_name ?? "Candidate",
      email: account?.email ?? "",
      avatarUrl: account?.avatar_url ?? null,
    },
    profile,
    skills,
    projects,
    verifiedTrials,
    githubUsername: githubUsername ?? null,
  };
}

interface RawHistoryPerson {
  project_id: string;
  candidate_id: string;
  at: string;
  candidate_profiles:
    | { users: { full_name: string; avatar_url: string | null } | null }
    | { users: { full_name: string; avatar_url: string | null } | null }[]
    | null;
}

/**
 * Every finished opportunity of a company, newest first: roles that filled or
 * were closed, projects that completed or were withdrawn. They leave Browse
 * but stay on record. `withPeople` adds who was hired or built each one — only
 * for the company's own screens (RLS limits those reads to its members anyway).
 */
export async function getCompanyHistory(
  companyId: string,
  { withPeople = false }: { withPeople?: boolean } = {}
): Promise<CompanyHistoryEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("company_history", {
    target_company_id: companyId,
  });
  // Before 20261006000000 runs the function is missing: no history, not an error.
  const rows = data ?? [];

  const people = new Map<string, CompanyHistoryEntry["people"]>();
  if (withPeople && rows.length > 0) {
    const hireIds = rows.filter((row) => row.opportunity_type === "hire");
    // Build projects and freelance contracts both end with one selected person.
    const buildIds = rows.filter((row) => row.opportunity_type !== "hire");
    const [{ data: hires }, { data: builders }] = await Promise.all([
      hireIds.length > 0
        ? supabase
            .from("applications")
            .select(
              "project_id, candidate_id, at:updated_at, candidate_profiles(users(full_name, avatar_url))"
            )
            .in(
              "project_id",
              hireIds.map((row) => row.project_id)
            )
            .eq("status", "selected")
        : Promise.resolve({ data: [] }),
      buildIds.length > 0
        ? supabase
            .from("project_selections")
            .select(
              "project_id, candidate_id, at:selected_at, candidate_profiles(users(full_name, avatar_url))"
            )
            .in(
              "project_id",
              buildIds.map((row) => row.project_id)
            )
            .eq("status", "completed")
        : Promise.resolve({ data: [] }),
    ]);
    for (const row of [
      ...((hires ?? []) as unknown as RawHistoryPerson[]),
      ...((builders ?? []) as unknown as RawHistoryPerson[]),
    ]) {
      const account = one(one(row.candidate_profiles)?.users);
      const list = people.get(row.project_id) ?? [];
      list.push({
        candidateId: row.candidate_id,
        name: account?.full_name ?? "Candidate",
        avatarUrl: account?.avatar_url ?? null,
        at: row.at,
      });
      people.set(row.project_id, list);
    }
  }

  return rows.map((row) => ({
    projectId: row.project_id,
    slug: row.slug,
    title: row.title,
    opportunityType: row.opportunity_type,
    status: row.status,
    openings: row.openings,
    hired: row.hired,
    accepted: row.accepted,
    applications: row.applications,
    paymentAmount: Number(row.payment_amount),
    currency: row.currency || DEFAULT_CURRENCY,
    postedAt: row.posted_at,
    closedAt: row.closed_at,
    assessmentTitle: row.assessment_title ?? null,
    people: people.get(row.project_id) ?? [],
  }));
}

/**
 * A company as candidates see it: the profile, an aggregate track record
 * (company_track_record returns counts only) and its open projects.
 */
export async function getCompanyPublicProfile(
  companyId: string
): Promise<CompanyPublicView | null> {
  const supabase = await createClient();
  const [{ data: company }, { data: record }, openProjects, history] = await Promise.all([
    supabase
      .from("companies")
      .select(`${COMPANY_COLUMNS}, created_at`)
      .eq("id", companyId)
      .maybeSingle(),
    supabase.rpc("company_track_record", { target_company_id: companyId }),
    getBrowseProjects(companyId),
    getCompanyHistory(companyId),
  ]);
  if (!company) return null;

  // Before the migration runs the function is missing; show zeros, not an error.
  const counts = record?.[0];
  return {
    id: company.id,
    name: company.name,
    description: company.description,
    website: company.website,
    industry: company.industry,
    size: company.company_size,
    location: company.location,
    logoUrl: company.logo_url,
    verified: company.verified,
    memberSince: company.created_at,
    ...toCompanyExtras(company as unknown as RawCompanyRow),
    trackRecord: {
      openProjects: counts?.open_projects ?? 0,
      completedEvaluations: counts?.completed_evaluations ?? 0,
      hires: counts?.hires ?? 0,
      interviews: counts?.interviews ?? 0,
      cancelledProjects: counts?.cancelled_projects ?? 0,
      projectsPosted: counts?.projects_posted ?? null,
    },
    // What a candidate could act on: open, or full but still listed. Roles
    // that filled and projects already being built are history or in progress.
    openProjects: openProjects.filter(
      (project) => project.availability === "open" || project.availability === "full"
    ),
    history,
  };
}

interface RawTeamMember {
  user_id: string;
  role: string;
  created_at: string;
  users:
    | { full_name: string; email: string; avatar_url: string | null }
    | { full_name: string; email: string; avatar_url: string | null }[]
    | null;
}

/** Everyone on the company's account, owners first. */
export async function getCompanyTeam(companyId: string): Promise<CompanyTeamMember[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_members")
    .select("user_id, role, created_at, users(full_name, email, avatar_url)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  return ((data ?? []) as unknown as RawTeamMember[])
    .map((row) => {
      const account = one(row.users);
      return {
        userId: row.user_id,
        fullName: account?.full_name ?? "Team member",
        email: account?.email ?? null,
        avatarUrl: account?.avatar_url ?? null,
        role: row.role,
        joinedAt: row.created_at,
      };
    })
    .sort((a, b) => Number(b.role === "owner") - Number(a.role === "owner"));
}

interface RawDirectoryCompany {
  id: string;
  name: string;
  industry: string | null;
  location: string | null;
  company_size: string | null;
  logo_url: string | null;
  verified: boolean;
  work_style: CompanyWorkStyle | null;
  projects: { status: ProjectStatus; application_deadline: string }[] | null;
}

/**
 * Every company on Trialent for the candidate-facing directory, busiest first.
 * `openProjects` counts projects still taking applications.
 */
export async function getCompanyDirectory(): Promise<CompanyDirectoryEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select(
      "id, name, industry, location, company_size, logo_url, verified, work_style, projects(status, application_deadline)"
    )
    .order("name", { ascending: true });

  const now = Date.now();
  return ((data ?? []) as unknown as RawDirectoryCompany[])
    .map((row) => ({
      id: row.id,
      name: row.name,
      industry: row.industry,
      location: row.location,
      size: row.company_size,
      logoUrl: row.logo_url,
      verified: row.verified,
      workStyle: row.work_style,
      openProjects: (row.projects ?? []).filter(
        (project) =>
          (OPEN_PROJECT_STATUSES as readonly ProjectStatus[]).includes(project.status) &&
          new Date(project.application_deadline).getTime() > now
      ).length,
    }))
    .sort((a, b) => b.openProjects - a.openProjects);
}
