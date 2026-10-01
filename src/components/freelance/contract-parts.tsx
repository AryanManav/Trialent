import type { ReactNode } from "react";
import { CalendarClock, Clock, ExternalLink } from "lucide-react";
import { MILESTONE_STATUS_DISPLAY } from "@/lib/constants";
import { describeTerms } from "@/lib/freelance";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type {
  ContractTotals,
  FreelanceTerms,
  MilestonePlanItem,
  MilestoneView,
} from "@/lib/types/domain";

/** The contract's price and where its money stands. */
export function ContractMoney({
  terms,
  totals,
  currency,
  viewer,
}: {
  terms: FreelanceTerms;
  totals: ContractTotals;
  currency: string;
  viewer: "company" | "freelancer";
}) {
  const hourly = terms.pricingModel === "hourly";
  const rows: { label: string; value: string; strong?: boolean }[] = [
    {
      label: hourly ? "Estimated total" : "Contract total",
      value: formatCurrency(totals.agreed, currency),
    },
    { label: "Waiting for review", value: formatCurrency(totals.inReview, currency) },
    {
      label: viewer === "company" ? "Approved — you owe" : "Approved — payment due",
      value: formatCurrency(totals.due, currency),
      strong: totals.due > 0,
    },
    { label: "Marked paid", value: formatCurrency(totals.paid, currency) },
    { label: "Confirmed received", value: formatCurrency(totals.confirmed, currency) },
  ];
  if (hourly) {
    rows.splice(1, 0, { label: "Hours logged", value: `${totals.hoursLogged} h` });
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink-900">Terms</h2>
      <p className="mt-1 text-sm text-ink-600">
        {describeTerms(terms, totals.agreed, currency)}
      </p>
      <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-500">{row.label}</dt>
            <dd
              className={cn(
                "tabular",
                row.strong ? "font-semibold text-accent-700" : "font-medium text-ink-900"
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-ink-500">
        {viewer === "company"
          ? "Pay the freelancer directly (bank transfer or UPI), then mark the milestone paid. Trialent never holds the money."
          : "The company pays you directly. Confirm each payment once it arrives, so it shows as paid on your record."}
      </p>
    </section>
  );
}

/** One milestone or hourly log, with whatever actions the viewer has. */
export function MilestoneItem({
  milestone,
  currency,
  index,
  children,
}: {
  milestone: MilestoneView;
  currency: string;
  index: number;
  children?: ReactNode;
}) {
  const status = MILESTONE_STATUS_DISPLAY[milestone.status];
  return (
    <li
      className={cn(
        "space-y-3 rounded-lg border p-4",
        milestone.status === "cancelled"
          ? "border-dashed border-line opacity-70"
          : "border-line"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-2xs font-semibold uppercase tracking-wider text-ink-500">
            {milestone.kind === "hours" ? "Hours" : `Milestone ${index + 1}`}
          </p>
          <h3 className="text-sm font-semibold text-ink-900">{milestone.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="tabular text-sm font-semibold text-emerald-700">
            {formatCurrency(milestone.amount, currency)}
          </span>
          <StatusBadge size="sm" tone={status.tone} label={status.label} />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
        {milestone.dueDate && (
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            Due {formatDate(milestone.dueDate)}
          </span>
        )}
        {milestone.hours !== null && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {milestone.hours} h
          </span>
        )}
        {milestone.submittedAt && (
          <span>Delivered {formatDate(milestone.submittedAt)}</span>
        )}
        {milestone.paidAt && <span>Paid {formatDate(milestone.paidAt)}</span>}
        {milestone.paymentConfirmedAt && (
          <span>Receipt confirmed {formatDate(milestone.paymentConfirmedAt)}</span>
        )}
      </div>

      {milestone.description && (
        <p className="whitespace-pre-wrap text-sm text-ink-600">
          {milestone.description}
        </p>
      )}

      {(milestone.workNote || milestone.workUrl) && (
        <div className="space-y-1.5 rounded-md bg-ink-50 px-3 py-2.5">
          <p className="text-xs font-medium text-ink-600">Delivered</p>
          {milestone.workUrl && (
            <a
              href={milestone.workUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 break-all font-mono text-xs text-brand-700 hover:underline"
            >
              {milestone.workUrl}
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
            </a>
          )}
          {milestone.workNote && (
            <p className="whitespace-pre-wrap text-sm text-ink-800">
              {milestone.workNote}
            </p>
          )}
        </div>
      )}

      {milestone.reviewNote && (
        <div className="rounded-md border border-line px-3 py-2.5">
          <p className="text-xs font-medium text-ink-600">
            Company&apos;s note
            {milestone.reviewedAt && ` · ${formatDate(milestone.reviewedAt)}`}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink-800">
            {milestone.reviewNote}
          </p>
        </div>
      )}

      {children}
    </li>
  );
}

/** A fixed-price brief's milestones, as applicants see them. */
export function MilestonePlan({
  plan,
  currency,
}: {
  plan: MilestonePlanItem[];
  currency: string;
}) {
  return (
    <ol className="space-y-2">
      {plan.map((item, index) => (
        <li key={item.position} className="rounded-lg border border-line p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-ink-900">
              <span className="text-ink-400">{index + 1}.</span> {item.title}
            </p>
            <span className="tabular text-sm font-semibold text-emerald-700">
              {formatCurrency(item.amount, currency)}
            </span>
          </div>
          {item.dueDate && (
            <p className="mt-0.5 text-xs text-ink-500">Due {formatDate(item.dueDate)}</p>
          )}
          {item.description && (
            <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink-600">
              {item.description}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
