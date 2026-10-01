import type { ContractTotals, FreelanceTerms, MilestoneView } from "@/lib/types/domain";
import type {
  MilestoneStatus,
  OpportunityType,
  PricingModel,
  SelectionWorkStatus,
} from "@/lib/types/database.types";
import { formatCurrency } from "@/lib/utils";

/** The pricing columns every project row carries (null outside freelance). */
export interface RawFreelanceColumns {
  opportunity_type?: OpportunityType | null;
  pricing_model?: PricingModel | null;
  hourly_rate?: number | null;
  hours_per_week?: number | null;
  duration_weeks?: number | null;
}

export const FREELANCE_COLUMNS =
  "pricing_model, hourly_rate, hours_per_week, duration_weeks";

export function toFreelanceTerms(row: RawFreelanceColumns): FreelanceTerms | null {
  if (row.opportunity_type !== "freelance" || !row.pricing_model) return null;
  return {
    pricingModel: row.pricing_model,
    hourlyRate: row.hourly_rate ?? null,
    hoursPerWeek: row.hours_per_week ?? null,
    durationWeeks: row.duration_weeks ?? null,
  };
}

/** "₹800/hr · 10 h a week · 8 weeks", or "Fixed price · ₹24,000". */
export function describeTerms(
  terms: FreelanceTerms,
  total: number,
  currency: string
): string {
  if (terms.pricingModel === "hourly" && terms.hourlyRate) {
    return [
      `${formatCurrency(terms.hourlyRate, currency)}/hr`,
      terms.hoursPerWeek ? `${terms.hoursPerWeek} h a week` : null,
      terms.durationWeeks
        ? `${terms.durationWeeks} week${terms.durationWeeks === 1 ? "" : "s"}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  return `Fixed price · ${formatCurrency(total, currency)}`;
}

/** Statuses whose amount the company has agreed to pay. */
const OWED: readonly MilestoneStatus[] = ["approved", "paid"];

/**
 * Where the money on a contract stands. Cancelled milestones count for
 * nothing; hourly logs count from the moment they're submitted.
 */
export function contractTotals(
  milestones: Pick<MilestoneView, "amount" | "status" | "hours" | "paymentConfirmedAt">[],
  agreed: number
): ContractTotals {
  const sum = (filter: (m: (typeof milestones)[number]) => boolean) =>
    milestones.filter(filter).reduce((total, m) => total + m.amount, 0);
  return {
    agreed,
    inReview: sum((m) => m.status === "submitted"),
    due: sum((m) => m.status === "approved"),
    paid: sum((m) => m.status === "paid"),
    confirmed: sum((m) => m.status === "paid" && m.paymentConfirmedAt !== null),
    hoursLogged: milestones
      .filter((m) => m.status !== "cancelled")
      .reduce((total, m) => total + (m.hours ?? 0), 0),
  };
}

/** True when at least one milestone has been approved (or paid). */
export function hasApprovedWork(milestones: Pick<MilestoneView, "status">[]): boolean {
  return milestones.some((m) => OWED.includes(m.status));
}

const ENDED: readonly SelectionWorkStatus[] = ["completed", "cancelled", "not_accepted"];

/** A selected freelancer whose contract hasn't been ended. */
export function isContractActive(status: SelectionWorkStatus | null): boolean {
  return status !== null && !ENDED.includes(status);
}

/**
 * Whether the company can end the contract now: it must be running, with no
 * delivered work still waiting for its review (the database checks the same).
 */
export function canCompleteContract(
  status: SelectionWorkStatus | null,
  milestones: Pick<MilestoneView, "status">[]
): boolean {
  return isContractActive(status) && !milestones.some((m) => m.status === "submitted");
}

/** The Monday on or before a date, as YYYY-MM-DD — the default week to log. */
export function weekStartOf(date: Date): string {
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const offset = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - offset);
  return day.toISOString().slice(0, 10);
}
