"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCandidate, requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getCompanyForUser, getCompanyIdForUser } from "@/lib/data/company";
import { isCompanyReadyToPost } from "@/lib/company";
import {
  contractIdSchema,
  createFreelanceSchema,
  logHoursSchema,
  milestoneIdSchema,
  reviewMilestoneSchema,
  submitMilestoneSchema,
} from "@/lib/validations";
import { DEFAULT_CURRENCY } from "@/lib/constants";
import { parseIndiaDateTime } from "@/lib/utils";
import type { ActionResponse } from "@/lib/types/actions";

const WEEK_MS = 7 * 86_400_000;

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

/** A datetime-local value (India time) as ISO, or the raw text so validation reports it. */
function toIso(value: FormDataEntryValue | null): string {
  const raw = String(value || "");
  return parseIndiaDateTime(raw)?.toISOString() ?? raw;
}

/** The milestone rows of the form, skipping rows left completely empty. */
function milestoneRows(formData: FormData) {
  const titles = formData.getAll("milestoneTitle").map(String);
  const amounts = formData.getAll("milestoneAmount").map(String);
  const dues = formData.getAll("milestoneDue").map(String);
  const descriptions = formData.getAll("milestoneDescription").map(String);
  return titles
    .map((title, i) => ({
      title,
      amount: amounts[i] ?? "",
      dueDate: toIso(dues[i] ?? null),
      description: descriptions[i] ?? "",
    }))
    .filter((row) => row.title.trim() || row.amount.trim() || row.description.trim());
}

/** Maps a database refusal to something the person can act on. */
function failure(error: { code?: string; message: string } | null, fallback: string) {
  if (error?.code === "P0001" || error?.code === "42501") return { error: error.message };
  return { error: fallback };
}

function revalidateContract(projectId: string) {
  revalidatePath(`/company/projects/${projectId}`, "layout");
  revalidatePath(`/candidate/contracts/${projectId}`);
  revalidatePath("/candidate/trials");
}

/**
 * Posts a freelance contract: a fixed price split into milestones, or an
 * hourly rate. The project and its milestone plan are written separately, so
 * a plan that fails to save removes the project again rather than leaving a
 * contract with no milestones.
 */
export async function createFreelanceAction(
  _prev: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const user = await requireRole(["company", "admin"]);

  const validated = createFreelanceSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    description: formData.get("description"),
    problemStatement: formData.get("problemStatement"),
    context: formData.get("context"),
    requirements: toList(formData.get("requirements")),
    deliverables: toList(formData.get("deliverables")),
    maxApplicants: formData.get("maxApplicants"),
    applicationDeadline: toIso(formData.get("applicationDeadline")),
    pricingModel: formData.get("pricingModel"),
    expectedHours: formData.get("expectedHours"),
    milestones: milestoneRows(formData),
    hourlyRate: formData.get("hourlyRate"),
    hoursPerWeek: formData.get("hoursPerWeek"),
    durationWeeks: formData.get("durationWeeks"),
  });
  if (!validated.success) return { error: validated.error.errors[0].message };
  const input = validated.data;

  if (user.role !== "admin" && !isCompanyReadyToPost(await getCompanyForUser(user.id))) {
    redirect("/onboarding/company");
  }
  const companyId = await getCompanyIdForUser(user.id);
  if (!companyId) return { error: "Create your company profile before posting" };

  const applyBy = new Date(input.applicationDeadline).getTime();
  const fixed = input.pricingModel === "fixed";
  const total = fixed
    ? input.milestones.reduce((sum, milestone) => sum + milestone.amount, 0)
    : input.hourlyRate * input.hoursPerWeek * input.durationWeeks;
  // Fixed price ends with the last milestone; hourly runs its length from a
  // week after applications close.
  const endsAt = fixed
    ? Math.max(
        ...input.milestones.map((milestone) => new Date(milestone.dueDate).getTime())
      )
    : applyBy + WEEK_MS + input.durationWeeks * WEEK_MS;

  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      company_id: companyId,
      slug: toSlug(input.title),
      title: input.title,
      description: input.description,
      problem_statement: input.problemStatement,
      context: input.context,
      requirements: input.requirements,
      deliverables: input.deliverables,
      acceptance_criteria: [],
      evaluation_criteria: [],
      work_mode: "local",
      expected_hours: fixed
        ? input.expectedHours
        : input.hoursPerWeek * input.durationWeeks,
      payment_amount: total,
      currency: DEFAULT_CURRENCY,
      application_deadline: input.applicationDeadline,
      project_deadline: new Date(endsAt).toISOString(),
      max_applicants: input.maxApplicants ?? null,
      category: input.category,
      purpose: "build",
      openings: 1,
      opportunity_type: "freelance",
      pricing_model: input.pricingModel,
      hourly_rate: fixed ? null : input.hourlyRate,
      hours_per_week: fixed ? null : input.hoursPerWeek,
      duration_weeks: fixed ? null : input.durationWeeks,
      status: "applications_open",
    })
    .select("id")
    .single();
  if (error || !project)
    return failure(error, "Couldn't post the contract. Please try again.");

  if (fixed) {
    const { error: planError } = await supabase.from("freelance_milestones").insert(
      input.milestones.map((milestone, index) => ({
        project_id: project.id,
        position: index + 1,
        title: milestone.title,
        description: milestone.description || null,
        amount: milestone.amount,
        due_date: milestone.dueDate,
      }))
    );
    if (planError) {
      await supabase.rpc("delete_project", { target_project_id: project.id });
      return failure(planError, "Couldn't save the milestones. Please try again.");
    }
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
  redirect("/company/projects?created=freelance");
}

/** Freelancer delivers a milestone (or re-delivers after changes were asked for). */
export async function submitMilestoneAction(
  _prev: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  await requireCandidate();
  const validated = submitMilestoneSchema.safeParse({
    milestoneId: formData.get("milestoneId"),
    workUrl: formData.get("workUrl") ?? "",
    note: formData.get("note"),
  });
  if (!validated.success) return { error: validated.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_freelance_milestone", {
    target_milestone_id: validated.data.milestoneId,
    work_link: validated.data.workUrl ?? "",
    note: validated.data.note,
  });
  if (error) return failure(error, "Couldn't deliver the milestone. Please try again.");

  revalidateContract(String(formData.get("projectId") || ""));
  return { success: true };
}

/** Freelancer logs a week of hourly work, which the company then approves. */
export async function logHoursAction(
  _prev: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  await requireCandidate();
  const validated = logHoursSchema.safeParse({
    projectId: formData.get("projectId"),
    weekStart: formData.get("weekStart"),
    hours: formData.get("hours"),
    note: formData.get("note"),
    workUrl: formData.get("workUrl") ?? "",
  });
  if (!validated.success) return { error: validated.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("log_freelance_hours", {
    target_project_id: validated.data.projectId,
    week_start: validated.data.weekStart,
    worked: validated.data.hours,
    note: validated.data.note,
    work_link: validated.data.workUrl ?? "",
  });
  if (error) return failure(error, "Couldn't log the hours. Please try again.");

  revalidateContract(validated.data.projectId);
  return { success: true };
}

/** Company approves delivered work, or asks for changes with a reason. */
export async function reviewMilestoneAction(
  _prev: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  await requireRole(["company", "admin"]);
  const validated = reviewMilestoneSchema.safeParse({
    milestoneId: formData.get("milestoneId"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? "",
  });
  if (!validated.success) return { error: validated.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_freelance_milestone", {
    target_milestone_id: validated.data.milestoneId,
    decision: validated.data.decision,
    note: validated.data.note,
  });
  if (error) return failure(error, "Couldn't record the review. Please try again.");

  revalidateContract(String(formData.get("projectId") || ""));
  return { success: true };
}

/** Company records that it paid an approved milestone. */
export async function markMilestonePaidAction(
  _prev: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  await requireRole(["company", "admin"]);
  const validated = milestoneIdSchema.safeParse({
    milestoneId: formData.get("milestoneId"),
  });
  if (!validated.success) return { error: validated.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_freelance_milestone_paid", {
    target_milestone_id: validated.data.milestoneId,
  });
  if (error) return failure(error, "Couldn't mark it paid. Please try again.");

  revalidateContract(String(formData.get("projectId") || ""));
  return { success: true };
}

/** Freelancer confirms the company's payment arrived. */
export async function confirmPaymentAction(
  _prev: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  await requireCandidate();
  const validated = milestoneIdSchema.safeParse({
    milestoneId: formData.get("milestoneId"),
  });
  if (!validated.success) return { error: validated.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_freelance_payment", {
    target_milestone_id: validated.data.milestoneId,
  });
  if (error) return failure(error, "Couldn't confirm the payment. Please try again.");

  revalidateContract(String(formData.get("projectId") || ""));
  return { success: true };
}

/** Company ends the contract; undelivered milestones are cancelled. */
export async function completeContractAction(
  _prev: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  await requireRole(["company", "admin"]);
  const validated = contractIdSchema.safeParse({ projectId: formData.get("projectId") });
  if (!validated.success) return { error: validated.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_freelance_contract", {
    target_project_id: validated.data.projectId,
  });
  if (error) return failure(error, "Couldn't end the contract. Please try again.");

  revalidateContract(validated.data.projectId);
  revalidatePath("/company/projects");
  return { success: true };
}
