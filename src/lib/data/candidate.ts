import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/data/utils";
import { ACTIVITY_WEEKS, activityDay } from "@/lib/activity";
import type {
  ApplicationSummaryView,
  CandidateDashboardStats,
  CandidateEvaluationView,
  CandidateProfileView,
  CandidateProjectView,
  CandidateSkillView,
  ProfileChecklistItem,
  VerifiedTrialView,
} from "@/lib/types/domain";
import type {
  ApplicationStatus,
  AssessmentStatus,
  OpportunityType,
  ProjectOutcomeType,
  ProjectStatus,
  SelectionWorkStatus,
} from "@/lib/types/database.types";
import type { SkillLevel } from "@/lib/constants";
import { DEFAULT_CURRENCY } from "@/lib/constants";

const PROFILE_COLUMNS =
  "id, user_id, headline, bio, location, education, graduation_year, resume_url, github_url, portfolio_url, linkedin_url, banner_url, availability";

interface RawCompany {
  name: string | null;
}

interface RawApplicationProject {
  id: string;
  slug: string;
  title: string;
  status: ProjectStatus;
  company_id: string;
  payment_amount: number;
  currency: string;
  opportunity_type?: OpportunityType | null;
  companies: RawCompany | RawCompany[] | null;
  assessment_title?: string | null;
}

interface RawApplication {
  id: string;
  status: ApplicationStatus;
  decision_note: string | null;
  cover_message: string;
  created_at: string;
  projects: RawApplicationProject | RawApplicationProject[] | null;
  assessment_submissions?:
    { status: AssessmentStatus } | { status: AssessmentStatus }[] | null;
}

interface RawFeedbackProject {
  id: string;
  title: string;
  payment_amount: number;
  currency: string;
}

type RawProfileRow = {
  id: string;
  user_id: string;
  headline: string | null;
  bio: string | null;
  location: string | null;
  education: string | null;
  graduation_year: number | null;
  resume_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  linkedin_url: string | null;
  banner_url: string | null;
  availability: string;
};

function toProfileView(data: RawProfileRow): CandidateProfileView {
  return {
    id: data.id,
    userId: data.user_id,
    headline: data.headline,
    bio: data.bio,
    location: data.location,
    education: data.education,
    graduationYear: data.graduation_year,
    resumeUrl: data.resume_url,
    githubUrl: data.github_url,
    portfolioUrl: data.portfolio_url,
    linkedinUrl: data.linkedin_url,
    bannerUrl: data.banner_url,
    availability: data.availability,
  };
}

/** The signed-in candidate's profile. Cached per request (layouts and pages all ask). */
export const getCandidateProfile = cache(async function getCandidateProfile(
  userId: string
): Promise<CandidateProfileView | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("candidate_profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();

  return data ? toProfileView(data as RawProfileRow) : null;
});

/** By candidate_profiles.id — how companies reach an applicant. RLS limits it to applicants. */
export async function getCandidateProfileById(
  candidateId: string
): Promise<CandidateProfileView | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("candidate_profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", candidateId)
    .maybeSingle();

  return data ? toProfileView(data as RawProfileRow) : null;
}

/** The candidate_profiles.id for a user — shares the cached getCandidateProfile query. */
export async function getCandidateProfileId(userId: string): Promise<string | null> {
  return (await getCandidateProfile(userId))?.id ?? null;
}

export async function getCandidateSkills(
  candidateId: string
): Promise<CandidateSkillView[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("candidate_skills")
    .select("id, skill_name, skill_level, years_experience")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    skillName: row.skill_name,
    skillLevel: row.skill_level as SkillLevel,
    yearsExperience: row.years_experience,
  }));
}

export async function getCandidateProjects(
  candidateId: string
): Promise<CandidateProjectView[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("candidate_projects")
    .select("id, title, description, technologies, repository_url, live_url")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    technologies: row.technologies ?? [],
    repositoryUrl: row.repository_url,
    liveUrl: row.live_url,
  }));
}

export async function getCandidateApplications(
  candidateId: string
): Promise<ApplicationSummaryView[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select(
      "id, status, decision_note, cover_message, created_at, assessment_submissions(status), projects(id, slug, title, status, payment_amount, currency, company_id, opportunity_type, assessment_title, companies(name))"
    )
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as RawApplication[];

  // Each selected candidate has their own work cycle on the project.
  const { data: selections } = await supabase
    .from("project_selections")
    .select("project_id, status")
    .eq("candidate_id", candidateId);
  const workByProject = new Map(
    (selections ?? []).map((row) => [row.project_id, row.status as SelectionWorkStatus])
  );

  return rows.map((row) => {
    const project = one(row.projects);
    return {
      id: row.id,
      status: row.status,
      decisionNote: row.decision_note,
      workStatus: project ? (workByProject.get(project.id) ?? null) : null,
      coverMessage: row.cover_message,
      createdAt: row.created_at,
      assessmentStatus: one(row.assessment_submissions)?.status ?? null,
      project: project
        ? {
            id: project.id,
            slug: project.slug,
            title: project.title,
            status: project.status,
            paymentAmount: project.payment_amount,
            currency: project.currency || DEFAULT_CURRENCY,
            companyId: project.company_id,
            companyName: one(project.companies)?.name ?? null,
            opportunityType: project.opportunity_type ?? "build",
            hasAssessment:
              project.opportunity_type === "hire" && !!project.assessment_title?.trim(),
          }
        : null,
    };
  });
}

type RawCompletedProject = RawFeedbackProject & {
  opportunity_type: OpportunityType | null;
  companies: RawCompany | RawCompany[] | null;
  freelance_milestones:
    { amount: number; status: string; reviewed_at: string | null }[] | null;
};

interface RawCompletedSelection {
  project_id: string;
  projects: RawCompletedProject | RawCompletedProject[] | null;
}

/**
 * The candidate's verified work: every project where their work cycle is
 * complete and the startup's final decision was to accept it. Built from the
 * selection and submission records — not from written feedback, which is an
 * optional extra step a startup may never take.
 */
export async function getCandidateVerifiedTrials(
  candidateId: string
): Promise<VerifiedTrialView[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_selections")
    .select(
      "project_id, projects(id, title, payment_amount, currency, opportunity_type, companies(name), freelance_milestones(amount, status, reviewed_at))"
    )
    .eq("candidate_id", candidateId)
    .eq("status", "completed");

  const selections = (data ?? []) as unknown as RawCompletedSelection[];
  if (selections.length === 0) return [];
  const projectIds = selections.map((row) => row.project_id);

  const [{ data: decided }, { data: feedbackRows }, { data: outcomeRows }] =
    await Promise.all([
      supabase
        .from("project_submissions")
        .select("project_id, status, review_note, reviewed_at, submitted_at")
        .eq("candidate_id", candidateId)
        .in("project_id", projectIds)
        .in("status", ["accepted", "rejected"])
        .order("submitted_at", { ascending: false }),
      supabase
        .from("project_feedback")
        .select("project_id, requirements_completed, technical_quality, written_feedback")
        .eq("candidate_id", candidateId)
        .in("project_id", projectIds),
      supabase
        .from("project_outcomes")
        .select("project_id, outcome")
        .eq("candidate_id", candidateId)
        .in("project_id", projectIds),
    ]);

  // The most recent decided submission is the final word on each project.
  const finalDecision = new Map<
    string,
    { accepted: boolean; note: string | null; at: string }
  >();
  for (const row of decided ?? []) {
    if (finalDecision.has(row.project_id)) continue;
    finalDecision.set(row.project_id, {
      accepted: row.status === "accepted",
      note: row.review_note,
      at: row.reviewed_at ?? row.submitted_at,
    });
  }
  const feedbackByProject = new Map(
    (feedbackRows ?? []).map((row) => [row.project_id, row])
  );
  const outcomeByProject = new Map(
    (outcomeRows ?? []).map((row) => [row.project_id, row.outcome as ProjectOutcomeType])
  );

  return selections.flatMap((row) => {
    const decision = finalDecision.get(row.project_id);
    const feedback = feedbackByProject.get(row.project_id);
    const project = one(row.projects);

    // A freelance contract only completes with approved milestones (the
    // database checks); its evidence is that approved work and what it earned.
    if (project?.opportunity_type === "freelance") {
      const approved = (project.freelance_milestones ?? []).filter(
        (m) => m.status === "approved" || m.status === "paid"
      );
      const lastApproval = approved
        .map((m) => m.reviewed_at)
        .filter((at): at is string => at !== null)
        .sort()
        .at(-1);
      return [
        {
          id: row.project_id,
          projectId: row.project_id,
          projectTitle: project.title,
          companyName: one(project.companies)?.name ?? "Company",
          completedAt: lastApproval ?? new Date().toISOString(),
          paymentAmount: approved.reduce((sum, m) => sum + m.amount, 0),
          currency: project.currency || DEFAULT_CURRENCY,
          acceptanceNote: null,
          feedback: feedback
            ? {
                requirementsCompleted: feedback.requirements_completed,
                technicalQuality: feedback.technical_quality,
                writtenFeedback: feedback.written_feedback,
              }
            : null,
          outcome: outcomeByProject.get(row.project_id) ?? null,
        },
      ];
    }

    // Evidence means accepted work. Older projects evaluated before submission
    // decisions existed still count if the startup wrote feedback.
    if (!(decision?.accepted || (!decision && feedback))) return [];

    return [
      {
        id: row.project_id,
        projectId: row.project_id,
        projectTitle: project?.title ?? "Evaluation project",
        companyName: one(project?.companies)?.name ?? "Startup",
        completedAt: decision?.at ?? new Date().toISOString(),
        paymentAmount: project?.payment_amount ?? 0,
        currency: project?.currency || DEFAULT_CURRENCY,
        acceptanceNote: decision?.note ?? null,
        feedback: feedback
          ? {
              requirementsCompleted: feedback.requirements_completed,
              technicalQuality: feedback.technical_quality,
              writtenFeedback: feedback.written_feedback,
            }
          : null,
        outcome: outcomeByProject.get(row.project_id) ?? null,
      },
    ];
  });
}

/**
 * The startup's evaluation of one of the candidate's projects, if recorded.
 * The reviewer's private hiring recommendation is left out; the outcome is the
 * decision the startup shares.
 */
export async function getCandidateProjectEvaluation(
  candidateId: string,
  projectId: string
): Promise<CandidateEvaluationView> {
  const supabase = await createClient();
  const [{ data: feedback }, { data: outcome }] = await Promise.all([
    supabase
      .from("project_feedback")
      .select(
        "requirements_completed, technical_quality, completeness, testing_quality, documentation_quality, deadline_met, revisions_required, written_feedback, what_was_missing, created_at"
      )
      .eq("candidate_id", candidateId)
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("project_outcomes")
      .select("outcome")
      .eq("candidate_id", candidateId)
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);
  return {
    feedback: feedback
      ? {
          requirementsCompleted: feedback.requirements_completed,
          technicalQuality: feedback.technical_quality,
          completeness: feedback.completeness,
          testingQuality: feedback.testing_quality,
          documentationQuality: feedback.documentation_quality,
          deadlineMet: feedback.deadline_met,
          revisionsRequired: feedback.revisions_required,
          writtenFeedback: feedback.written_feedback,
          whatWasMissing: feedback.what_was_missing,
          recordedAt: feedback.created_at,
        }
      : null,
    outcome: (outcome?.outcome as ProjectOutcomeType | undefined) ?? null,
  };
}

/** Activity dates covering the dashboard calendar (plus a week of slack). */
export async function getCandidateActivityDates(candidateId: string): Promise<string[]> {
  const supabase = await createClient();
  const since = activityDay(new Date(Date.now() - (ACTIVITY_WEEKS + 1) * 7 * 86_400_000));
  const { data } = await supabase
    .from("candidate_activity")
    .select("activity_date")
    .eq("candidate_id", candidateId)
    .gte("activity_date", since);

  return (data ?? []).map((row) => row.activity_date);
}

/**
 * Profile strength: a baseline for the account, plus each item below. The
 * weights reflect what a startup looks at first.
 */
export function profileChecklist(
  profile: CandidateProfileView | null,
  skillsCount: number
): { strength: number; checklist: ProfileChecklistItem[] } {
  const items: (ProfileChecklistItem & { weight: number })[] = [
    {
      label: "Headline",
      done: !!profile?.headline,
      href: "/candidate/profile",
      weight: 20,
    },
    { label: "About you", done: !!profile?.bio, href: "/candidate/profile", weight: 15 },
    {
      label: "Skills",
      done: skillsCount > 0,
      href: "/candidate/profile#skills",
      weight: 20,
    },
    {
      label: "GitHub",
      done: !!profile?.githubUrl,
      href: "/candidate/profile",
      weight: 15,
    },
    {
      label: "Resume",
      done: !!profile?.resumeUrl,
      href: "/candidate/profile",
      weight: 10,
    },
  ];
  const strength =
    20 + items.reduce((total, item) => total + (item.done ? item.weight : 0), 0);
  return {
    strength,
    checklist: items.map(({ label, done, href }) => ({ label, done, href })),
  };
}

export async function getCandidateDashboardStats(
  profile: CandidateProfileView | null
): Promise<CandidateDashboardStats> {
  if (!profile) {
    const { strength, checklist } = profileChecklist(null, 0);
    return { skillsCount: 0, profileStrength: strength, checklist };
  }

  // Application and trial counts are derived from the applications list itself
  // (see summarizeApplications) so the dashboard always matches My Applications
  // and Trial Projects.
  const supabase = await createClient();
  const { count } = await supabase
    .from("candidate_skills")
    .select("*", { count: "exact", head: true })
    .eq("candidate_id", profile.id);

  const skillsCount = count ?? 0;
  const { strength, checklist } = profileChecklist(profile, skillsCount);
  return { skillsCount, profileStrength: strength, checklist };
}

/**
 * The GitHub username from a linked OAuth identity. This is the only proof of
 * account ownership we have; a GitHub URL typed into the profile is not.
 */
export function githubUsernameOf(user: Pick<User, "identities"> | null): string | null {
  const data = user?.identities?.find((item) => item.provider === "github")
    ?.identity_data as Record<string, unknown> | undefined;
  if (!data) return null;

  for (const key of ["user_name", "login", "preferred_username"]) {
    const value = data[key];
    if (typeof value === "string" && value) return value;
  }
  return null;
}

export async function getGithubIdentity(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return githubUsernameOf(user);
}

/** This candidate's application to one project, if any. */
export async function getCandidateApplicationForProject(
  candidateId: string,
  projectId: string
): Promise<{ status: ApplicationStatus; createdAt: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select("status, created_at")
    .eq("candidate_id", candidateId)
    .eq("project_id", projectId)
    .maybeSingle();
  return data
    ? { status: data.status as ApplicationStatus, createdAt: data.created_at }
    : null;
}
