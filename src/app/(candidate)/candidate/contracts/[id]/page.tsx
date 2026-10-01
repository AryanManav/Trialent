import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, FileText, ListChecks, Package } from "lucide-react";
import { requireCandidate } from "@/lib/auth/guards";
import { getCandidateProfileId } from "@/lib/data/candidate";
import { getContract } from "@/lib/data/freelance";
import { getProjectThread } from "@/lib/data/thread";
import { isContractActive } from "@/lib/freelance";
import { companyProfilePath } from "@/lib/constants";
import { MarkNotificationsRead } from "@/components/notifications/mark-notifications-read";
import { ProjectThread } from "@/components/common/project-thread";
import { SectionCard } from "@/components/common/section-card";
import { OpportunityBadge } from "@/components/projects/opportunity-badge";
import { BriefList, BriefSection } from "@/components/projects/brief";
import { StatusBadge } from "@/components/ui/status-badge";
import { ContractMoney, MilestoneItem } from "@/components/freelance/contract-parts";
import {
  ConfirmPaymentButton,
  LogHoursForm,
  SubmitMilestoneForm,
} from "@/components/freelance/contract-forms";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * The selected freelancer's side of a contract: deliver each milestone (or
 * log hours), see the company's review, and confirm payments as they arrive.
 */
export default async function CandidateContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireCandidate();
  const { id } = await params;
  const candidateId = await getCandidateProfileId(user.id);
  if (!candidateId) notFound();

  const [contract, messages] = await Promise.all([
    getContract(id),
    getProjectThread(id, candidateId, user.id),
  ]);
  if (!contract || contract.freelancer?.candidateId !== candidateId) notFound();

  const active = isContractActive(contract.contractStatus);
  const hourly = contract.terms.pricingModel === "hourly";
  const status = active
    ? { tone: "active" as const, label: "Contract running" }
    : contract.contractStatus === "completed"
      ? { tone: "success" as const, label: "Contract completed" }
      : { tone: "neutral" as const, label: "Contract ended" };

  return (
    <div className="space-y-6">
      <MarkNotificationsRead scopes={[{ projectId: id }]} />
      <Link
        href={active ? "/candidate/trials" : "/candidate/completed"}
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {active ? "Active work" : "Completed work"}
      </Link>

      <header className="rounded-xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center gap-2">
          <OpportunityBadge type="freelance" />
          <StatusBadge tone={status.tone} label={status.label} />
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-ink-900">{contract.title}</h1>
        <Link
          href={companyProfilePath(contract.companyId)}
          className="mt-1 inline-block text-sm text-ink-500 hover:text-ink-900 hover:underline"
        >
          {contract.companyName}
        </Link>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {hourly && active && contract.terms.hourlyRate && (
            <SectionCard
              title="Log hours"
              icon={Clock}
              description={`Up to ${contract.terms.hoursPerWeek} hours a week. ${contract.companyName} approves each week before paying it.`}
            >
              <LogHoursForm
                projectId={contract.projectId}
                hourlyRate={contract.terms.hourlyRate}
                currency={contract.currency}
              />
            </SectionCard>
          )}

          <SectionCard
            title={hourly ? "Logged weeks" : "Milestones"}
            icon={ListChecks}
            count={contract.milestones.length}
          >
            {contract.milestones.length === 0 ? (
              <p className="text-sm text-ink-500">
                {hourly
                  ? "No hours logged yet. Log your first week above."
                  : "This contract has no milestones."}
              </p>
            ) : (
              <ol className="space-y-3">
                {contract.milestones.map((milestone, index) => (
                  <MilestoneItem
                    key={milestone.id}
                    milestone={milestone}
                    currency={contract.currency}
                    index={index}
                  >
                    {active &&
                      milestone.kind === "planned" &&
                      (milestone.status === "planned" ||
                        milestone.status === "changes_requested") && (
                        <SubmitMilestoneForm
                          projectId={contract.projectId}
                          milestoneId={milestone.id}
                          resubmission={milestone.status === "changes_requested"}
                        />
                      )}
                    {milestone.status === "paid" && !milestone.paymentConfirmedAt && (
                      <ConfirmPaymentButton
                        projectId={contract.projectId}
                        milestoneId={milestone.id}
                        amount={formatCurrency(milestone.amount, contract.currency)}
                      />
                    )}
                  </MilestoneItem>
                ))}
              </ol>
            )}
          </SectionCard>

          <SectionCard title="The brief" icon={FileText}>
            <div className="space-y-6">
              <BriefSection title="What needs doing">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                  {contract.problemStatement}
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-500">
                  {contract.context}
                </p>
              </BriefSection>
              <BriefSection title="Requirements" icon={ListChecks}>
                <BriefList items={contract.requirements} />
              </BriefSection>
              <BriefSection title="Deliverables" icon={Package}>
                <BriefList items={contract.deliverables} />
              </BriefSection>
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-6">
          <ContractMoney
            terms={contract.terms}
            totals={contract.totals}
            currency={contract.currency}
            viewer="freelancer"
          />
          <ProjectThread
            projectId={contract.projectId}
            messages={messages}
            viewer="candidate"
            canPost={active}
          />
        </aside>
      </div>
    </div>
  );
}
