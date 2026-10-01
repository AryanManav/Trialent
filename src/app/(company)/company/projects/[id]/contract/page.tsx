import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ListChecks, Users } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getCompanyIdForUser, getProjectHeader } from "@/lib/data/company";
import { getContract } from "@/lib/data/freelance";
import { getProjectThread } from "@/lib/data/thread";
import { canCompleteContract, hasApprovedWork, isContractActive } from "@/lib/freelance";
import { MarkNotificationsRead } from "@/components/notifications/mark-notifications-read";
import { PageHeader } from "@/components/common/page-header";
import { ProjectThread } from "@/components/common/project-thread";
import { SectionCard } from "@/components/common/section-card";
import { OpportunityBadge } from "@/components/projects/opportunity-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { ContractMoney, MilestoneItem } from "@/components/freelance/contract-parts";
import {
  CompleteContractForm,
  MarkPaidButton,
  ReviewMilestoneForm,
} from "@/components/freelance/contract-forms";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * The company's side of a freelance contract: review each delivery, record
 * payments made directly to the freelancer, and end the contract.
 */
export default async function CompanyContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["company", "admin"]);
  const { id } = await params;

  const project = await getProjectHeader(id);
  if (!project) notFound();
  if (user.role !== "admin") {
    const companyId = await getCompanyIdForUser(user.id);
    if (companyId !== project.companyId) notFound();
  }

  const contract = await getContract(id);
  if (!contract) notFound();

  const projectPath = `/company/projects/${id}`;
  const freelancer = contract.freelancer;
  const messages = freelancer
    ? await getProjectThread(id, freelancer.candidateId, user.id)
    : [];
  const active = isContractActive(contract.contractStatus);
  const waiting = contract.milestones.filter((m) => m.status === "submitted").length;
  const status = !freelancer
    ? { tone: "info" as const, label: "Choosing a freelancer" }
    : active
      ? { tone: "active" as const, label: "Contract running" }
      : contract.contractStatus === "completed"
        ? { tone: "success" as const, label: "Completed" }
        : { tone: "neutral" as const, label: "Ended" };

  return (
    <div className="space-y-6">
      <MarkNotificationsRead scopes={[{ link: `${projectPath}/contract` }]} />
      <PageHeader
        eyebrow={
          <Link
            href="/company/projects?type=freelance"
            className="inline-flex items-center gap-1 hover:text-ink-900"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            Freelance
          </Link>
        }
        title={contract.title}
        description={
          freelancer
            ? `${freelancer.name} is your freelancer. Review each delivery, pay them directly, and mark it paid here.`
            : "Select a freelancer from your applicants to start the contract."
        }
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge tone={status.tone} label={status.label} />
            <OpportunityBadge type="freelance" />
          </div>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {!freelancer && (
            <SectionCard title="Applicants" icon={Users}>
              <p className="text-sm text-ink-600">
                Nobody is selected yet. Review the applications and select one freelancer
                — the contract starts as soon as you do.
              </p>
              <Link href={projectPath} className={`${buttonVariants()} mt-4`}>
                Review applicants
              </Link>
            </SectionCard>
          )}

          <SectionCard
            title={
              contract.terms.pricingModel === "hourly" ? "Logged weeks" : "Milestones"
            }
            icon={ListChecks}
            count={contract.milestones.length}
            description={
              waiting > 0
                ? `${waiting} deliver${waiting === 1 ? "y is" : "ies are"} waiting for your review.`
                : undefined
            }
          >
            {contract.milestones.length === 0 ? (
              <p className="text-sm text-ink-500">
                {contract.terms.pricingModel === "hourly"
                  ? "No hours logged yet. Each week the freelancer logs appears here for your approval."
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
                    {milestone.status === "submitted" && (
                      <ReviewMilestoneForm
                        projectId={contract.projectId}
                        milestoneId={milestone.id}
                      />
                    )}
                    {milestone.status === "approved" && (
                      <MarkPaidButton
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
        </div>

        <aside className="space-y-6">
          <ContractMoney
            terms={contract.terms}
            totals={contract.totals}
            currency={contract.currency}
            viewer="company"
          />

          {freelancer && active && (
            <section className="space-y-3 rounded-xl border border-line bg-surface p-5">
              <h2 className="text-sm font-semibold text-ink-900">End the contract</h2>
              <p className="text-sm text-ink-600">
                {canCompleteContract(contract.contractStatus, contract.milestones)
                  ? "Milestones not yet delivered are cancelled. With approved work, the contract counts as completed on the freelancer's record."
                  : "Review the work waiting for you before ending the contract."}
              </p>
              {canCompleteContract(contract.contractStatus, contract.milestones) && (
                <CompleteContractForm
                  projectId={contract.projectId}
                  hasApprovedWork={hasApprovedWork(contract.milestones)}
                />
              )}
            </section>
          )}

          {freelancer && (
            <ProjectThread
              projectId={contract.projectId}
              candidateId={freelancer.candidateId}
              messages={messages}
              viewer="company"
              canPost={active}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
