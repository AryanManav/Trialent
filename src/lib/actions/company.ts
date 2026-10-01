"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import {
  getCompanyForUser,
  getCompanyIdForUser,
  getProjectHeader,
} from "@/lib/data/company";
import { isCompanyReadyToPost } from "@/lib/company";
import {
  companyCultureSchema,
  companyLinksSchema,
  companyProfileSchema,
  companySetupSchema,
  createHiringSchema,
  createProjectSchema,
  deleteProjectSchema,
  projectVisibilitySchema,
  updateApplicationStatusSchema,
  withdrawProjectSchema,
} from "@/lib/validations";
import { DEFAULT_CURRENCY, PROFILE_MEDIA_BUCKET } from "@/lib/constants";
import { parseIndiaDateTime } from "@/lib/utils";
import type { ActionResponse } from "@/lib/types/actions";

/** Company forms post without JS, so errors surface via the query string. */
function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function toList(value: FormDataEntryValue | null): string[] {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base}-${Date.now().toString(36)}`;
}

export async function saveCompanyProfileAction(formData: FormData) {
  const user = await requireRole(["company", "admin"]);

  const validated = companyProfileSchema.safeParse({
    name: formData.get("name"),
    website: formData.get("website"),
    description: formData.get("description"),
    industry: formData.get("industry"),
    companySize: formData.get("companySize"),
    location: formData.get("location"),
  });
  if (!validated.success) {
    redirectWithError("/company/profile", validated.error.errors[0].message);
  }

  const payload = {
    name: validated.data.name,
    website: validated.data.website || null,
    description: validated.data.description || null,
    industry: validated.data.industry || null,
    company_size: validated.data.companySize || null,
    location: validated.data.location || null,
  };

  const supabase = await createClient();
  const existingCompanyId = await getCompanyIdForUser(user.id);

  if (existingCompanyId) {
    const { error } = await supabase
      .from("companies")
      .update(payload)
      .eq("id", existingCompanyId);
    if (error) redirectWithError("/company/profile", error.message);
  } else {
    // Creating the company and its first owner row must be atomic, and RLS
    // cannot express the first-member case; see create_company_with_owner.
    const { error } = await supabase.rpc("create_company_with_owner", {
      company_name: payload.name,
      company_website: payload.website,
      company_description: payload.description,
      company_industry: payload.industry,
      company_size: payload.company_size,
      company_location: payload.location,
    });
    if (error) {
      redirectWithError("/company/profile", error.message || "Could not create company");
    }
  }

  revalidatePath("/company/profile");
  redirect("/company/profile?saved=1");
}

export async function createProjectAction(formData: FormData) {
  const user = await requireRole(["company", "admin"]);
  const createPath = "/company/projects/create";

  const applicationDeadline = parseIndiaDateTime(
    String(formData.get("applicationDeadline") || "")
  );
  const projectDeadline = parseIndiaDateTime(
    String(formData.get("projectDeadline") || "")
  );

  if (!applicationDeadline || !projectDeadline) {
    redirectWithError(
      createPath,
      "Please provide valid application and project deadlines"
    );
  }

  const validated = createProjectSchema.safeParse({
    title: formData.get("title"),
    workMode: formData.get("workMode") || "local",
    description: formData.get("description"),
    problemStatement: formData.get("problemStatement"),
    context: formData.get("context"),
    requirements: toList(formData.get("requirements")),
    deliverables: toList(formData.get("deliverables")),
    acceptanceCriteria: toList(formData.get("acceptanceCriteria")),
    evaluationCriteria: toList(formData.get("evaluationCriteria")),
    expectedHours: formData.get("expectedHours"),
    paymentAmount: formData.get("paymentAmount"),
    currency: DEFAULT_CURRENCY,
    maxApplicants: formData.get("maxApplicants"),
    category: formData.get("category"),
    // Build only: one candidate completes the project (the database enforces it too).
    purpose: "build",
    openings: 1,
    applicationDeadline: applicationDeadline.toISOString(),
    projectDeadline: projectDeadline.toISOString(),
  });
  if (!validated.success) {
    redirectWithError(createPath, validated.error.errors[0].message);
  }

  if (user.role !== "admin" && !isCompanyReadyToPost(await getCompanyForUser(user.id))) {
    redirect("/onboarding/company");
  }

  const companyId = await getCompanyIdForUser(user.id);
  if (!companyId) {
    redirectWithError(
      "/company/profile",
      "Create your company profile before posting a project"
    );
  }

  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      company_id: companyId,
      slug: toSlug(validated.data.title),
      title: validated.data.title,
      description: validated.data.description,
      problem_statement: validated.data.problemStatement,
      context: validated.data.context,
      requirements: validated.data.requirements,
      deliverables: validated.data.deliverables,
      acceptance_criteria: validated.data.acceptanceCriteria,
      evaluation_criteria: validated.data.evaluationCriteria,
      work_mode: validated.data.workMode,
      expected_hours: validated.data.expectedHours,
      payment_amount: validated.data.paymentAmount,
      currency: validated.data.currency,
      application_deadline: validated.data.applicationDeadline,
      project_deadline: validated.data.projectDeadline,
      max_applicants: validated.data.maxApplicants ?? null,
      category: validated.data.category,
      purpose: "build",
      openings: 1,
      opportunity_type: "build",
      status: "applications_open",
    })
    .select("id")
    .single();

  if (error || !project) {
    redirectWithError(createPath, error?.message || "Could not create project");
  }

  const skills = toList(formData.get("skills"));
  if (skills.length) {
    await supabase.from("project_skills").insert(
      skills.map((skill) => ({
        project_id: project.id,
        skill_name: skill,
        is_required: true,
      }))
    );
  }

  revalidatePath("/company/projects");
  revalidatePath("/projects");
  redirect("/company/projects?created=1");
}

/**
 * Posts a hire-only opportunity: a role, free to post. There's no project,
 * fee or trial — the database's normalize_opportunity clears those fields and
 * the application triggers enforce the openings and application limits.
 */
export async function createHiringAction(formData: FormData) {
  const user = await requireRole(["company", "admin"]);
  const createPath = "/company/projects/create?type=hire";

  const deadline = parseIndiaDateTime(String(formData.get("applicationDeadline") || ""));
  if (!deadline) {
    redirectWithError(createPath, "Please provide a valid application deadline");
  }
  const assessmentDeadline = parseIndiaDateTime(
    String(formData.get("assessmentDeadline") || "")
  );
  if (!assessmentDeadline) {
    redirectWithError(createPath, "Please provide a valid assessment deadline");
  }

  const validated = createHiringSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    jobType: formData.get("jobType"),
    workArrangement: formData.get("workArrangement"),
    jobLocation: formData.get("jobLocation") || undefined,
    experienceLevel: formData.get("experienceLevel"),
    description: formData.get("description"),
    aboutRole: formData.get("aboutRole"),
    responsibilities: toList(formData.get("responsibilities")),
    requirements: toList(formData.get("requirements")),
    niceToHave: toList(formData.get("niceToHave")),
    compensation: formData.get("compensation") || undefined,
    openings: formData.get("openings"),
    maxApplicants: formData.get("maxApplicants"),
    applicationDeadline: deadline.toISOString(),
    assessmentTitle: formData.get("assessmentTitle"),
    assessmentType: formData.get("assessmentType"),
    assessmentDescription: formData.get("assessmentDescription"),
    assessmentRequirements: toList(formData.get("assessmentRequirements")),
    deliverables: toList(formData.get("deliverables")),
    assessmentTechnologies: toList(formData.get("assessmentTechnologies")),
    evaluationCriteria: toList(formData.get("evaluationCriteria")),
    expectedHours: formData.get("expectedHours"),
    assessmentDeadline: assessmentDeadline.toISOString(),
  });
  if (!validated.success) {
    redirectWithError(createPath, validated.error.errors[0].message);
  }

  if (user.role !== "admin" && !isCompanyReadyToPost(await getCompanyForUser(user.id))) {
    redirect("/onboarding/company");
  }
  const companyId = await getCompanyIdForUser(user.id);
  if (!companyId) {
    redirectWithError("/company/profile", "Create your company profile before posting");
  }

  const role = validated.data;
  const supabase = await createClient();
  const { data: posting, error } = await supabase
    .from("projects")
    .insert({
      company_id: companyId,
      opportunity_type: "hire",
      purpose: "hire",
      slug: toSlug(role.title),
      title: role.title,
      category: role.category,
      description: role.description,
      problem_statement: role.aboutRole,
      context: "",
      requirements: role.requirements,
      responsibilities: role.responsibilities,
      nice_to_have: role.niceToHave,
      job_type: role.jobType,
      work_arrangement: role.workArrangement,
      job_location: role.jobLocation ?? null,
      experience_level: role.experienceLevel,
      compensation: role.compensation ?? null,
      openings: role.openings,
      max_applicants: role.maxApplicants,
      payment_amount: 0,
      currency: DEFAULT_CURRENCY,
      application_deadline: role.applicationDeadline,
      // The hiring assessment. Unpaid: it is part of the hiring process.
      assessment_title: role.assessmentTitle,
      assessment_type: role.assessmentType,
      assessment_description: role.assessmentDescription,
      assessment_requirements: role.assessmentRequirements,
      assessment_technologies: role.assessmentTechnologies,
      deliverables: role.deliverables,
      evaluation_criteria: role.evaluationCriteria,
      expected_hours: role.expectedHours,
      project_deadline: role.assessmentDeadline,
      status: "applications_open",
    })
    .select("id")
    .single();

  if (error || !posting) {
    redirectWithError(createPath, error?.message || "Could not post the role");
  }

  const skills = toList(formData.get("skills"));
  if (skills.length) {
    await supabase.from("project_skills").insert(
      skills.map((skill) => ({
        project_id: posting.id,
        skill_name: skill,
        is_required: true,
      }))
    );
  }

  revalidatePath("/company/projects");
  revalidatePath("/projects");
  redirect("/company/projects?created=hire");
}

export async function updateApplicationStatusAction(formData: FormData) {
  const user = await requireRole(["company", "admin"]);

  const validated = updateApplicationStatusSchema.safeParse({
    applicationId: formData.get("applicationId"),
    status: formData.get("status"),
    decisionNote: formData.get("decisionNote"),
  });
  if (!validated.success) {
    redirectWithError("/company/projects", validated.error.errors[0].message);
  }

  const supabase = await createClient();
  const { data: application } = await supabase
    .from("applications")
    .select("project_id, candidate_id")
    .eq("id", validated.data.applicationId)
    .maybeSingle();

  if (!application) {
    redirectWithError("/company/projects", "Application not found");
  }

  const projectPath = `/company/projects/${application.project_id}`;
  const header = await getProjectHeader(application.project_id);
  if (!header) redirectWithError("/company/projects", "Project not found");

  if (user.role !== "admin") {
    const companyId = await getCompanyIdForUser(user.id);
    if (companyId !== header.companyId) {
      redirectWithError("/company/projects", "You cannot review this application");
    }
  }

  // The applicant page posts here too and should come back to itself. Only a
  // path inside this project's applicant pages is honoured — never an arbitrary URL.
  const requested = String(formData.get("returnTo") || "").split("?")[0];
  const destination = requested.startsWith(`${projectPath}/applicants/`)
    ? requested
    : projectPath;

  // apply_application_decision (database) makes Selected and Rejected final,
  // allows one selection per project, and creates that selection atomically.
  const { error } = await supabase
    .from("applications")
    .update({
      status: validated.data.status,
      // A message only belongs with a final decision.
      ...(validated.data.status === "selected" || validated.data.status === "rejected"
        ? { decision_note: validated.data.decisionNote ?? null }
        : {}),
    })
    .eq("id", validated.data.applicationId);

  if (error) {
    redirectWithError(
      destination,
      error.code === "P0001" ? error.message : "Couldn't update the application."
    );
  }

  revalidatePath(projectPath);
  revalidatePath(destination);
  // Keep the hiring pipeline on the tab it was acted from (known tabs only).
  const stage = String(formData.get("stage") || "");
  const keepStage = /^[a-z]{3,12}$/.test(stage) ? `&stage=${stage}` : "";
  redirect(
    `${destination}?updated=${encodeURIComponent(validated.data.status)}${keepStage}`
  );
}

/**
 * Records the logo the browser just uploaded to `profile-media/<uid>/logo`.
 * Storage policies confine the upload to the member's own folder; this checks
 * it landed, then points the company at it.
 */
export async function saveCompanyLogoAction(): Promise<ActionResponse> {
  const user = await requireRole(["company", "admin"]);
  const companyId = await getCompanyIdForUser(user.id);
  if (!companyId) return { error: "Save your company profile before adding a logo." };

  const supabase = await createClient();
  const bucket = supabase.storage.from(PROFILE_MEDIA_BUCKET);
  const { data: files } = await bucket.list(user.id, { search: "logo" });
  if (!files?.some((file) => file.name === "logo")) {
    return { error: "Upload didn't finish. Please try again." };
  }

  // Same path on every upload, so the version stamp is what busts caches.
  const url = `${bucket.getPublicUrl(`${user.id}/logo`).data.publicUrl}?v=${Date.now()}`;
  const { error } = await supabase
    .from("companies")
    .update({ logo_url: url })
    .eq("id", companyId);
  if (error) return { error: error.message };

  revalidatePath("/company/profile");
  return { success: true };
}

export async function removeCompanyLogoAction(): Promise<ActionResponse> {
  const user = await requireRole(["company", "admin"]);
  const companyId = await getCompanyIdForUser(user.id);
  if (!companyId) return { error: "No company profile yet." };

  const supabase = await createClient();
  await supabase.storage.from(PROFILE_MEDIA_BUCKET).remove([`${user.id}/logo`]);
  const { error } = await supabase
    .from("companies")
    .update({ logo_url: null })
    .eq("id", companyId);
  if (error) return { error: error.message };

  revalidatePath("/company/profile");
  return { success: true };
}

/** Loads a project and confirms the caller's company owns it, or redirects. */
async function requireOwnedProject(projectId: string) {
  const user = await requireRole(["company", "admin"]);
  const header = await getProjectHeader(projectId);
  if (!header) redirectWithError("/company/projects", "Project not found");
  if (user.role !== "admin") {
    const companyId = await getCompanyIdForUser(user.id);
    if (companyId !== header.companyId) {
      redirectWithError("/company/projects", "You can't change this project");
    }
  }
  return header;
}

/**
 * Private hides the project from Browse and pauses applications; public brings
 * it back. Only before a candidate is selected (guard_project_status).
 */
export async function setProjectVisibilityAction(formData: FormData) {
  const parsed = projectVisibilitySchema.safeParse({
    projectId: formData.get("projectId"),
    visibility: formData.get("visibility"),
  });
  if (!parsed.success)
    redirectWithError("/company/projects", parsed.error.errors[0].message);

  const project = await requireOwnedProject(parsed.data.projectId);
  const path = `/company/projects/${project.id}`;

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({
      status: parsed.data.visibility === "private" ? "draft" : "applications_open",
    })
    .eq("id", project.id);
  if (error) {
    redirectWithError(
      path,
      error.code === "P0001" ? error.message : "Couldn't update the project."
    );
  }

  revalidatePath(path);
  revalidatePath("/projects");
  redirect(`${path}?updated=${parsed.data.visibility}`);
}

/** Closes the project for good and tells every applicant why. */
export async function withdrawProjectAction(formData: FormData) {
  const parsed = withdrawProjectSchema.safeParse({
    projectId: formData.get("projectId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success)
    redirectWithError("/company/projects", parsed.error.errors[0].message);

  const project = await requireOwnedProject(parsed.data.projectId);
  const path = `/company/projects/${project.id}`;

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ status: "cancelled", withdrawal_reason: parsed.data.reason ?? null })
    .eq("id", project.id);
  if (error) {
    redirectWithError(
      path,
      error.code === "P0001" ? error.message : "Couldn't withdraw the project."
    );
  }

  revalidatePath(path);
  revalidatePath("/company/projects");
  revalidatePath("/projects");
  redirect(`${path}?updated=withdrawn`);
}

/** Removes a project nobody has applied to (delete_project enforces that). */
export async function deleteProjectAction(formData: FormData) {
  const parsed = deleteProjectSchema.safeParse({ projectId: formData.get("projectId") });
  if (!parsed.success)
    redirectWithError("/company/projects", parsed.error.errors[0].message);

  const project = await requireOwnedProject(parsed.data.projectId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_project", {
    target_project_id: project.id,
  });
  if (error) {
    redirectWithError(
      `/company/projects/${project.id}`,
      error.code === "P0001" ? error.message : "Couldn't delete the project."
    );
  }

  revalidatePath("/company/projects");
  revalidatePath("/projects");
  redirect("/company/projects?deleted=1");
}

/**
 * First-run setup for a new startup. Creates the company (or finishes an
 * existing one) with the basics candidates need, then opens the workspace.
 */
export async function completeCompanySetupAction(
  _prev: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const user = await requireRole(["company"]);
  const parsed = companySetupSchema.safeParse({
    name: formData.get("name"),
    website: formData.get("website"),
    industry: formData.get("industry"),
    companySize: formData.get("companySize"),
    location: formData.get("location"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const values = {
    name: parsed.data.name,
    website: parsed.data.website || null,
    description: parsed.data.description,
    industry: parsed.data.industry,
    company_size: parsed.data.companySize,
    location: parsed.data.location,
  };

  const supabase = await createClient();
  const companyId = await getCompanyIdForUser(user.id);
  if (companyId) {
    const { error } = await supabase.from("companies").update(values).eq("id", companyId);
    if (error) return { error: "Couldn't save your company. Please try again." };
  } else {
    const { error } = await supabase.rpc("create_company_with_owner", {
      company_name: values.name,
      company_website: values.website,
      company_description: values.description,
      company_industry: values.industry,
      company_size: values.company_size,
      company_location: values.location,
    });
    if (error) return { error: "Couldn't create your company. Please try again." };
  }

  revalidatePath("/company", "layout");
  redirect("/company/dashboard?welcome=1");
}

function splitList(value: FormDataEntryValue | null, separator: RegExp): string[] {
  return String(value || "")
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Culture and stack tab: what working at the company is like. */
export async function saveCompanyCultureAction(formData: FormData) {
  const user = await requireRole(["company", "admin"]);
  const path = "/company/profile/culture";
  const parsed = companyCultureSchema.safeParse({
    // One per line or comma-separated; duplicates dropped.
    techStack: Array.from(new Set(splitList(formData.get("techStack"), /[,\n]/))),
    workStyle: formData.get("workStyle") || null,
    perks: String(formData.get("perks") || "").trim() || null,
    hiringProcess: String(formData.get("hiringProcess") || "").trim() || null,
  });
  if (!parsed.success) redirectWithError(path, parsed.error.errors[0].message);

  const companyId = await getCompanyIdForUser(user.id);
  if (!companyId) redirect("/onboarding/company");

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({
      tech_stack: parsed.data.techStack,
      work_style: parsed.data.workStyle,
      perks: parsed.data.perks,
      hiring_process: parsed.data.hiringProcess,
    })
    .eq("id", companyId);
  if (error) redirectWithError(path, "Couldn't save. Please try again.");

  revalidatePath("/company/profile", "layout");
  redirect(`${path}?saved=1`);
}

/** Links tab: where candidates can learn more. */
export async function saveCompanyLinksAction(formData: FormData) {
  const user = await requireRole(["company", "admin"]);
  const path = "/company/profile/links";
  const parsed = companyLinksSchema.safeParse({
    linkedinUrl: formData.get("linkedinUrl"),
    githubUrl: formData.get("githubUrl"),
    careersUrl: formData.get("careersUrl"),
    foundedYear: formData.get("foundedYear"),
  });
  if (!parsed.success) redirectWithError(path, parsed.error.errors[0].message);

  const companyId = await getCompanyIdForUser(user.id);
  if (!companyId) redirect("/onboarding/company");

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({
      linkedin_url: parsed.data.linkedinUrl || null,
      github_url: parsed.data.githubUrl || null,
      careers_url: parsed.data.careersUrl || null,
      founded_year: parsed.data.foundedYear,
    })
    .eq("id", companyId);
  if (error) redirectWithError(path, "Couldn't save. Please try again.");

  revalidatePath("/company/profile", "layout");
  redirect(`${path}?saved=1`);
}
