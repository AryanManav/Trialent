import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/data/utils";
import { DEFAULT_CURRENCY } from "@/lib/constants";
import {
  FREELANCE_COLUMNS,
  contractTotals,
  toFreelanceTerms,
  type RawFreelanceColumns,
} from "@/lib/freelance";
import type { ContractView, MilestonePlanItem, MilestoneView } from "@/lib/types/domain";
import type {
  MilestoneKind,
  MilestoneStatus,
  ProjectStatus,
  SelectionWorkStatus,
} from "@/lib/types/database.types";

interface RawContractProject extends RawFreelanceColumns {
  id: string;
  slug: string;
  title: string;
  description: string;
  problem_statement: string;
  context: string;
  requirements: string[] | null;
  deliverables: string[] | null;
  company_id: string;
  status: ProjectStatus;
  currency: string | null;
  payment_amount: number;
  project_deadline: string;
  companies: { name: string | null } | { name: string | null }[] | null;
}

interface RawSelection {
  candidate_id: string;
  status: SelectionWorkStatus;
  candidate_profiles:
    | { users: { full_name: string } | { full_name: string }[] | null }
    | { users: { full_name: string } | { full_name: string }[] | null }[]
    | null;
}

interface RawMilestone {
  id: string;
  position: number;
  kind: MilestoneKind;
  title: string;
  description: string | null;
  amount: number;
  hours: number | string | null;
  period_start: string | null;
  due_date: string | null;
  status: MilestoneStatus;
  work_url: string | null;
  work_note: string | null;
  review_note: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  paid_at: string | null;
  payment_confirmed_at: string | null;
}

const CONTRACT_COLUMNS =
  "id, slug, title, description, problem_statement, context, requirements, deliverables, company_id, status, currency, payment_amount, project_deadline, opportunity_type, companies(name), " +
  FREELANCE_COLUMNS;

const MILESTONE_COLUMNS =
  "id, position, kind, title, description, amount, hours, period_start, due_date, status, work_url, work_note, review_note, submitted_at, reviewed_at, paid_at, payment_confirmed_at";

function toMilestone(row: RawMilestone): MilestoneView {
  return {
    id: row.id,
    position: row.position,
    kind: row.kind,
    title: row.title,
    description: row.description,
    amount: row.amount,
    // NUMERIC arrives as a string.
    hours: row.hours === null ? null : Number(row.hours),
    periodStart: row.period_start,
    dueDate: row.due_date,
    status: row.status,
    workUrl: row.work_url,
    workNote: row.work_note,
    reviewNote: row.review_note,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    paidAt: row.paid_at,
    paymentConfirmedAt: row.payment_confirmed_at,
  };
}

/**
 * One freelance contract with its milestones, for the company or the selected
 * freelancer. RLS decides who gets rows; null when the caller can't see it or
 * it isn't a freelance contract.
 */
export const getContract = cache(
  async (projectId: string): Promise<ContractView | null> => {
    const supabase = await createClient();
    const [projectResult, selectionResult, milestoneResult] = await Promise.all([
      supabase
        .from("projects")
        .select(CONTRACT_COLUMNS)
        .eq("id", projectId)
        .maybeSingle(),
      supabase
        .from("project_selections")
        .select("candidate_id, status, candidate_profiles(users(full_name))")
        .eq("project_id", projectId)
        .order("selected_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("freelance_milestones")
        .select(MILESTONE_COLUMNS)
        .eq("project_id", projectId)
        .order("position"),
    ]);

    const project = projectResult.data as unknown as RawContractProject | null;
    const terms = project ? toFreelanceTerms(project) : null;
    if (!project || !terms) return null;

    const selection = selectionResult.data as unknown as RawSelection | null;
    const milestones = ((milestoneResult.data ?? []) as unknown as RawMilestone[]).map(
      toMilestone
    );

    return {
      projectId: project.id,
      slug: project.slug,
      title: project.title,
      description: project.description,
      problemStatement: project.problem_statement,
      context: project.context,
      requirements: project.requirements ?? [],
      deliverables: project.deliverables ?? [],
      companyId: project.company_id,
      companyName: one(project.companies)?.name ?? "The company",
      projectStatus: project.status,
      currency: project.currency || DEFAULT_CURRENCY,
      paymentAmount: project.payment_amount,
      projectDeadline: project.project_deadline,
      terms,
      freelancer: selection
        ? {
            candidateId: selection.candidate_id,
            name:
              one(one(selection.candidate_profiles)?.users)?.full_name ?? "Freelancer",
          }
        : null,
      contractStatus: selection?.status ?? null,
      milestones,
      totals: contractTotals(milestones, project.payment_amount),
    };
  }
);

/** A fixed-price brief's milestone plan, readable by anyone who can see the brief. */
export async function getMilestonePlan(projectId: string): Promise<MilestonePlanItem[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("freelance_milestone_plan", {
    target_project_id: projectId,
  });
  return (data ?? []).map((row) => ({
    position: row.position,
    title: row.title,
    description: row.description,
    amount: row.amount,
    dueDate: row.due_date,
  }));
}
